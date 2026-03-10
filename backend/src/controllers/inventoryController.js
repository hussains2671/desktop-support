const { Device, HardwareInventory, SoftwareInventory } = require('../models');
const { Op } = require('sequelize');
const logger = require('../utils/logger');

exports.getCompanyInventory = async (req, res) => {
    try {
        const companyId = req.companyId;
        const { page = 1, limit = 20, search, device_id, component_type } = req.query;
        const offset = (page - 1) * limit;

        // Get all devices for the company
        const devices = await Device.findAll({
            where: { company_id: companyId },
            attributes: ['id', 'hostname', 'username']
        });

        const deviceIds = devices.map(d => d.id);

        if (deviceIds.length === 0) {
            return res.json({
                success: true,
                data: {
                    hardware: [],
                    software: [],
                    devices: []
                },
                pagination: {
                    total: 0,
                    page: parseInt(page),
                    limit: parseInt(limit),
                    pages: 0
                }
            });
        }

        // Build where conditions
        const hardwareWhere = { device_id: { [Op.in]: deviceIds } };
        const softwareWhere = { device_id: { [Op.in]: deviceIds } };

        if (device_id) {
            hardwareWhere.device_id = parseInt(device_id);
            softwareWhere.device_id = parseInt(device_id);
        }

        if (component_type) {
            hardwareWhere.component_type = component_type;
        }

        if (search) {
            hardwareWhere[Op.or] = [
                { manufacturer: { [Op.iLike]: `%${search}%` } },
                { model: { [Op.iLike]: `%${search}%` } },
                { serial_number: { [Op.iLike]: `%${search}%` } }
            ];
            softwareWhere[Op.or] = [
                { name: { [Op.iLike]: `%${search}%` } },
                { publisher: { [Op.iLike]: `%${search}%` } },
                { version: { [Op.iLike]: `%${search}%` } }
            ];
        }

        // Get hardware and software counts
        const [hardwareCount, softwareCount] = await Promise.all([
            HardwareInventory.count({ where: hardwareWhere }),
            SoftwareInventory.count({ where: softwareWhere })
        ]);

        // Get hardware and software with pagination
        const [hardware, software] = await Promise.all([
            HardwareInventory.findAll({
                where: hardwareWhere,
                include: [{
                    model: Device,
                    as: 'Device',
                    attributes: ['id', 'hostname', 'username']
                }],
                limit: parseInt(limit),
                offset: parseInt(offset),
                order: [['component_type', 'ASC'], ['manufacturer', 'ASC']]
            }),
            SoftwareInventory.findAll({
                where: softwareWhere,
                include: [{
                    model: Device,
                    as: 'Device',
                    attributes: ['id', 'hostname', 'username']
                }],
                limit: parseInt(limit),
                offset: parseInt(offset),
                order: [['name', 'ASC']]
            })
        ]);

        res.json({
            success: true,
            data: {
                hardware,
                software,
                devices
            },
            pagination: {
                total: hardwareCount + softwareCount,
                hardware_count: hardwareCount,
                software_count: softwareCount,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil((hardwareCount + softwareCount) / limit)
            }
        });
    } catch (error) {
        logger.error('Get company inventory error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

exports.getHardwareInventory = async (req, res) => {
    try {
        const companyId = req.companyId;
        const { page = 1, limit = 50, search, device_id, component_type, manufacturer } = req.query;
        const offset = (page - 1) * limit;

        // Get all devices for the company
        const devices = await Device.findAll({
            where: { company_id: companyId },
            attributes: ['id']
        });

        const deviceIds = devices.map(d => d.id);

        if (deviceIds.length === 0) {
            return res.json({
                success: true,
                data: [],
                pagination: {
                    total: 0,
                    page: parseInt(page),
                    limit: parseInt(limit),
                    pages: 0
                }
            });
        }

        const where = { device_id: { [Op.in]: deviceIds } };

        if (device_id) {
            where.device_id = parseInt(device_id);
        }

        if (component_type) {
            where.component_type = component_type;
        }

        if (manufacturer) {
            where.manufacturer = { [Op.iLike]: `%${manufacturer}%` };
        }

        if (search) {
            where[Op.or] = [
                { manufacturer: { [Op.iLike]: `%${search}%` } },
                { model: { [Op.iLike]: `%${search}%` } },
                { serial_number: { [Op.iLike]: `%${search}%` } },
                { part_number: { [Op.iLike]: `%${search}%` } }
            ];
        }

        const hardware = await HardwareInventory.findAndCountAll({
            where,
            include: [{
                model: Device,
                as: 'Device',
                attributes: ['id', 'hostname', 'username']
            }],
            limit: parseInt(limit),
            offset: parseInt(offset),
            order: [['component_type', 'ASC'], ['manufacturer', 'ASC'], ['model', 'ASC']]
        });

        res.json({
            success: true,
            data: hardware.rows,
            pagination: {
                total: hardware.count,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(hardware.count / limit)
            }
        });
    } catch (error) {
        logger.error('Get hardware inventory error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

exports.getSoftwareInventory = async (req, res) => {
    try {
        const companyId = req.companyId;
        const { page = 1, limit = 50, search, device_id, publisher, is_system } = req.query;
        const offset = (page - 1) * limit;

        // Get all devices for the company
        const devices = await Device.findAll({
            where: { company_id: companyId },
            attributes: ['id']
        });

        const deviceIds = devices.map(d => d.id);

        if (deviceIds.length === 0) {
            return res.json({
                success: true,
                data: [],
                pagination: {
                    total: 0,
                    page: parseInt(page),
                    limit: parseInt(limit),
                    pages: 0
                }
            });
        }

        const where = { device_id: { [Op.in]: deviceIds } };

        if (device_id) {
            where.device_id = parseInt(device_id);
        }

        if (publisher) {
            where.publisher = { [Op.iLike]: `%${publisher}%` };
        }

        if (is_system !== undefined) {
            where.is_system = is_system === 'true';
        }

        if (search) {
            where[Op.or] = [
                { name: { [Op.iLike]: `%${search}%` } },
                { publisher: { [Op.iLike]: `%${search}%` } },
                { version: { [Op.iLike]: `%${search}%` } }
            ];
        }

        const software = await SoftwareInventory.findAndCountAll({
            where,
            include: [{
                model: Device,
                as: 'Device',
                attributes: ['id', 'hostname', 'username']
            }],
            limit: parseInt(limit),
            offset: parseInt(offset),
            order: [['name', 'ASC'], ['version', 'DESC']]
        });

        res.json({
            success: true,
            data: software.rows,
            pagination: {
                total: software.count,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(software.count / limit)
            }
        });
    } catch (error) {
        logger.error('Get software inventory error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

exports.getInventoryStats = async (req, res) => {
    try {
        const companyId = req.companyId;

        // Get all devices for the company
        const devices = await Device.findAll({
            where: { company_id: companyId },
            attributes: ['id']
        });

        const deviceIds = devices.map(d => d.id);

        if (deviceIds.length === 0) {
            return res.json({
                success: true,
                data: {
                    total_devices: 0,
                    total_hardware_items: 0,
                    total_software_items: 0,
                    hardware_by_type: {},
                    software_by_publisher: {},
                    unique_software: 0,
                    devices_with_inventory: 0
                }
            });
        }

        // Get counts
        const [hardwareCount, softwareCount, hardwareItems, softwareItems] = await Promise.all([
            HardwareInventory.count({ where: { device_id: { [Op.in]: deviceIds } } }),
            SoftwareInventory.count({ where: { device_id: { [Op.in]: deviceIds } } }),
            HardwareInventory.findAll({
                where: { device_id: { [Op.in]: deviceIds } },
                attributes: ['component_type', 'manufacturer']
            }),
            SoftwareInventory.findAll({
                where: { device_id: { [Op.in]: deviceIds } },
                attributes: ['name', 'publisher', 'device_id']
            })
        ]);

        // Group hardware by type
        const hardwareByType = {};
        hardwareItems.forEach(item => {
            const type = item.component_type || 'unknown';
            hardwareByType[type] = (hardwareByType[type] || 0) + 1;
        });

        // Group software by publisher
        const softwareByPublisher = {};
        softwareItems.forEach(item => {
            const publisher = item.publisher || 'Unknown';
            softwareByPublisher[publisher] = (softwareByPublisher[publisher] || 0) + 1;
        });

        // Get unique software names
        const uniqueSoftware = new Set(softwareItems.map(item => item.name.toLowerCase())).size;

        // Get devices with inventory
        const devicesWithInventory = new Set([
            ...hardwareItems.map(item => item.device_id),
            ...softwareItems.map(item => item.device_id)
        ]).size;

        res.json({
            success: true,
            data: {
                total_devices: devices.length,
                total_hardware_items: hardwareCount,
                total_software_items: softwareCount,
                hardware_by_type: hardwareByType,
                software_by_publisher: softwareByPublisher,
                unique_software: uniqueSoftware,
                devices_with_inventory: devicesWithInventory
            }
        });
    } catch (error) {
        logger.error('Get inventory stats error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

