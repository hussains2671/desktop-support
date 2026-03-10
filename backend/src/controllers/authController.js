const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { User, Company, Plan } = require('../models');
const config = require('../config/config');
const logger = require('../utils/logger');
const { generateCompanyId } = require('../utils/companyIdGenerator');
const passwordValidator = require('../utils/passwordValidator');
const { logAuthEvent, logSecurityEvent } = require('../utils/auditLogger');

exports.register = async (req, res) => {
    try {
        const { email, password, first_name, last_name, company_name, plan_id } = req.body;

        // Check if user exists
        const existingUser = await User.findOne({ where: { email } });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'User already exists'
            });
        }

        // Determine plan_id - use provided or default to plan with name 'default'
        let finalPlanId = plan_id;
        if (!finalPlanId) {
            const defaultPlan = await Plan.findOne({ where: { name: 'default' } });
            if (!defaultPlan) {
                logger.error('Default plan not found in database. Please run seeders.');
                return res.status(500).json({
                    success: false,
                    message: 'System configuration error. Please contact support.'
                });
            }
            finalPlanId = defaultPlan.id;
        } else {
            // Verify the provided plan_id exists
            const plan = await Plan.findByPk(finalPlanId);
            if (!plan) {
                return res.status(400).json({
                    success: false,
                    message: `Plan with ID ${finalPlanId} does not exist`
                });
            }
        }

        // Generate unique company code (16 digits: STATE 4 + COUNTRY 4 + RANDOM 8)
        let companyCode;
        let isUnique = false;
        let attempts = 0;
        const maxAttempts = 10;
        
        while (!isUnique && attempts < maxAttempts) {
            companyCode = generateCompanyId();
            const existing = await Company.findOne({ where: { company_code: companyCode } });
            if (!existing) {
                isUnique = true;
            }
            attempts++;
        }
        
        if (!isUnique) {
            logger.error('Failed to generate unique company code after multiple attempts');
            return res.status(500).json({
                success: false,
                message: 'Failed to generate company code. Please try again.'
            });
        }

        // Create company
        const company = await Company.create({
            name: company_name,
            company_code: companyCode,
            plan_id: finalPlanId,
            status: 'trial',
            trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) // 14 days
        });

        // Validate password complexity
        const passwordValidation = passwordValidator.validate(password);
        if (!passwordValidation.isValid) {
            return res.status(400).json({
                success: false,
                message: 'Password does not meet requirements',
                errors: passwordValidation.errors
            });
        }

        // Create user
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await User.create({
            company_id: company.id,
            email,
            password_hash: hashedPassword,
            first_name,
            last_name,
            role: 'company_admin'
        });

        // Log registration
        await logAuthEvent(user.id, company.id, 'register', { email, company_name }, req);

        const token = jwt.sign(
            { userId: user.id, companyId: company.id },
            config.jwtSecret,
            { expiresIn: config.jwtExpiry }
        );

        logger.info(`New user registered: ${email}, company: ${company.name}`);

        res.status(201).json({
            success: true,
            message: 'Registration successful',
            data: {
                user: {
                    id: user.id,
                    email: user.email,
                    first_name: user.first_name,
                    last_name: user.last_name,
                    role: user.role
                },
                company: {
                    id: company.id,
                    name: company.name,
                    company_code: company.company_code
                },
                token
            }
        });
    } catch (error) {
        logger.error('Registration error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({
            where: { email },
            include: [{
                association: 'Company',
                include: [{
                    association: 'Plan'
                }]
            }]
        });

        // Check if account is locked
        if (user && user.locked_until && new Date(user.locked_until) > new Date()) {
            const lockTimeRemaining = Math.ceil((new Date(user.locked_until) - new Date()) / 1000 / 60);
            await logSecurityEvent(user.id, user.company_id, 'login_blocked_locked', { email, lockTimeRemaining }, req);
            return res.status(423).json({
                success: false,
                message: `Account is locked. Please try again in ${lockTimeRemaining} minutes.`
            });
        }

        // Check if account is locked but lock has expired
        if (user && user.locked_until && new Date(user.locked_until) <= new Date()) {
            user.locked_until = null;
            user.failed_login_attempts = 0;
            await user.save();
        }

        if (!user || !await bcrypt.compare(password, user.password_hash)) {
            // Increment failed login attempts
            if (user) {
                user.failed_login_attempts = (user.failed_login_attempts || 0) + 1;
                
                // Lock account after 5 failed attempts for 30 minutes
                if (user.failed_login_attempts >= 5) {
                    user.locked_until = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
                    await logSecurityEvent(user.id, user.company_id, 'account_locked', { 
                        email, 
                        failedAttempts: user.failed_login_attempts 
                    }, req);
                }
                
                await user.save();
            }
            
            await logSecurityEvent(null, null, 'login_failed', { email }, req);
            
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        if (!user.is_active) {
            await logSecurityEvent(user.id, user.company_id, 'login_blocked_inactive', { email }, req);
            return res.status(403).json({
                success: false,
                message: 'Account is inactive'
            });
        }

        // Reset failed login attempts on successful login
        user.failed_login_attempts = 0;
        user.locked_until = null;
        user.last_login = new Date();
        
        // Generate access token
        const token = jwt.sign(
            { userId: user.id, companyId: user.company_id },
            config.jwtSecret,
            { expiresIn: config.jwtExpiry || '7d' }
        );

        // Generate refresh token
        const refreshToken = crypto.randomBytes(64).toString('hex');
        const refreshTokenExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
        
        user.refresh_token = refreshToken;
        user.refresh_token_expires_at = refreshTokenExpiry;
        await user.save();

        await logAuthEvent(user.id, user.company_id, 'login_success', { email }, req);

        logger.info(`User logged in: ${email}`);

        res.json({
            success: true,
            message: 'Login successful',
            data: {
                user: {
                    id: user.id,
                    email: user.email,
                    first_name: user.first_name,
                    last_name: user.last_name,
                    role: user.role
                },
                company: {
                    id: user.Company.id,
                    name: user.Company.name,
                    company_code: user.Company.company_code,
                    plan: user.Company.Plan?.name
                },
                token,
                refreshToken
            }
        });
    } catch (error) {
        logger.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

exports.getProfile = async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id, {
            include: [{
                association: 'Company',
                include: [{
                    association: 'Plan'
                }]
            }],
            attributes: { exclude: ['password_hash'] }
        });

        res.json({
            success: true,
            data: user
        });
    } catch (error) {
        logger.error('Get profile error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

exports.changePassword = async (req, res) => {
    try {
        const { current_password, new_password } = req.body;
        const user = await User.findByPk(req.user.id);

        // Validation
        if (!current_password || !new_password) {
            return res.status(400).json({
                success: false,
                message: 'Current password and new password are required'
            });
        }

        // Validate password complexity
        const passwordValidation = passwordValidator.validate(new_password);
        if (!passwordValidation.isValid) {
            return res.status(400).json({
                success: false,
                message: 'Password does not meet requirements',
                errors: passwordValidation.errors
            });
        }

        // Verify current password
        const isPasswordValid = await bcrypt.compare(current_password, user.password_hash);
        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: 'Current password is incorrect'
            });
        }

        // Hash and update new password
        const hashedPassword = await bcrypt.hash(new_password, 10);
        await user.update({ password_hash: hashedPassword });

        // Invalidate refresh token on password change
        user.refresh_token = null;
        user.refresh_token_expires_at = null;
        await user.save();

        await logSecurityEvent(user.id, user.company_id, 'password_changed', { email: user.email }, req);

        logger.info(`Password changed for user: ${user.email}`);

        res.json({
            success: true,
            message: 'Password changed successfully'
        });
    } catch (error) {
        logger.error('Change password error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * Refresh access token using refresh token
 */
exports.refreshToken = async (req, res) => {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            return res.status(400).json({
                success: false,
                message: 'Refresh token is required'
            });
        }

        const user = await User.findOne({
            where: { refresh_token: refreshToken },
            include: [{
                association: 'Company',
                include: [{
                    association: 'Plan'
                }]
            }]
        });

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid refresh token'
            });
        }

        // Check if refresh token is expired
        if (!user.refresh_token_expires_at || new Date(user.refresh_token_expires_at) < new Date()) {
            user.refresh_token = null;
            user.refresh_token_expires_at = null;
            await user.save();
            
            return res.status(401).json({
                success: false,
                message: 'Refresh token has expired'
            });
        }

        // Check if user is active
        if (!user.is_active) {
            return res.status(403).json({
                success: false,
                message: 'Account is inactive'
            });
        }

        // Generate new access token
        const token = jwt.sign(
            { userId: user.id, companyId: user.company_id },
            config.jwtSecret,
            { expiresIn: config.jwtExpiry || '7d' }
        );

        await logAuthEvent(user.id, user.company_id, 'token_refreshed', {}, req);

        res.json({
            success: true,
            data: {
                token
            }
        });
    } catch (error) {
        logger.error('Refresh token error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * Logout - invalidate refresh token
 */
exports.logout = async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id);
        
        if (user) {
            user.refresh_token = null;
            user.refresh_token_expires_at = null;
            await user.save();
            
            await logAuthEvent(user.id, user.company_id, 'logout', { email: user.email }, req);
        }

        res.json({
            success: true,
            message: 'Logged out successfully'
        });
    } catch (error) {
        logger.error('Logout error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

