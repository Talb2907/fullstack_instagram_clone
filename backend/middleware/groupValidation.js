const mongoose = require('mongoose');

// limits client requests
const requestCounts = new Map();
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes
const RATE_LIMIT_MAX_REQUESTS = 100; // 100 requests per window

/**
 * Validate date format (YYYY-MM-DD)
 * @param {string} date - Date string to validate
 * @returns {boolean} - True if valid, false otherwise
 */
const isValidDateFormat = (date) => {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(date)) return false;
  
  const parsedDate = new Date(date);
  return !isNaN(parsedDate.getTime());
};

/**
 * Validate date range 
 * @param {string} startDate - Start date string
 * @param {string} endDate - End date string
 * @returns {boolean} - True if valid range, false otherwise
 */
const isValidDateRange = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  return start <= end;
};

/**
 * Validate pagination parameters
 * @param {string} page - Page number
 * @param {string} limit - Items per page
 * @returns {Object} - Validation result with isValid and errors
 */
const validatePagination = (page, limit) => {
  const errors = [];
  
  const pageNum = parseInt(page);
  if (isNaN(pageNum) || pageNum < 1) {
    errors.push('Invalid page number. Must be a positive integer.');
  }
  
  const limitNum = parseInt(limit);
  if (isNaN(limitNum) || limitNum < 1 || limitNum > 50) {
    errors.push('Invalid limit. Must be between 1 and 50.');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    pageNum,
    limitNum
  };
};

/**
 * Sanitize string input to prevent injection attacks
 * @param {string} input - Input string to sanitize
 * @returns {string} - Sanitized string
 */
const sanitizeString = (input) => {
  if (typeof input !== 'string') return '';
  
  // Remove potentially dangerous characters
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove < and >
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .substring(0, 100); // Limit length
};

