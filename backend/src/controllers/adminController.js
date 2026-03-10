const { Company, User, Plan, Feature, CompanyFeature, PlanFeature, Device, Agent } = require('../models');
const { Op } = require('sequelize');
const bcrypt = require('bcryptjs');
const logger = require('../utils/logger');

// Company Management
exports.getAllCompanies = async (req, res) => {
    try {
        const { page = 1, limit = 20, search, status } = req.query;
        const offset = (page - 1) * limit;

        const where = {};
        if (search) {
            where[Op.or] = [
                { name: { [Op.iLike]: `%${search}%` } },
                { domain: { [Op.iLike]: `%${search}%` } }
            ];
        }
        if (status) {
            where.status = status;
        }

        const companies = await Company.findAndCountAll({
            where,
            include: [{
                model: Plan,
                as: 'Plan',
                attributes: ['id', 'name', 'display_name']
            }],
            limit: parseInt(limit),
            offset: parseInt(offset),
            order: [['created_at', 'DESC']]
        });

        res.json({
            success: true,
            data: companies.rows,
            pagination: {
                total: companies.count,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(companies.count / limit)
            }
        });
    } catch (error) {
        logger.error('Get companies error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

exports.getCompany = async (req, res) => {
    try {
        const company = await Company.findByPk(req.params.id, {
            include: [
                {
                    model: Plan,
                    as: 'Plan',
                    include: [{
                        model: Feature,
                        as: 'Features',
                        through: { attributes: ['is_enabled'] }
                    }]
                },
                {
                    model: Feature,
                    as: 'Features',
                    through: { attributes: ['is_enabled'] }
                }
            ]
        });

        if (!company) {
            return res.status(404).json({
                success: false,
                message: 'Company not found'
            });
        }

        res.json({
            success: true,
            data: company
        });
    } catch (error) {
        logger.error('Get company error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

exports.createCompany = async (req, res) => {
    try {
        const { name, domain, subdomain, plan_id, max_agents, max_devices, status } = req.body;

        const company = await Company.create({
            name,
            domain,
            subdomain,
            plan_id: plan_id || 1,
            max_agents: max_agents || 10,
            max_devices: max_devices || 50,
            status: status || 'trial',
            trial_ends_at: status === 'trial' ? new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) : null
        });

        res.status(201).json({
            success: true,
            message: 'Company created successfully',
            data: company
        });
    } catch (error) {
        logger.error('Create company error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

exports.updateCompany = async (req, res) => {
    try {
        const { name, domain, subdomain, plan_id, max_agents, max_devices, status } = req.body;

        const company = await Company.findByPk(req.params.id);
        if (!company) {
            return res.status(404).json({
                success: false,
                message: 'Company not found'
            });
        }

        await company.update({
            name: name || company.name,
            domain: domain || company.domain,
            subdomain: subdomain || company.subdomain,
            plan_id: plan_id || company.plan_id,
            max_agents: max_agents || company.max_agents,
            max_devices: max_devices || company.max_devices,
            status: status || company.status
        });

        res.json({
            success: true,
            message: 'Company updated successfully',
            data: company
        });
    } catch (error) {
        logger.error('Update company error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

exports.deleteCompany = async (req, res) => {
    try {
        const company = await Company.findByPk(req.params.id);
        if (!company) {
            return res.status(404).json({
                success: false,
                message: 'Company not found'
            });
        }

        await company.destroy();

        res.json({
            success: true,
            message: 'Company deleted successfully'
        });
    } catch (error) {
        logger.error('Delete company error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Plan Management
exports.getAllPlans = async (req, res) => {
    try {
        const plans = await Plan.findAll({
            include: [{
                model: Feature,
                as: 'Features',
                through: { attributes: ['is_enabled'] }
            }],
            order: [['id', 'ASC']]
        });

        res.json({
            success: true,
            data: plans
        });
    } catch (error) {
        logger.error('Get plans error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

exports.getPlan = async (req, res) => {
    try {
        const plan = await Plan.findByPk(req.params.id, {
            include: [{
                model: Feature,
                as: 'Features',
                through: { attributes: ['is_enabled'] }
            }]
        });

        if (!plan) {
            return res.status(404).json({
                success: false,
                message: 'Plan not found'
            });
        }

        res.json({
            success: true,
            data: plan
        });
    } catch (error) {
        logger.error('Get plan error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Feature Management
exports.getAllFeatures = async (req, res) => {
    try {
        const features = await Feature.findAll({
            order: [['category', 'ASC'], ['name', 'ASC']]
        });

        res.json({
            success: true,
            data: features
        });
    } catch (error) {
        logger.error('Get features error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

exports.getCompanyFeatures = async (req, res) => {
    try {
        const companyId = req.params.companyId;
        
        const company = await Company.findByPk(companyId, {
            include: [{
                model: Plan,
                as: 'Plan',
                include: [{
                    model: Feature,
                    as: 'Features',
                    through: { attributes: ['is_enabled'] }
                }]
            }, {
                model: Feature,
                as: 'Features',
                through: { attributes: ['is_enabled'] }
            }]
        });

        if (!company) {
            return res.status(404).json({
                success: false,
                message: 'Company not found'
            });
        }

        // Get all features with their status
        const allFeatures = await Feature.findAll();
        const featuresWithStatus = allFeatures.map(feature => {
            // Check company override
            const companyOverride = company.Features?.find(cf => cf.id === feature.id);
            if (companyOverride) {
                return {
                    ...feature.toJSON(),
                    is_enabled: companyOverride.CompanyFeature?.is_enabled ?? false,
                    source: 'company_override'
                };
            }

            // Check plan default
            const planFeature = company.Plan?.Features?.find(f => f.id === feature.id);
            if (planFeature) {
                return {
                    ...feature.toJSON(),
                    is_enabled: planFeature.PlanFeature?.is_enabled ?? false,
                    source: 'plan_default'
                };
            }

            return {
                ...feature.toJSON(),
                is_enabled: false,
                source: 'none'
            };
        });

        res.json({
            success: true,
            data: featuresWithStatus
        });
    } catch (error) {
        logger.error('Get company features error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

exports.updateCompanyFeature = async (req, res) => {
    try {
        const { companyId, featureId } = req.params;
        const { is_enabled } = req.body;

        let companyFeature = await CompanyFeature.findOne({
            where: {
                company_id: companyId,
                feature_id: featureId
            }
        });

        if (companyFeature) {
            await companyFeature.update({ is_enabled });
        } else {
            companyFeature = await CompanyFeature.create({
                company_id: companyId,
                feature_id: featureId,
                is_enabled
            });
        }

        res.json({
            success: true,
            message: 'Feature updated successfully',
            data: companyFeature
        });
    } catch (error) {
        logger.error('Update company feature error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// User Management
exports.getAllUsers = async (req, res) => {
    try {
        const { companyId, page = 1, limit = 20 } = req.query;
        const offset = (page - 1) * limit;

        const where = {};
        if (companyId) {
            where.company_id = companyId;
        }

        const users = await User.findAndCountAll({
            where,
            include: [{
                model: Company,
                as: 'Company',
                attributes: ['id', 'name']
            }],
            attributes: { exclude: ['password_hash'] },
            limit: parseInt(limit),
            offset: parseInt(offset),
            order: [['created_at', 'DESC']]
        });

        res.json({
            success: true,
            data: users.rows,
            pagination: {
                total: users.count,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(users.count / limit)
            }
        });
    } catch (error) {
        logger.error('Get users error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

exports.createUser = async (req, res) => {
    try {
        const { email, password, first_name, last_name, company_id, role } = req.body;

        // Validation
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email and password are required'
            });
        }

        // Check if user already exists
        const existingUser = await User.findOne({ where: { email, company_id } });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'User with this email already exists in this company'
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await User.create({
            email,
            password_hash: hashedPassword,
            first_name,
            last_name,
            company_id: company_id || req.user.company_id,
            role: role || 'viewer'
        });

        const userData = user.toJSON();
        delete userData.password_hash;

        logger.info(`User created: ${email} by ${req.user.email}`);

        res.status(201).json({
            success: true,
            message: 'User created successfully',
            data: userData
        });
    } catch (error) {
        logger.error('Create user error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

exports.updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { email, first_name, last_name, role, is_active, company_id } = req.body;
        const currentUser = req.user;

        // Find user
        const user = await User.findByPk(id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Authorization check
        // Company admins can only update users in their own company
        if (currentUser.role === 'company_admin' && user.company_id !== currentUser.company_id) {
            return res.status(403).json({
                success: false,
                message: 'You can only update users in your own company'
            });
        }

        // Prevent updating own role (unless super_admin)
        if (id === currentUser.id.toString() && role && role !== currentUser.role && currentUser.role !== 'super_admin') {
            return res.status(403).json({
                success: false,
                message: 'You cannot change your own role'
            });
        }

        // Check email uniqueness if email is being changed
        if (email && email !== user.email) {
            const existingUser = await User.findOne({ 
                where: { 
                    email, 
                    company_id: company_id || user.company_id 
                } 
            });
            if (existingUser && existingUser.id !== parseInt(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'Email already exists in this company'
                });
            }
        }

        // Update user
        const updateData = {};
        if (email) updateData.email = email;
        if (first_name !== undefined) updateData.first_name = first_name;
        if (last_name !== undefined) updateData.last_name = last_name;
        if (role) updateData.role = role;
        if (is_active !== undefined) updateData.is_active = is_active;
        if (company_id && currentUser.role === 'super_admin') updateData.company_id = company_id;

        await user.update(updateData);

        const userData = user.toJSON();
        delete userData.password_hash;

        logger.info(`User updated: ${id} by ${currentUser.email}`);

        res.json({
            success: true,
            message: 'User updated successfully',
            data: userData
        });
    } catch (error) {
        logger.error('Update user error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

exports.deleteUser = async (req, res) => {
    try {
        const { id } = req.params;
        const currentUser = req.user;

        // Find user
        const user = await User.findByPk(id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Prevent self-deletion
        if (id === currentUser.id.toString()) {
            return res.status(400).json({
                success: false,
                message: 'You cannot delete your own account'
            });
        }

        // Authorization check
        // Company admins can only delete users in their own company
        if (currentUser.role === 'company_admin' && user.company_id !== currentUser.company_id) {
            return res.status(403).json({
                success: false,
                message: 'You can only delete users in your own company'
            });
        }

        // Delete user
        await user.destroy();

        logger.info(`User deleted: ${id} (${user.email}) by ${currentUser.email}`);

        res.json({
            success: true,
            message: 'User deleted successfully'
        });
    } catch (error) {
        logger.error('Delete user error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

exports.resetUserPassword = async (req, res) => {
    try {
        const { id } = req.params;
        const { new_password } = req.body;
        const currentUser = req.user;

        // Validation
        if (!new_password || new_password.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 6 characters long'
            });
        }

        // Find user
        const user = await User.findByPk(id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Authorization check
        // Company admins can only reset passwords for users in their own company
        if (currentUser.role === 'company_admin' && user.company_id !== currentUser.company_id) {
            return res.status(403).json({
                success: false,
                message: 'You can only reset passwords for users in your own company'
            });
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(new_password, 10);
        await user.update({ password_hash: hashedPassword });

        logger.info(`Password reset for user: ${id} (${user.email}) by ${currentUser.email}`);

        res.json({
            success: true,
            message: 'Password reset successfully'
        });
    } catch (error) {
        logger.error('Reset password error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

exports.activateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { is_active } = req.body;
        const currentUser = req.user;

        // Find user
        const user = await User.findByPk(id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Prevent self-deactivation
        if (id === currentUser.id.toString() && is_active === false) {
            return res.status(400).json({
                success: false,
                message: 'You cannot deactivate your own account'
            });
        }

        // Authorization check
        // Company admins can only activate/deactivate users in their own company
        if (currentUser.role === 'company_admin' && user.company_id !== currentUser.company_id) {
            return res.status(403).json({
                success: false,
                message: 'You can only activate/deactivate users in your own company'
            });
        }

        // Update user
        await user.update({ is_active });

        logger.info(`User ${is_active ? 'activated' : 'deactivated'}: ${id} (${user.email}) by ${currentUser.email}`);

        const userData = user.toJSON();
        delete userData.password_hash;

        res.json({
            success: true,
            message: `User ${is_active ? 'activated' : 'deactivated'} successfully`,
            data: userData
        });
    } catch (error) {
        logger.error('Activate user error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

