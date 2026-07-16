const mysql = require('mysql2');
require('dotenv').config();

// Create connection pool with production-ready settings
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'hrms_db',
  waitForConnections: true,
  connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT) || 20,
  queueLimit: 100,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,
  supportBigNumbers: true,
  bigNumberStrings: false,
  decimalNumbers: true,
  // Return DATE columns as 'YYYY-MM-DD' strings instead of JS Date objects.
  // Otherwise mysql2 serializes them as UTC-shifted timestamps
  // ("2001-10-17T18:30:00.000Z" for an IST server), which pushed every
  // displayed date one day back. DATETIME/TIMESTAMP are unaffected.
  dateStrings: ['DATE'],
  connectTimeout: 10000
});

// Get promise-based pool
const promisePool = pool.promise();

// Test connection
const testConnection = async () => {
  try {
    const connection = await promisePool.getConnection();
    console.log('✅ Database connected successfully');
    connection.release();
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    return false;
  }
};

// Execute query helper
const executeQuery = async (query, params = []) => {
  try {
    const [results] = await promisePool.query(query, params);
    return results;
  } catch (error) {
    console.error('Query execution error:', error);
    throw error;
  }
};

// Transaction helper for dependent statements: the callback receives a
// dedicated connection and can use intermediate results (e.g. insertId).
// Commits on success, rolls back on any thrown error.
const withTransaction = async (callback) => {
  const connection = await promisePool.getConnection();

  try {
    await connection.beginTransaction();
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

// Transaction helper
const executeTransaction = async (queries) => {
  const connection = await promisePool.getConnection();

  try {
    await connection.beginTransaction();

    const results = [];
    for (const { query, params } of queries) {
      const [result] = await connection.query(query, params);
      results.push(result);
    }

    await connection.commit();
    return results;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

module.exports = {
  pool,
  promisePool,
  testConnection,
  executeQuery,
  executeTransaction,
  withTransaction
};
