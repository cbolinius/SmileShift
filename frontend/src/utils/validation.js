/**
 * Validates email format
 * @param {string} email - Email to validate
 * @returns {boolean} - True if valid
 */
export const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

/**
 * Validates password strength per A2 requirements
 * 8-20 characters, at least one uppercase, one lowercase, one number, one special character
 * @param {string} password - Password to validate
 * @returns {boolean} - True if valid
 */
export const isValidPassword = (password) => {
    if (!password || typeof password !== 'string') return false;
    if (password.length < 8 || password.length > 20) return false;
    if (!/[A-Z]/.test(password)) return false;
    if (!/[a-z]/.test(password)) return false;
    if (!/[0-9]/.test(password)) return false;
    if (!/[^A-Za-z0-9]/.test(password)) return false;
    return true;
};

/**
 * Validates business location coordinates
 * @param {number} lon - Longitude (-180 to 180)
 * @param {number} lat - Latitude (-90 to 90)
 * @returns {boolean} - True if valid
 */
export const isValidLocation = (lon, lat) => {
    if (typeof lon !== 'number' || typeof lat !== 'number') return false;
    if (lon < -180 || lon > 180) return false;
    if (lat < -90 || lat > 90) return false;
    return true;
};

/**
 * Validates date format (YYYY-MM-DD)
 * @param {string} date - Date string to validate
 * @returns {boolean} - True if valid
 */
export const isValidDate = (date) => {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) return false;

    const parsed = new Date(date);
    return !isNaN(parsed);
};

/**
 * Validates that a date is not in the past
 * @param {string|Date} date - Date to check
 * @returns {boolean} - True if date is in the future
 */
export const isFutureDate = (date) => {
    const checkDate = new Date(date);
    const now = new Date();
    return checkDate > now;
};

/**
 * Validates that end time is after start time
 * @param {string|Date} start - Start time
 * @param {string|Date} end - End time
 * @returns {boolean} - True if end is after start
 */
export const isValidTimeRange = (start, end) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    return endDate > startDate;
};

/**
 * Validates phone number (simple validation)
 * @param {string} phone - Phone number
 * @returns {boolean} - True if valid
 */
export const isValidPhone = (phone) => {
    const phoneRegex = /^[\d\s\-+()]{10,20}$/;
    return phoneRegex.test(phone);
};

/**
 * Validates that a salary range is valid
 * @param {number} min - Minimum salary
 * @param {number} max - Maximum salary
 * @returns {boolean} - True if valid
 */
export const isValidSalaryRange = (min, max) => {
    if (typeof min !== 'number' || typeof max !== 'number') return false;
    if (min < 0 || max < 0) return false;
    if (max < min) return false;
    return true;
};

/**
 * Validates that a job's start time is within allowed window
 * @param {string|Date} startTime - Job start time
 * @param {number} maxWindowHours - Maximum hours in the future allowed
 * @returns {boolean} - True if within window
 */
export const isWithinJobStartWindow = (startTime, maxWindowHours) => {
    const start = new Date(startTime);
    const now = new Date();
    const hoursDiff = (start - now) / (1000 * 60 * 60);
    return hoursDiff <= maxWindowHours && hoursDiff > 0;
};

/**
 * Validates that there's enough time for negotiation before job starts
 * @param {string|Date} startTime - Job start time
 * @param {number} negotiationWindowMinutes - Negotiation window in minutes
 * @returns {boolean} - True if enough time
 */
export const hasEnoughNegotiationTime = (startTime, negotiationWindowMinutes) => {
    const start = new Date(startTime);
    const now = new Date();
    const minutesUntilStart = (start - now) / (1000 * 60);
    return minutesUntilStart > negotiationWindowMinutes;
};

/**
 * Helper to format validation errors
 * @param {Object} errors - Object with field errors
 * @returns {string} - Formatted error message
 */
export const formatValidationErrors = (errors) => {
    return Object.values(errors)
        .filter(error => error)
        .join(', ');
};

export default {
    isValidEmail,
    isValidPassword,
    isValidLocation,
    isValidDate,
    isFutureDate,
    isValidTimeRange,
    isValidPhone,
    isValidSalaryRange,
    isWithinJobStartWindow,
    hasEnoughNegotiationTime,
    formatValidationErrors
};
