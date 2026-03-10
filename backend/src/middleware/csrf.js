/**
 * CSRF Protection Middleware
 * For REST APIs, CSRF is less critical but we provide basic protection
 * Note: For API-only applications, CSRF is typically handled by CORS and token-based auth
 */

/**
 * Generate CSRF token (for future use with forms)
 */
function generateCsrfToken() {
    return require('crypto').randomBytes(32).toString('hex');
}

/**
 * CSRF validation middleware (optional - mainly for form submissions)
 * For REST APIs with token auth, this is typically not needed
 */
function validateCsrf(req, res, next) {
    // Skip CSRF for API endpoints using token auth
    // This is mainly for form-based submissions if needed in future
    if (req.header('Authorization')) {
        return next(); // Token-based auth, skip CSRF
    }

    // For form submissions, validate CSRF token
    const token = req.body._csrf || req.header('X-CSRF-Token');
    const sessionToken = req.session?.csrfToken;

    if (!token || token !== sessionToken) {
        return res.status(403).json({
            success: false,
            message: 'Invalid CSRF token'
        });
    }

    next();
}

module.exports = {
    generateCsrfToken,
    validateCsrf
};