/**
 * Rate limiting middleware
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const rateLimiter = (req, res, next) => {
  const clientIP = req.ip || req.connection.remoteAddress;
  const now = Date.now();
  
  // Clean old entries
  for (const [key, data] of requestCounts.entries()) {
    if (now - data.timestamp > RATE_LIMIT_WINDOW) {
      requestCounts.delete(key);
    }
  }
  
  // Check current request count
  const clientData = requestCounts.get(clientIP);
  if (!clientData) {
    requestCounts.set(clientIP, { count: 1, timestamp: now });
    return next();
  }
  
  if (now - clientData.timestamp > RATE_LIMIT_WINDOW) {
    // Reset window
    requestCounts.set(clientIP, { count: 1, timestamp: now });
    return next();
  }
  
  if (clientData.count >= RATE_LIMIT_MAX_REQUESTS) {
    return res.status(429).json({
      success: false,
      error: 'Rate limit exceeded. Please try again later.',
      code: 'RATE_LIMIT_EXCEEDED',
      retryAfter: Math.ceil((RATE_LIMIT_WINDOW - (now - clientData.timestamp)) / 1000)
    });
  }
  
  clientData.count++;
  next();
};

/**
 * Validate name-based search parameters
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const validateNameSearch = (req, res, next) => {
  const { name, exact, page, limit } = req.query;
  const errors = [];
  
  // Validate required name parameter
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    errors.push('Name parameter is required and must be a non-empty string.');
  }
  
  // Validate exact parameter
  if (exact && exact !== 'true' && exact !== 'false') {
    errors.push('Exact parameter must be either "true" or "false".');
  }
  
  // Validate pagination
  const paginationResult = validatePagination(page || '1', limit || '10');
  if (!paginationResult.isValid) {
    errors.push(...paginationResult.errors);
  }
  
  // Sanitize inputs
  if (name) {
    req.query.name = sanitizeString(name);
  }
  
  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      error: errors.join(' '),
      code: 'VALIDATION_ERROR'
    });
  }
  
  next();
};

/**
 * Validate category-based search parameters
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const validateCategorySearch = (req, res, next) => {
  const { category, page, limit } = req.query;
  const errors = [];
  
  // Validate required category parameter
  if (!category || typeof category !== 'string' || category.trim().length === 0) {
    errors.push('Category parameter is required and must be a non-empty string.');
  }
  
  // Validate pagination
  const paginationResult = validatePagination(page || '1', limit || '10');
  if (!paginationResult.isValid) {
    errors.push(...paginationResult.errors);
  }
  
  // Sanitize inputs
  if (category) {
    req.query.category = sanitizeString(category);
  }
  
  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      error: errors.join(' '),
      code: 'VALIDATION_ERROR'
    });
  }
  
  next();
};

/**
 * Validate date range search parameters
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const validateDateRangeSearch = (req, res, next) => {
  const { startDate, endDate, page, limit } = req.query;
  const errors = [];
  
  // Validate required date parameters
  if (!startDate || !endDate) {
    errors.push('Both startDate and endDate parameters are required.');
  } else {
    // Validate date format
    if (!isValidDateFormat(startDate)) {
      errors.push('Invalid startDate format. Use YYYY-MM-DD.');
    }
    
    if (!isValidDateFormat(endDate)) {
      errors.push('Invalid endDate format. Use YYYY-MM-DD.');
    }
    
    // Validate date range if both dates are valid
    if (isValidDateFormat(startDate) && isValidDateFormat(endDate)) {
      if (!isValidDateRange(startDate, endDate)) {
        errors.push('Start date must be before or equal to end date.');
      }
    }
  }
  
  // Validate pagination
  const paginationResult = validatePagination(page || '1', limit || '10');
  if (!paginationResult.isValid) {
    errors.push(...paginationResult.errors);
  }
  
  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      error: errors.join(' '),
      code: 'VALIDATION_ERROR'
    });
  }
  
  next();
};

/**
 * Validate combined filter parameters
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const validateCombinedFilters = (req, res, next) => {
  const { name, category, startDate, endDate, exact, page, limit } = req.query;
  const errors = [];
  
  // Validate at least one filter is provided
  if (!name && !category && !startDate && !endDate) {
    errors.push('At least one filter parameter (name, category, startDate, endDate) is required.');
  }
  
  // Validate name if provided
  if (name) {
    if (typeof name !== 'string' || name.trim().length === 0) {
      errors.push('Name parameter must be a non-empty string.');
    }
    
    if (exact && exact !== 'true' && exact !== 'false') {
      errors.push('Exact parameter must be either "true" or "false".');
    }
  }
  
  // Validate category if provided
  if (category) {
    if (typeof category !== 'string' || category.trim().length === 0) {
      errors.push('Category parameter must be a non-empty string.');
    }
  }
  
  // Validate date range if provided
  if (startDate || endDate) {
    if (!startDate || !endDate) {
      errors.push('Both startDate and endDate must be provided together.');
    } else {
      if (!isValidDateFormat(startDate)) {
        errors.push('Invalid startDate format. Use YYYY-MM-DD.');
      }
      
      if (!isValidDateFormat(endDate)) {
        errors.push('Invalid endDate format. Use YYYY-MM-DD.');
      }
      
      if (isValidDateFormat(startDate) && isValidDateFormat(endDate)) {
        if (!isValidDateRange(startDate, endDate)) {
          errors.push('Start date must be before or equal to end date.');
        }
      }
    }
  }
  
  // Validate pagination
  const paginationResult = validatePagination(page || '1', limit || '10');
  if (!paginationResult.isValid) {
    errors.push(...paginationResult.errors);
  }
  
  // Sanitize inputs
  if (name) {
    req.query.name = sanitizeString(name);
  }
  
  if (category) {
    req.query.category = sanitizeString(category);
  }
  
  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      error: errors.join(' '),
      code: 'VALIDATION_ERROR'
    });
  }
  
  next();
};

/**
 * Validate ObjectId format
 * @param {string} id - ObjectId string to validate
 * @returns {boolean} - True if valid ObjectId, false otherwise
 */
const validateObjectId = (id) => {
  return mongoose.Types.ObjectId.isValid(id);
};

/**
 * Validate ObjectId middleware
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const validateObjectIdParam = (req, res, next) => {
  const { id } = req.params;
  
  if (!validateObjectId(id)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid group ID format.',
      code: 'INVALID_OBJECT_ID'
    });
  }
  
  next();
};

module.exports = {
  rateLimiter,
  validateNameSearch,
  validateCategorySearch,
  validateDateRangeSearch,
  validateCombinedFilters,
  validateObjectIdParam,
  isValidDateFormat,
  isValidDateRange,
  validatePagination,
  sanitizeString,
  validateObjectId
}; 