const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticate, authorize } = require('../middleware/auth');

// All admin routes require authentication
router.use(authenticate);

// Company features - allow company_admin to access their own company (before global authorize)
router.get('/companies/:companyId/features', (req, res, next) => {
    // Allow company_admin to access their own company's features
    if (req.user.role === 'company_admin') {
        if (parseInt(req.params.companyId) !== req.user.company_id) {
            return res.status(403).json({
                success: false,
                message: 'You can only access your own company features'
            });
        }
        return next(); // Allow access
    }
    // For other roles, require super_admin or admin
    if (!['super_admin', 'admin'].includes(req.user.role)) {
        return res.status(403).json({
            success: false,
            message: 'Insufficient permissions'
        });
    }
    next();
}, adminController.getCompanyFeatures);

// Users - allow company_admin to access their own company's users (before global authorize)
router.get('/users', (req, res, next) => {
    // Allow company_admin to access their own company's users
    if (req.user.role === 'company_admin') {
        // Force companyId to their own company
        req.query.companyId = req.user.company_id;
        return next(); // Allow access
    }
    // For other roles, require super_admin or admin
    if (!['super_admin', 'admin'].includes(req.user.role)) {
        return res.status(403).json({
            success: false,
            message: 'Insufficient permissions'
        });
    }
    next();
}, adminController.getAllUsers);

// All other admin routes require super_admin or admin
router.use(authorize('super_admin', 'admin'));

// Company Management
router.get('/companies', adminController.getAllCompanies);
router.get('/companies/:id', adminController.getCompany);
router.post('/companies', adminController.createCompany);
router.put('/companies/:id', adminController.updateCompany);
router.delete('/companies/:id', adminController.deleteCompany);

// Plan Management
router.get('/plans', adminController.getAllPlans);
router.get('/plans/:id', adminController.getPlan);

// Feature Management
router.get('/features', adminController.getAllFeatures);
router.put('/companies/:companyId/features/:featureId', adminController.updateCompanyFeature);

// User Management (create only for super_admin/admin)
router.post('/users', adminController.createUser);

// User Management routes - allow company_admin for their own company users
router.put('/users/:id', (req, res, next) => {
    // Allow company_admin to update users in their own company
    if (req.user.role === 'company_admin') {
        // Will be checked in controller
        return next();
    }
    // For other roles, require super_admin or admin
    if (!['super_admin', 'admin'].includes(req.user.role)) {
        return res.status(403).json({
            success: false,
            message: 'Insufficient permissions'
        });
    }
    next();
}, adminController.updateUser);

router.delete('/users/:id', (req, res, next) => {
    // Allow company_admin to delete users in their own company
    if (req.user.role === 'company_admin') {
        // Will be checked in controller
        return next();
    }
    // For other roles, require super_admin or admin
    if (!['super_admin', 'admin'].includes(req.user.role)) {
        return res.status(403).json({
            success: false,
            message: 'Insufficient permissions'
        });
    }
    next();
}, adminController.deleteUser);

router.post('/users/:id/reset-password', (req, res, next) => {
    // Allow company_admin to reset passwords for users in their own company
    if (req.user.role === 'company_admin') {
        // Will be checked in controller
        return next();
    }
    // For other roles, require super_admin or admin
    if (!['super_admin', 'admin'].includes(req.user.role)) {
        return res.status(403).json({
            success: false,
            message: 'Insufficient permissions'
        });
    }
    next();
}, adminController.resetUserPassword);

router.put('/users/:id/activate', (req, res, next) => {
    // Allow company_admin to activate/deactivate users in their own company
    if (req.user.role === 'company_admin') {
        // Will be checked in controller
        return next();
    }
    // For other roles, require super_admin or admin
    if (!['super_admin', 'admin'].includes(req.user.role)) {
        return res.status(403).json({
            success: false,
            message: 'Insufficient permissions'
        });
    }
    next();
}, adminController.activateUser);

module.exports = router;

