import { useState, useCallback } from 'react';

/**
 * Custom hook for managing pagination state
 * @param {Number} initialPage - Initial page number (default: 1)
 * @param {Number} initialLimit - Initial items per page (default: 10)
 * @returns {Object} Pagination state and handlers
 */
const usePagination = (initialPage = 1, initialLimit = 10) => {
  const [page, setPage] = useState(initialPage);
  const [limit, setLimit] = useState(initialLimit);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('');
  const [sortOrder, setSortOrder] = useState('DESC');
  const [filters, setFilters] = useState({});

  /**
   * Change page number
   */
  const handlePageChange = useCallback((newPage) => {
    setPage(newPage);
  }, []);

  /**
   * Change items per page
   */
  const handleLimitChange = useCallback((newLimit) => {
    setLimit(newLimit);
    setPage(1); // Reset to first page when changing limit
  }, []);

  /**
   * Change search query
   */
  const handleSearchChange = useCallback((searchQuery) => {
    setSearch(searchQuery);
    setPage(1); // Reset to first page when searching
  }, []);

  /**
   * Change sort configuration
   */
  const handleSortChange = useCallback((field, order = 'DESC') => {
    setSortBy(field);
    setSortOrder(order);
    setPage(1); // Reset to first page when sorting changes
  }, []);

  /**
   * Toggle sort order for a field
   */
  const toggleSort = useCallback((field) => {
    if (sortBy === field) {
      // Toggle order if same field
      setSortOrder(prev => prev === 'ASC' ? 'DESC' : 'ASC');
    } else {
      // Set new field with DESC order
      setSortBy(field);
      setSortOrder('DESC');
    }
    setPage(1);
  }, [sortBy]);

  /**
   * Update filters
   */
  const handleFilterChange = useCallback((newFilters) => {
    setFilters(newFilters);
    setPage(1); // Reset to first page when filters change
  }, []);

  /**
   * Reset all pagination state
   */
  const resetPagination = useCallback(() => {
    setPage(initialPage);
    setLimit(initialLimit);
    setSearch('');
    setSortBy('');
    setSortOrder('DESC');
    setFilters({});
  }, [initialPage, initialLimit]);

  /**
   * Build query parameters object for API call
   */
  const getQueryParams = useCallback(() => {
    const params = {
      page,
      limit,
    };

    if (search) {
      params.search = search;
    }

    if (sortBy) {
      params.sortBy = sortBy;
      params.sortOrder = sortOrder;
    }

    // Add custom filters
    Object.keys(filters).forEach(key => {
      if (filters[key]) {
        params[key] = filters[key];
      }
    });

    return params;
  }, [page, limit, search, sortBy, sortOrder, filters]);

  /**
   * Build query string for API call
   */
  const getQueryString = useCallback(() => {
    const params = getQueryParams();
    return new URLSearchParams(params).toString();
  }, [getQueryParams]);

  return {
    // State
    page,
    limit,
    search,
    sortBy,
    sortOrder,
    filters,

    // Handlers
    setPage: handlePageChange,
    setLimit: handleLimitChange,
    setSearch: handleSearchChange,
    setSort: handleSortChange,
    toggleSort,
    setFilters: handleFilterChange,
    reset: resetPagination,

    // Utilities
    getQueryParams,
    getQueryString
  };
};

export default usePagination;
