const { getModel, isConfigured } = require('../config/gemini');
const logger = require('../utils/logger');

class GeminiService {
    async analyzeLogs(logs) {
        if (!isConfigured()) {
            throw new Error('Gemini API key not configured');
        }

        try {
            const model = getModel('gemini-pro');
            const prompt = this.buildLogAnalysisPrompt(logs);
            
            const result = await model.generateContent(prompt);
            const response = await result.response;
            return this.parseResponse(response.text());
        } catch (error) {
            logger.error('Gemini API error:', error);
            throw error;
        }
    }

    buildLogAnalysisPrompt(logs) {
        const logSummary = logs.map(log => ({
            time: log.time_generated,
            level: log.level,
            source: log.source,
            event_id: log.event_id,
            message: log.message
        }));

        return `Analyze these Windows event logs and provide:
1. Summary of issues
2. Root cause analysis
3. Recommended solutions
4. Priority actions

Logs:
${JSON.stringify(logSummary, null, 2)}

Provide response in JSON format with: summary, root_cause, recommendations (array), priority_actions (array), confidence_score (0-100)`;
    }

    parseResponse(text) {
        try {
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
        } catch (e) {
            logger.error('Failed to parse Gemini response:', e);
        }

        return {
            summary: text,
            root_cause: 'See summary',
            recommendations: [],
            priority_actions: [],
            confidence_score: 75
        };
    }
}

module.exports = new GeminiService();

