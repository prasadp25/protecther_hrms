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

/**
 * Build SQL WHERE clause for search
 * @param {Object} searchParams - Search parameters
 * @param {Array} searchFields - Fields to search in
 * @returns {Object} WHERE clause and values
 */
const buildSearchClause = (searchParams, searchFields = []) => {
  const conditions = [];
  const values = [];

  // Full-text search
  if (searchParams.search && searchFields.length > 0) {
    const searchConditions = searchFields.map(field => `${field} LIKE ?`);
    conditions.push(`(${searchConditions.join(' OR ')})`);
    // Add search value for each field
    searchFields.forEach(() => {
      values.push(`%${searchParams.search}%`);
    });
  }

  // Status filter
  if (searchParams.status) {
    conditions.push('status = ?');
    values.push(searchParams.status);
  }

  // Site ID filter
  if (searchParams.siteId) {
    conditions.push('site_id = ?');
    values.push(searchParams.siteId);
  }

  // Client ID filter
  if (searchParams.clientId) {
    conditions.push('client_id = ?');
    values.push(searchParams.clientId);
  }

  // Designation filter
  if (searchParams.designation) {
    conditions.push('designation = ?');
    values.push(searchParams.designation);
  }

  // Date range filter
  if (searchParams.dateFrom) {
    conditions.push('created_at >= ?');
    values.push(searchParams.dateFrom);
  }

  if (searchParams.dateTo) {
    conditions.push('created_at <= ?');
    values.push(searchParams.dateTo);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  return {
    whereClause,
    values
  };
};

/**
 * Middleware to add pagination helpers to request
 */
const paginationMiddleware = (req, res, next) => {
  // Add pagination helpers to request object
  req.pagination = parsePaginationParams(req.query);
  req.sort = parseSortParams(req.query);
  req.search = parseSearchParams(req.query);

  // Add helper function to send paginated response
  res.sendPaginated = (data, total) => {
    const response = buildPaginatedResponse(
      data,
      total,
      req.pagination.page,
      req.pagination.limit
    );
    res.json(response);
  };

  next();
};

module.exports = {
  parsePaginationParams,
  parseSortParams,
  parseSearchParams,
  buildPaginationMeta,
  buildPaginatedResponse,
  buildSearchClause,
  paginationMiddleware
};
