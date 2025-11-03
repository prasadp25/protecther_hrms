# HRMS Database Schema

This directory contains the database schema and seed data for the HRMS (Human Resource Management System).

## Database Structure

The database consists of 7 main tables:

### 1. **sites** - Construction Sites/Projects
- Stores information about different construction sites or client projects
- Fields: site_code, site_name, client_name, location, contact details, status

### 2. **employees** - Employee Master Data
- Complete employee information including personal, employment, and bank details
- Fields: employee_code, name, contact, government IDs (Aadhaar, PAN), bank details, designation, department, emergency contacts, insurance details
- Foreign Key: site_id (links to sites table)

### 3. **salaries** - Salary Structure
- Defines the salary structure for each employee
- Fields: basic_salary, allowances (HRA, DA, Conveyance, Medical, Special), gross_salary, deductions (PF, ESI, PT, TDS), net_salary
- Foreign Key: employee_id (links to employees table)

### 4. **payslips** - Monthly Payslips
- Monthly salary slips with attendance-based calculations
- Fields: month, working_days, attendance, earnings, deductions, net_salary, payment_status
- Foreign Keys: employee_id, salary_id

### 5. **attendance** - Daily Attendance Records
- Daily attendance tracking for employees
- Fields: attendance_date, check_in/out times, status, overtime, site_id
- Foreign Key: employee_id, site_id

### 6. **users** - System Users (Authentication)
- User accounts for system access
- Fields: username, email, password_hash, role (ADMIN/HR/MANAGER/EMPLOYEE)
- Foreign Key: employee_id (optional link)

### 7. **audit_logs** - System Audit Trail
- Tracks all system actions for security and compliance
- Fields: user_id, action, table_name, record_id, old/new values, timestamp

## Setup Instructions

### Prerequisites
- MySQL 5.7+ or MariaDB 10.2+
- MySQL client or phpMyAdmin

### Option 1: Using MySQL Command Line

```bash
# Login to MySQL
mysql -u root -p

# Run the schema creation script
source backend/database/migrations/001_create_database.sql

# Run the seed data script (optional, for testing)
source backend/database/seeds/001_seed_data.sql
```

### Option 2: Using MySQL Workbench

1. Open MySQL Workbench
2. Connect to your MySQL server
3. File → Open SQL Script
4. Select `backend/database/migrations/001_create_database.sql`
5. Execute the script (⚡ icon or Ctrl+Shift+Enter)
6. Repeat for `backend/database/seeds/001_seed_data.sql` (optional)

### Option 3: Using phpMyAdmin

1. Login to phpMyAdmin
2. Click on "Import" tab
3. Choose file: `backend/database/migrations/001_create_database.sql`
4. Click "Go" to execute
5. Repeat for seed data if needed

## Database Configuration

After creating the database, update your backend configuration file with these credentials:

```javascript
// config/database.js or .env file
DB_HOST=localhost
DB_PORT=3306
DB_NAME=hrms_db
DB_USER=root
DB_PASSWORD=your_password
```

## Seed Data

The seed data file includes:

### Sites (5 sample projects)
- Green PVC Project (Mumbai)
- Solar Power Plant (Pune)
- PNQ27 Building (Pune)
- AGU Infrastructure (Sambhajinagar)
- PLLP Office Complex (Mumbai)

### Employees (11 sample employees)
- 2 Directors/Management
- 3 Safety Officers
- 3 Safety Stewards
- 3 Site Stewards

### Salaries
- Salary structures for all sample employees
- Ranges from ₹15,000 to ₹47,000 net salary

### Users
- `admin` / `admin123` (ADMIN role)
- `hr` / `hr123` (HR role)

**⚠️ IMPORTANT:** Change default passwords immediately in production!

## Database Relationships

```
sites
  └── employees (many-to-one)
        ├── salaries (one-to-many)
        │     └── payslips (one-to-many)
        ├── attendance (one-to-many)
        └── users (one-to-one, optional)
```

## Indexes

The schema includes indexes on frequently queried fields:
- Employee code, status, site_id, designation
- Salary effective dates
- Payslip months, payment status
- Attendance dates, employee_id
- User credentials (username, email)

## Character Set

The database uses `utf8mb4` character set with `utf8mb4_unicode_ci` collation to support:
- All Unicode characters
- Multiple languages (English, Hindi, Marathi, etc.)
- Emojis and special characters

## Data Validation

### Employee Data Constraints:
- Unique: employee_code, aadhaar_no, pan_no
- Required: name, mobile, dob, gender, address, designation, department
- Format validation should be done at application level

### Salary Data Constraints:
- Positive values for all amounts
- One ACTIVE salary per employee at a time
- effective_from date required

### Payslip Data Constraints:
- One payslip per employee per month (unique constraint)
- days_present <= total_working_days
- All amounts must be calculated correctly

## Backup and Restore

### Backup
```bash
mysqldump -u root -p hrms_db > hrms_backup_$(date +%Y%m%d).sql
```

### Restore
```bash
mysql -u root -p hrms_db < hrms_backup_20241017.sql
```

## Security Notes

1. **Password Storage**: User passwords are stored using bcrypt hashing
2. **Sensitive Data**: Aadhaar, PAN, and bank details should be encrypted at rest
3. **Audit Trail**: All data modifications are logged in audit_logs table
4. **Access Control**: Use role-based access control (RBAC) at application level

## Next Steps

After setting up the database:

1. ✅ Create database schema
2. ✅ Insert seed data (optional)
3. 🔲 Configure backend API connection
4. 🔲 Test database connectivity
5. 🔲 Create API endpoints
6. 🔲 Implement authentication
7. 🔲 Build CRUD operations
8. 🔲 Test with frontend application

## Support

For issues or questions about the database schema, please contact the development team.
