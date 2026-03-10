const express = require('express');
const router = express.Router();
const fileTransferController = require('../controllers/fileTransferController');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/auth');
const { authenticateAgent } = require('../middleware/agentAuth');
const { validate } = require('../middleware/validation');
const {
    validateInitiateUpload,
    validateInitiateDownload,
    validateFileList,
    validateTransferStatus,
    validateCancelTransfer
} = require('../middleware/fileTransferValidation');
const rateLimit = require('express-rate-limit');

// Rate limiting for file transfer endpoints
const fileTransferLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 50, // limit each IP to 50 requests per windowMs
    message: 'Too many requests from this IP, please try again later.'
});

// Rate limiting for agent endpoints (higher limit for file operations)
const agentFileLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.'
});

// Initiate upload (Admin, Company Admin, Technician)
router.post('/upload/initiate',
    authenticate,
    authorize('admin', 'company_admin', 'technician'),
    fileTransferLimiter,
    validateInitiateUpload,
    validate,
    fileTransferController.initiateUpload
);

// Upload file (Agent only)
router.post('/upload',
    authenticateAgent,
    agentFileLimiter,
    fileTransferController.uploadFile
);

// Initiate download (Admin, Company Admin, Technician)
router.post('/download/initiate',
    authenticate,
    authorize('admin', 'company_admin', 'technician'),
    fileTransferLimiter,
    validateInitiateDownload,
    validate,
    fileTransferController.initiateDownload
);

// Download file (Admin, Company Admin, Technician)
router.get('/download/:id',
    authenticate,
    authorize('admin', 'company_admin', 'technician'),
    fileTransferLimiter,
    fileTransferController.downloadFile
);

// Get file list (Admin, Company Admin, Technician)
router.get('/list/:agent_id',
    authenticate,
    authorize('admin', 'company_admin', 'technician'),
    fileTransferLimiter,
    validateFileList,
    validate,
    fileTransferController.getFileList
);

// Get transfer status (Admin, Company Admin, Technician)
router.get('/status/:id',
    authenticate,
    authorize('admin', 'company_admin', 'technician'),
    fileTransferLimiter,
    validateTransferStatus,
    validate,
    fileTransferController.getTransferStatus
);

// Cancel transfer (Admin, Company Admin, Technician)
router.post('/:id/cancel',
    authenticate,
    authorize('admin', 'company_admin', 'technician'),
    fileTransferLimiter,
    validateCancelTransfer,
    validate,
    fileTransferController.cancelTransfer
);

// Get transfer history (Admin, Company Admin, Technician)
router.get('/history',
    authenticate,
    authorize('admin', 'company_admin', 'technician'),
    fileTransferLimiter,
    fileTransferController.getTransferHistory
);

module.exports = router;

