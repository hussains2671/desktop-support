const { Device, PerformanceMetric, HardwareInventory, SoftwareInventory, Alert, EventLog, Agent } = require('../models');
const { Op } = require('sequelize');
const logger = require('../utils/logger');

// Device Reports
exports.getDeviceReport = async (req, res) => {
    try {
        const { start_date, end_date, device_id, status } = req.query;
        const companyId = req.companyId || req.user?.company_id;

        if (!companyId) {
            return res.status(400).json({
                success: false,
                message: 'Company ID required'
            });
        }

        const where = { company_id: companyId };
        if (device_id) {
            where.id = parseInt(device_id);
        }
        if (status) {
            where.status = status;
        }

        const devices = await Device.findAll({
            where,
            include: [{
                model: Agent,
                as: 'Agent',
                attributes: ['id', 'status', 'last_heartbeat', 'agent_version'],
                required: false
            }],
            order: [['last_seen', 'DESC']]
        });

        // Calculate statistics
        const total = devices.length;
        const online = devices.filter(d => d.status === 'online').length;
        const offline = devices.filter(d => d.status === 'offline').length;
        const warning = devices.filter(d => d.status === 'warning').length;
        const error = devices.filter(d => d.status === 'error').length;

        // OS Distribution
        const osDistribution = {};
        devices.forEach(device => {
            const os = device.os_name || 'Unknown';
            osDistribution[os] = (osDistribution[os] || 0) + 1;
        });

        // Status over time (if date range provided)
        let statusHistory = [];
        if (start_date || end_date) {
            // This would require historical data tracking
            // For now, return current status
            statusHistory = [{
                date: new Date().toISOString().split('T')[0],
                online,
                offline,
                warning,
                error
            }];
        }

        res.json({
            success: true,
            data: {
                summary: {
                    total,
                    online,
                    offline,
                    warning,
                    error
                },
                os_distribution: osDistribution,
                devices: devices.map(d => {
                    const deviceData = d.toJSON();
                    return {
                        id: deviceData.id,
                        hostname: deviceData.hostname,
                        username: deviceData.username,
                        os_name: deviceData.os_name,
                        os_version: deviceData.os_version,
                        status: deviceData.status,
                        last_seen: deviceData.last_seen,
                        agent_status: deviceData.Agent?.status || 'N/A',
                        agent_version: deviceData.Agent?.agent_version || 'N/A'
                    };
                }),
                status_history: statusHistory
            }
        });
    } catch (error) {
        logger.error('Get device report error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Performance Reports
exports.getPerformanceReport = async (req, res) => {
    try {
        const { device_id, start_date, end_date, hours = 24 } = req.query;
        const companyId = req.companyId || req.user?.company_id;

        if (!companyId) {
            return res.status(400).json({
                success: false,
                message: 'Company ID required'
            });
        }

        // Get devices for company
        const devices = await Device.findAll({
            where: { company_id: companyId },
            attributes: ['id']
        });
        const deviceIds = devices.map(d => d.id);

        if (deviceIds.length === 0) {
            return res.json({
                success: true,
                data: {
                    summary: {
                        avg_cpu: 0,
                        avg_memory: 0,
                        avg_disk: 0,
                        total_devices: 0
                    },
                    metrics: [],
                    trends: []
                }
            });
        }

        // Build date range
        let dateFilter = {};
        if (start_date && end_date) {
            dateFilter = {
                recorded_at: {
                    [Op.between]: [new Date(start_date), new Date(end_date)]
                }
            };
        } else {
            const startDate = new Date(Date.now() - hours * 60 * 60 * 1000);
            dateFilter = {
                recorded_at: {
                    [Op.gte]: startDate
                }
            };
        }

        const where = {
            device_id: device_id ? parseInt(device_id) : { [Op.in]: deviceIds },
            ...dateFilter
        };

        const metrics = await PerformanceMetric.findAll({
            where,
            include: [{
                model: Device,
                as: 'Device',
                attributes: ['id', 'hostname'],
                required: false
            }],
            order: [['recorded_at', 'DESC']],
            limit: 1000
        });

        // Calculate averages
        const validMetrics = metrics.filter(m => m.cpu_usage !== null && m.memory_usage !== null);
        const avgCpu = validMetrics.length > 0
            ? validMetrics.reduce((sum, m) => sum + parseFloat(m.cpu_usage || 0), 0) / validMetrics.length
            : 0;
        const avgMemory = validMetrics.length > 0
            ? validMetrics.reduce((sum, m) => sum + parseFloat(m.memory_usage || 0), 0) / validMetrics.length
            : 0;
        const avgDisk = validMetrics.length > 0
            ? validMetrics.reduce((sum, m) => sum + parseFloat(m.disk_usage_c || 0), 0) / validMetrics.length
            : 0;

        // Group by device for summary
        const deviceSummary = {};
        metrics.forEach(metric => {
            const deviceId = metric.device_id;
            if (!deviceSummary[deviceId]) {
                deviceSummary[deviceId] = {
                    device_id: deviceId,
                    device_name: metric.Device?.hostname || 'Unknown',
                    metrics_count: 0,
                    avg_cpu: 0,
                    avg_memory: 0,
                    avg_disk: 0,
                    max_cpu: 0,
                    max_memory: 0
                };
            }
            deviceSummary[deviceId].metrics_count++;
            if (metric.cpu_usage) {
                const cpu = parseFloat(metric.cpu_usage);
                deviceSummary[deviceId].avg_cpu += cpu;
                if (cpu > deviceSummary[deviceId].max_cpu) {
                    deviceSummary[deviceId].max_cpu = cpu;
                }
            }
            if (metric.memory_usage) {
                const mem = parseFloat(metric.memory_usage);
                deviceSummary[deviceId].avg_memory += mem;
                if (mem > deviceSummary[deviceId].max_memory) {
                    deviceSummary[deviceId].max_memory = mem;
                }
            }
            if (metric.disk_usage_c) {
                deviceSummary[deviceId].avg_disk += parseFloat(metric.disk_usage_c);
            }
        });

        // Calculate averages for each device
        Object.keys(deviceSummary).forEach(deviceId => {
            const count = deviceSummary[deviceId].metrics_count;
            deviceSummary[deviceId].avg_cpu = count > 0 ? deviceSummary[deviceId].avg_cpu / count : 0;
            deviceSummary[deviceId].avg_memory = count > 0 ? deviceSummary[deviceId].avg_memory / count : 0;
            deviceSummary[deviceId].avg_disk = count > 0 ? deviceSummary[deviceId].avg_disk / count : 0;
        });

        res.json({
            success: true,
            data: {
                summary: {
                    avg_cpu: Math.round(avgCpu * 100) / 100,
                    avg_memory: Math.round(avgMemory * 100) / 100,
                    avg_disk: Math.round(avgDisk * 100) / 100,
                    total_devices: deviceIds.length,
                    metrics_count: metrics.length
                },
                device_summary: Object.values(deviceSummary),
                metrics: metrics.slice(0, 100).map(m => ({
                    device_id: m.device_id,
                    device_name: m.Device?.hostname || 'Unknown',
                    cpu_usage: m.cpu_usage,
                    memory_usage: m.memory_usage,
                    disk_usage: m.disk_usage_c,
                    recorded_at: m.recorded_at
                }))
            }
        });
    } catch (error) {
        logger.error('Get performance report error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Inventory Reports
exports.getInventoryReport = async (req, res) => {
    try {
        const { device_id, component_type, manufacturer } = req.query;
        const companyId = req.companyId || req.user?.company_id;

        if (!companyId) {
            return res.status(400).json({
                success: false,
                message: 'Company ID required'
            });
        }

        // Get devices for company
        const devices = await Device.findAll({
            where: { company_id: companyId },
            attributes: ['id']
        });
        const deviceIds = devices.map(d => d.id);

        if (deviceIds.length === 0) {
            return res.json({
                success: true,
                data: {
                    summary: {
                        total_hardware: 0,
                        total_software: 0,
                        unique_software: 0
                    },
                    hardware: [],
                    software: []
                }
            });
        }

        // Hardware inventory
        const hardwareWhere = {
            device_id: device_id ? parseInt(device_id) : { [Op.in]: deviceIds }
        };
        if (component_type) {
            hardwareWhere.component_type = component_type;
        }
        if (manufacturer) {
            hardwareWhere.manufacturer = { [Op.iLike]: `%${manufacturer}%` };
        }

        const hardware = await HardwareInventory.findAll({
            where: hardwareWhere,
            include: [{
                model: Device,
                as: 'Device',
                attributes: ['id', 'hostname'],
                required: false
            }],
            order: [['component_type', 'ASC']]
        });

        // Software inventory
        const softwareWhere = {
            device_id: device_id ? parseInt(device_id) : { [Op.in]: deviceIds }
        };

        const software = await SoftwareInventory.findAll({
            where: softwareWhere,
            include: [{
                model: Device,
                as: 'Device',
                attributes: ['id', 'hostname'],
                required: false
            }],
            order: [['name', 'ASC']]
        });

        // Calculate statistics
        const hardwareByType = {};
        hardware.forEach(item => {
            const type = item.component_type || 'Unknown';
            hardwareByType[type] = (hardwareByType[type] || 0) + 1;
        });

        const softwareByPublisher = {};
        const uniqueSoftware = new Set();
        software.forEach(item => {
            const publisher = item.publisher || 'Unknown';
            softwareByPublisher[publisher] = (softwareByPublisher[publisher] || 0) + 1;
            uniqueSoftware.add(item.name);
        });

        res.json({
            success: true,
            data: {
                summary: {
                    total_hardware: hardware.length,
                    total_software: software.length,
                    unique_software: uniqueSoftware.size,
                    hardware_by_type: hardwareByType,
                    software_by_publisher: softwareByPublisher
                },
                hardware: hardware.map(h => ({
                    id: h.id,
                    device_id: h.device_id,
                    device_name: h.Device?.hostname || 'Unknown',
                    component_type: h.component_type,
                    manufacturer: h.manufacturer,
                    model: h.model,
                    capacity: h.capacity,
                    serial_number: h.serial_number
                })),
                software: software.map(s => ({
                    id: s.id,
                    device_id: s.device_id,
                    device_name: s.Device?.hostname || 'Unknown',
                    name: s.name,
                    version: s.version,
                    publisher: s.publisher,
                    is_system: s.is_system
                }))
            }
        });
    } catch (error) {
        logger.error('Get inventory report error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Generate Custom Report
exports.generateReport = async (req, res) => {
    try {
        const { report_type, start_date, end_date, device_id, format = 'json' } = req.body;
        const companyId = req.companyId || req.user?.company_id;

        if (!companyId) {
            return res.status(400).json({
                success: false,
                message: 'Company ID required'
            });
        }

        let reportData = {};

        switch (report_type) {
            case 'devices':
                // Use device report logic
                const deviceWhere = { company_id: companyId };
                if (device_id) deviceWhere.id = parseInt(device_id);
                const devices = await Device.findAll({ where: deviceWhere });
                reportData = {
                    type: 'devices',
                    generated_at: new Date().toISOString(),
                    total: devices.length,
                    devices: devices.map(d => ({
                        hostname: d.hostname,
                        os_name: d.os_name,
                        os_version: d.os_version,
                        status: d.status,
                        last_seen: d.last_seen
                    }))
                };
                break;

            case 'performance':
                // Use performance report logic
                const devices2 = await Device.findAll({
                    where: { company_id: companyId },
                    attributes: ['id']
                });
                const deviceIds2 = devices2.map(d => d.id);
                const perfWhere = {
                    device_id: device_id ? parseInt(device_id) : { [Op.in]: deviceIds2 }
                };
                if (start_date && end_date) {
                    perfWhere.recorded_at = {
                        [Op.between]: [new Date(start_date), new Date(end_date)]
                    };
                }
                const metrics = await PerformanceMetric.findAll({
                    where: perfWhere,
                    limit: 100,
                    order: [['recorded_at', 'DESC']]
                });
                reportData = {
                    type: 'performance',
                    generated_at: new Date().toISOString(),
                    total_metrics: metrics.length,
                    metrics: metrics.map(m => ({
                        device_id: m.device_id,
                        cpu_usage: m.cpu_usage,
                        memory_usage: m.memory_usage,
                        disk_usage: m.disk_usage_c,
                        recorded_at: m.recorded_at
                    }))
                };
                break;

            case 'inventory':
                // Use inventory report logic
                const devices3 = await Device.findAll({
                    where: { company_id: companyId },
                    attributes: ['id']
                });
                const deviceIds3 = devices3.map(d => d.id);
                const [hardware, software] = await Promise.all([
                    HardwareInventory.findAll({
                        where: { device_id: { [Op.in]: deviceIds3 } },
                        limit: 500
                    }),
                    SoftwareInventory.findAll({
                        where: { device_id: { [Op.in]: deviceIds3 } },
                        limit: 500
                    })
                ]);
                reportData = {
                    type: 'inventory',
                    generated_at: new Date().toISOString(),
                    hardware_count: hardware.length,
                    software_count: software.length,
                    hardware: hardware.slice(0, 100),
                    software: software.slice(0, 100)
                };
                break;

            default:
                return res.status(400).json({
                    success: false,
                    message: 'Invalid report type'
                });
        }

        // For CSV/Excel export, we'd convert to CSV format
        // For now, return JSON
        res.json({
            success: true,
            message: 'Report generated successfully',
            data: reportData
        });
    } catch (error) {
        logger.error('Generate report error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Export Reports as CSV
exports.exportReports = async (req, res) => {
    try {
        const { report_type, device_id, start_date, end_date, hours = 24 } = req.query;
        const companyId = req.companyId || req.user?.company_id;
        if (!companyId) {
            return res.status(400).json({ success: false, message: 'Company ID required' });
        }

        // Helpers
        const toCsv = (rows) => {
            if (!rows || rows.length === 0) return '';
            const headers = Object.keys(rows[0]);
            const escape = (v) => {
                if (v === null || v === undefined) return '';
                const s = String(v).replace(/"/g, '""');
                return s.includes(',') || s.includes('\n') ? `"${s}"` : s;
            };
            const lines = [headers.join(',')].concat(rows.map(r => headers.map(h => escape(r[h])).join(',')));
            return lines.join('\n');
        };

        let filename = `${report_type || 'report'}-${Date.now()}.csv`;
        let rows = [];

        switch (report_type) {
            case 'devices': {
                // Reuse device report logic minimally
                const whereDevice = { company_id: companyId };
                if (device_id) whereDevice.id = parseInt(device_id);
                const devices = await Device.findAll({ where: whereDevice });
                rows = devices.map(d => ({
                    id: d.id,
                    hostname: d.hostname,
                    os_name: d.os_name,
                    os_version: d.os_version,
                    status: d.status,
                    last_seen: d.last_seen
                }));
                break;
            }
            case 'performance': {
                const devices = await Device.findAll({ where: { company_id: companyId }, attributes: ['id','hostname'] });
                const deviceIds = devices.map(d => d.id);
                const perfWhere = { device_id: device_id ? parseInt(device_id) : { [Op.in]: deviceIds } };
                if (start_date && end_date) {
                    perfWhere.recorded_at = { [Op.between]: [new Date(start_date), new Date(end_date)] };
                } else {
                    perfWhere.recorded_at = { [Op.gte]: new Date(Date.now() - hours * 3600 * 1000) };
                }
                const metrics = await PerformanceMetric.findAll({ where: perfWhere, limit: 1000, order: [['recorded_at','DESC']] });
                rows = metrics.map(m => ({
                    device_id: m.device_id,
                    cpu_usage: m.cpu_usage,
                    memory_usage: m.memory_usage,
                    disk_usage: m.disk_usage_c,
                    recorded_at: m.recorded_at
                }));
                break;
            }
            case 'inventory': {
                const devices = await Device.findAll({ where: { company_id: companyId }, attributes: ['id'] });
                const deviceIds = devices.map(d => d.id);
                const hardware = await HardwareInventory.findAll({ where: { device_id: device_id ? parseInt(device_id) : { [Op.in]: deviceIds } }, limit: 1000 });
                rows = hardware.map(h => ({
                    device_id: h.device_id,
                    component_type: h.component_type,
                    manufacturer: h.manufacturer,
                    model: h.model,
                    capacity: h.capacity,
                    serial_number: h.serial_number
                }));
                // Note: could also provide software; keeping CSV simple
                break;
            }
            default:
                return res.status(400).json({ success: false, message: 'Invalid report type' });
        }

        const csv = toCsv(rows);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.status(200).send(csv);
    } catch (error) {
        logger.error('Export reports error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

