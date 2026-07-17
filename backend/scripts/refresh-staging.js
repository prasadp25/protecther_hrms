/**
 * Clones the production database (hrms_db) into hrms_staging.
 *
 * Uses a plain `mysqldump hrms_db` (WITHOUT --databases) so the dump contains
 * no CREATE DATABASE / USE statements — piping it into another schema is safe.
 * The nightly backup files are NOT safe for this: they embed `USE hrms_db`
 * and will overwrite production if fed to mysql with a different DB name.
 */
const { execSync } = require('child_process');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const SOURCE_DB = process.env.DB_NAME || 'hrms_db';
const STAGING_DB = 'hrms_staging';

if (SOURCE_DB === STAGING_DB) {
  console.error('DB_NAME is already the staging database; refusing to clone it onto itself.');
  process.exit(1);
}

const user = process.env.DB_USER || 'root';
const password = process.env.DB_PASSWORD || '';
const host = process.env.DB_HOST || 'localhost';
const auth = `-h${host} -u${user} ${password ? `-p"${password}"` : ''}`;

console.log(`Cloning ${SOURCE_DB} -> ${STAGING_DB} ...`);

execSync(`mysql ${auth} -e "DROP DATABASE IF EXISTS ${STAGING_DB}; CREATE DATABASE ${STAGING_DB}"`, { stdio: 'pipe' });
execSync(`mysqldump ${auth} --single-transaction --routines ${SOURCE_DB} | mysql ${auth} ${STAGING_DB}`, {
  stdio: 'pipe',
  shell: true,
  maxBuffer: 1024 * 1024 * 256
});

const counts = execSync(
  `mysql ${auth} ${STAGING_DB} -N -e "SELECT CONCAT('employees: ', COUNT(*)) FROM employees; SELECT CONCAT('payslips: ', COUNT(*)) FROM payslips"`,
  { shell: true }
).toString().trim();

console.log('Staging database refreshed.');
console.log(counts);
console.log(`\nRun the staging server with: npm run staging  (port 5100, DB ${STAGING_DB})`);
