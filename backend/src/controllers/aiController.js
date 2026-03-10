const { AIInsight, EventLog, Device, Company } = require('../models');
const { Op } = require('sequelize');
const logger = require('../utils/logger');
const { getModel } = require('../config/gemini');

exports.analyzeLogs = async (req, res) => {
    try {
        const { device_id, hours = 24, log_levels = ['critical', 'error'] } = req.body;
        const companyId = req.companyId;

        const device = await Device.findOne({
            where: {
                id: device_id,
                company_id: companyId
            }
        });

        if (!device) {
            return res.status(404).json({
                success: false,
                message: 'Device not found'
            });
        }

        const startDate = new Date(Date.now() - hours * 60 * 60 * 1000);
        const logs = await EventLog.findAll({
            where: {
                device_id: device_id,
                level: {
                    [Op.in]: log_levels
                },
                time_generated: {
                    [Op.gte]: startDate
                }
            },
            order: [['time_generated', 'DESC']],
            limit: 100
        });

        if (logs.length === 0) {
            return res.json({
                success: true,
                message: 'No critical logs found for analysis',
                data: null
            });
        }

        // Prepare log summary for AI
        const logSummary = logs.map(log => ({
            time: log.time_generated,
            level: log.level,
            source: log.source,
            event_id: log.event_id,
            message: log.message
        }));

        // Call Gemini API
        const model = getModel('gemini-pro');
        const prompt = `Analyze these Windows event logs and provide:
1. Summary of issues
2. Root cause analysis
3. Recommended solutions
4. Priority actions

Logs:
${JSON.stringify(logSummary, null, 2)}

Provide response in JSON format with: summary, root_cause, recommendations (array), priority_actions (array), confidence_score (0-100)`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const analysisText = response.text();

        // Parse AI response
        let analysis;
        try {
            const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                analysis = JSON.parse(jsonMatch[0]);
            } else {
                analysis = {
                    summary: analysisText,
                    root_cause: 'See summary',
                    recommendations: [],
                    priority_actions: [],
                    confidence_score: 75
                };
            }
        } catch (e) {
            analysis = {
                summary: analysisText,
                root_cause: 'See summary',
                recommendations: [],
                priority_actions: [],
                confidence_score: 75
            };
        }

        // Save insight
        const insight = await AIInsight.create({
            company_id: companyId,
            device_id: device_id,
            insight_type: 'log_analysis',
            title: `Log Analysis - ${device.hostname}`,
            summary: analysis.summary || analysisText,
            analysis: JSON.stringify(analysis),
            recommendations: analysis.recommendations || [],
            confidence_score: analysis.confidence_score || 75,
            related_log_ids: logs.map(l => l.id),
            status: 'new'
        });

        logger.info(`AI analysis completed for device: ${device_id}`);

        res.json({
            success: true,
            message: 'Log analysis completed',
            data: {
                insight: insight,
                analysis: analysis
            }
        });
    } catch (error) {
        logger.error('AI analysis error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

exports.getInsights = async (req, res) => {
    try {
        const { device_id, insight_type, status, page = 1, limit = 20 } = req.query;
        const offset = (page - 1) * limit;
        const companyId = req.companyId;

        const where = { company_id: companyId };
        if (device_id) {
            where.device_id = device_id;
        }
        if (insight_type) {
            where.insight_type = insight_type;
        }
        if (status) {
            where.status = status;
        }

        const insights = await AIInsight.findAndCountAll({
            where,
            include: [{
                model: Device,
                as: 'Device',
                attributes: ['id', 'hostname', 'username']
            }],
            limit: parseInt(limit),
            offset: parseInt(offset),
            order: [['created_at', 'DESC']]
        });

        res.json({
            success: true,
            data: insights.rows,
            pagination: {
                total: insights.count,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(insights.count / limit)
            }
        });
    } catch (error) {
        logger.error('Get insights error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

