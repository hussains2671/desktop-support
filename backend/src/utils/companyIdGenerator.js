/**
 * Generate 16-digit Company ID
 * Format: STATE (4 digits) + COUNTRY (4 digits) + RANDOM (8 digits)
 * Example: 1234 5678 12345678
 */

/**
 * Generate a random number with specified digits
 * @param {number} digits - Number of digits
 * @returns {string} - Random number as string with leading zeros
 */
function generateRandomDigits(digits) {
    const min = Math.pow(10, digits - 1);
    const max = Math.pow(10, digits) - 1;
    const random = Math.floor(Math.random() * (max - min + 1)) + min;
    return random.toString().padStart(digits, '0');
}

/**
 * Generate 16-digit Company ID
 * Format: STATE (4) + COUNTRY (4) + RANDOM (8)
 * 
 * @param {string} stateCode - Optional state code (default: random 4 digits)
 * @param {string} countryCode - Optional country code (default: random 4 digits)
 * @returns {string} - 16-digit company ID
 */
function generateCompanyId(stateCode = null, countryCode = null) {
    // Generate or use provided state code (4 digits)
    const state = stateCode || generateRandomDigits(4);
    
    // Generate or use provided country code (4 digits)
    const country = countryCode || generateRandomDigits(4);
    
    // Generate random 8 digits
    const random = generateRandomDigits(8);
    
    // Combine: STATE + COUNTRY + RANDOM = 16 digits
    return state + country + random;
}

/**
 * Validate Company ID format
 * @param {string} companyId - Company ID to validate
 * @returns {boolean} - True if valid format
 */
function validateCompanyId(companyId) {
    if (!companyId || typeof companyId !== 'string') {
        return false;
    }
    
    // Remove any spaces or dashes
    const cleaned = companyId.replace(/[\s-]/g, '');
    
    // Check if it's exactly 16 digits
    return /^\d{16}$/.test(cleaned);
}

/**
 * Format Company ID for display
 * Format: XXXX XXXX XXXX XXXX
 * @param {string} companyId - Company ID
 * @returns {string} - Formatted Company ID
 */
function formatCompanyId(companyId) {
    if (!companyId) return '';
    
    // Remove any spaces or dashes
    const cleaned = companyId.replace(/[\s-]/g, '');
    
    if (cleaned.length !== 16) {
        return companyId; // Return as-is if invalid
    }
    
    // Format: XXXX XXXX XXXX XXXX
    return `${cleaned.substring(0, 4)} ${cleaned.substring(4, 8)} ${cleaned.substring(8, 12)} ${cleaned.substring(12, 16)}`;
}

module.exports = {
    generateCompanyId,
    validateCompanyId,
    formatCompanyId
};

