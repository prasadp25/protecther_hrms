// ===================================
// PAGINATION UTILITIES
// ===================================

/**
 * Parse pagination parameters from request query
 * @param {Object} query - Express request query object
 * @returns {Object} Pagination parameters
 */
const parsePaginationParams = (query) => {
  const page = parseInt(query.page) || 1;
  const limit = parseInt(query.limit) || 10;
  const offset = (page - 1) * limit;

  // Validate and sanitize
  const sanitizedPage = Math.max(1, page);
  const sanitizedLimit = Math.min(Math.max(1, limit), 500); // Max 500 items per page
  const sanitizedOffset = (sanitizedPage - 1) * sanitizedLimit;

  return {
    page: sanitizedPage,
    limit: sanitizedLimit,
    offset: sanitizedOffset
  };
};

/**
 * Parse sorting parameters from request query
 * @param {Object} query - Express request query object
 * @param {Array} allowedFields - Array of allowed field names for sorting
 * @param {String} defaultField - Default field to sort by
 * @returns {Object} Sorting parameters
 */
const parseSortParams = (query, allowedFields = [], defaultField = 'created_at') => {
  const sortBy = query.sortBy || defaultField;
  const sortOrder = (query.sortOrder || 'DESC').toUpperCase();

  // Validate sort field
  const sanitizedSortBy = allowedFields.includes(sortBy) ? sortBy : defaultField;

  // Validate sort order
  const sanitizedSortOrder = ['ASC', 'DESC'].includes(sortOrder) ? sortOrder : 'DESC';

  return {
    sortBy: sanitizedSortBy,
    sortOrder: sanitizedSortOrder,
    orderByClause: `${sanitizedSortBy} ${sanitizedSortOrder}`
  };
};

/**
 * Parse search/filter parameters from request query
 * @param {Object} query - Express request query object
 * @returns {Object} Search parameters
 */
const parseSearchParams = (query) => {
  const search = query.search || '';
  const status = query.status || '';
  const siteId = query.site_id || '';
  const clientId = query.client_id || '';
  const designation = query.designation || '';
  const dateFrom = query.date_from || '';
  const dateTo = query.date_to || '';

  return {
    search: search.trim(),
    status: status.trim(),
    siteId: siteId.trim(),
    clientId: clientId.trim(),
    designation: designation.trim(),
    dateFrom: dateFrom.trim(),
    dateTo: dateTo.trim()
  };
};

/**
 * Build pagination metadata for response
 * @param {Number} total - Total number of records
 * @param {Number} page - Current page number
 * @param {Number} limit - Records per page
 * @returns {Object} Pagination metadata
 */
const buildPaginationMeta = (total, page, limit) => {
  const totalPages = Math.ceil(total / limit);
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;

  return {
    currentPage: page,
    itemsPerPage: limit,
    totalItems: total,
    totalPages: totalPages,
    hasNextPage: hasNextPage,
    hasPrevPage: hasPrevPage,
    nextPage: hasNextPage ? page + 1 : null,
    prevPage: hasPrevPage ? page - 1 : null
  };
};

/**
 * Build paginated response object
 * @param {Array} data - Array of records
 * @param {Number} total - Total number of records
 * @param {Number} page - Current page number
 * @param {Number} limit - Records per page
 * @returns {Object} Paginated response
 */
const buildPaginatedResponse = (data, total, page, limit) => {
  return {
    success: true,
    data: data,
    pagination: buildPaginationMeta(total, page, limit)
  };
};

module.exports = {
  parsePaginationParams,
  parseSortParams,
  parseSearchParams,
  buildPaginationMeta,
  buildPaginatedResponse
};
