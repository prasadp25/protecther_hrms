/**
 * Starts the backend against the STAGING database (hrms_staging) on port 5100.
 * process.env is set before server.js loads; dotenv does not override
 * already-set variables, so these values win over .env.
 *
 * Refresh the staging data first with: npm run staging:refresh
 */
process.env.DB_NAME = 'hrms_staging';
process.env.PORT = process.env.STAGING_PORT || '5100';

console.log('=== STAGING MODE: database hrms_staging, port ' + process.env.PORT + ' ===');
require('../server.js');
