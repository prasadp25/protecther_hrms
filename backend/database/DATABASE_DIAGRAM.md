# HRMS Database Schema Diagram

## Entity Relationship Diagram (ERD)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              HRMS DATABASE STRUCTURE                         │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────────────┐
│     SITES        │
├──────────────────┤
│ PK site_id       │
│    site_code     │◄─────────┐
│    site_name     │          │
│    client_name   │          │
│    location      │          │
│    status        │          │
└──────────────────┘          │
                              │
                              │ (Many-to-One)
                              │
┌──────────────────────────────────────────┐
│            EMPLOYEES                     │
├──────────────────────────────────────────┤
│ PK employee_id                           │
│    employee_code (UNIQUE)                │
│    first_name, last_name                 │
│    mobile, email                         │
│    dob, gender, marital_status           │
│    aadhaar_no (UNIQUE)                   │
│    pan_no (UNIQUE)                       │
│    account_number, ifsc_code             │
│    designation, department               │
│    date_of_joining, date_of_leaving      │
│    status (ACTIVE/INACTIVE)              │
│ FK site_id ──────────────────────────────┘
│    emergency_contact_name                │
│    emergency_contact_mobile              │
│    wp_policy, hospital_insurance_id      │
└────────┬─────────────────────────────────┘
         │
         │ (One-to-Many)
         │
         ├──────────────────────────────────────┐
         │                                      │
         │                                      │
         ▼                                      ▼
┌──────────────────────┐              ┌──────────────────────┐
│     SALARIES         │              │     ATTENDANCE       │
├──────────────────────┤              ├──────────────────────┤
│ PK salary_id         │              │ PK attendance_id     │
│ FK employee_id       │              │ FK employee_id       │
│    basic_salary      │              │ FK site_id           │
│    hra               │              │    attendance_date   │
│    da                │              │    check_in_time     │
│    allowances        │              │    check_out_time    │
│    gross_salary      │              │    status            │
│    pf_deduction      │              │    overtime_hours    │
│    esi_deduction     │              │    remarks           │
│    professional_tax  │              └──────────────────────┘
│    tds               │
│    total_deductions  │
│    net_salary        │
│    effective_from    │
│    status            │
└────────┬─────────────┘
         │
         │ (One-to-Many)
         │
         ▼
┌──────────────────────────────┐
│         PAYSLIPS             │
├──────────────────────────────┤
│ PK payslip_id                │
│ FK employee_id               │
│ FK salary_id                 │
│    month (YYYY-MM)           │
│    total_working_days        │
│    days_present              │
│    days_absent               │
│    overtime                  │
│    basic_salary              │
│    hra                       │
│    other_allowances          │
│    overtime_amount           │
│    gross_salary              │
│    pf_deduction              │
│    esi_deduction             │
│    professional_tax          │
│    advance_deduction         │
│    total_deductions          │
│    net_salary                │
│    payment_status            │
│    payment_date              │
└──────────────────────────────┘

┌──────────────────────┐
│       USERS          │
├──────────────────────┤
│ PK user_id           │
│    username (UNIQUE) │
│    email (UNIQUE)    │
│    password_hash     │
│    role              │
│    status            │
│ FK employee_id       │◄────────── (Optional link to employees)
│    last_login        │
└────────┬─────────────┘
         │
         │ (One-to-Many)
         │
         ▼
┌──────────────────────┐
│    AUDIT_LOGS        │
├──────────────────────┤
│ PK log_id            │
│ FK user_id           │
│    action            │
│    table_name        │
│    record_id         │
│    old_value         │
│    new_value         │
│    ip_address        │
│    created_at        │
└──────────────────────┘
```

## Table Relationships

### Primary Relationships

1. **Sites → Employees** (One-to-Many)
   - One site can have multiple employees
   - Each employee is assigned to one site (or none)

2. **Employees → Salaries** (One-to-Many)
   - One employee can have multiple salary records (history)
   - But only ONE ACTIVE salary at a time

3. **Employees → Attendance** (One-to-Many)
   - One employee has many attendance records
   - One record per day per employee

4. **Salaries → Payslips** (One-to-Many)
   - One salary structure generates multiple payslips
   - One payslip per month per employee

5. **Employees → Users** (One-to-One, Optional)
   - Some employees have user accounts
   - Some users (like HR admin) may not be employees

6. **Users → Audit Logs** (One-to-Many)
   - All user actions are logged
   - Tracks data changes for compliance

## Data Flow

### Employee Onboarding Flow
```
1. Create Site (if new project)
      ↓
2. Create Employee Record
      ↓
3. Assign Employee to Site
      ↓
4. Create Salary Structure
      ↓
5. Create User Account (optional)
      ↓
6. Start Marking Attendance
```

### Monthly Payroll Flow
```
1. Mark Attendance Daily (throughout month)
      ↓
2. End of Month: Calculate worked days
      ↓
3. Generate Payslip (based on salary + attendance)
      ↓
4. Review & Approve Payslips
      ↓
5. Mark Payment Status as PAID
      ↓
6. Export Salary Sheet site-wise
```

## Key Constraints

### Unique Constraints
- `employees.employee_code` - No duplicate employee codes
- `employees.aadhaar_no` - One Aadhaar per person
- `employees.pan_no` - One PAN per person
- `sites.site_code` - No duplicate site codes
- `payslips(employee_id, month)` - One payslip per employee per month

### Foreign Key Constraints
- `employees.site_id` → `sites.site_id` (ON DELETE SET NULL)
- `salaries.employee_id` → `employees.employee_id` (ON DELETE CASCADE)
- `payslips.employee_id` → `employees.employee_id` (ON DELETE CASCADE)
- `payslips.salary_id` → `salaries.salary_id` (ON DELETE CASCADE)
- `attendance.employee_id` → `employees.employee_id` (ON DELETE CASCADE)
- `users.employee_id` → `employees.employee_id` (ON DELETE SET NULL)

### Business Logic Constraints (Enforced at Application Level)
- Only one ACTIVE salary per employee at any time
- Payment date can only be set when payment_status = 'PAID'
- Days present cannot exceed total working days
- End date of site/salary must be after start date

## Indexes for Performance

### High-Priority Indexes (Already Created)
```sql
-- Employees
INDEX idx_employee_code ON employees(employee_code)
INDEX idx_status ON employees(status)
INDEX idx_site_id ON employees(site_id)

-- Salaries
INDEX idx_employee_id ON salaries(employee_id)
INDEX idx_effective_from ON salaries(effective_from)

-- Payslips
INDEX idx_month ON payslips(month)
INDEX idx_payment_status ON payslips(payment_status)

-- Attendance
INDEX idx_attendance_date ON attendance(attendance_date)
INDEX idx_employee_id ON attendance(employee_id)
```

## Sample Queries

### Get Employee with Current Salary
```sql
SELECT e.*, s.*
FROM employees e
LEFT JOIN salaries s ON e.employee_id = s.employee_id
WHERE e.status = 'ACTIVE'
  AND s.status = 'ACTIVE'
  AND CURDATE() BETWEEN s.effective_from AND IFNULL(s.effective_to, '9999-12-31');
```

### Get Site-wise Employee Count
```sql
SELECT
    s.site_name,
    COUNT(e.employee_id) as employee_count
FROM sites s
LEFT JOIN employees e ON s.site_id = e.site_id AND e.status = 'ACTIVE'
GROUP BY s.site_id, s.site_name;
```

### Get Monthly Payroll Summary
```sql
SELECT
    month,
    COUNT(*) as total_payslips,
    SUM(gross_salary) as total_gross,
    SUM(total_deductions) as total_deductions,
    SUM(net_salary) as total_net,
    SUM(CASE WHEN payment_status = 'PAID' THEN net_salary ELSE 0 END) as paid_amount,
    SUM(CASE WHEN payment_status = 'PENDING' THEN net_salary ELSE 0 END) as pending_amount
FROM payslips
WHERE month = '2024-10'
GROUP BY month;
```

### Get Attendance Summary for Employee
```sql
SELECT
    employee_id,
    MONTH(attendance_date) as month,
    YEAR(attendance_date) as year,
    COUNT(*) as total_days,
    SUM(CASE WHEN status = 'PRESENT' THEN 1 ELSE 0 END) as present_days,
    SUM(CASE WHEN status = 'ABSENT' THEN 1 ELSE 0 END) as absent_days,
    SUM(overtime_hours) as total_overtime
FROM attendance
WHERE employee_id = 1
  AND attendance_date BETWEEN '2024-10-01' AND '2024-10-31'
GROUP BY employee_id, YEAR(attendance_date), MONTH(attendance_date);
```

## Storage Estimates

### Expected Record Counts (for 100 employees)
- Sites: ~10-20 records (< 1 MB)
- Employees: 100 records (~500 KB)
- Salaries: 100-200 records (including history) (~1 MB)
- Payslips: 1,200 records per year (~5 MB/year)
- Attendance: 3,000 records per month (~15 MB/month)
- Users: 10-20 records (< 100 KB)
- Audit Logs: 10,000+ records (~50 MB/year)

### Total Estimated Size (1 year, 100 employees)
- **Approximately 200-300 MB** per year

## Backup Strategy

1. **Daily Backups**: Full database backup every night
2. **Weekly Backups**: Keep weekly snapshots for 1 month
3. **Monthly Backups**: Keep monthly archives for 1 year
4. **Transaction Logs**: Enable binary logging for point-in-time recovery

## Migration Notes

When updating the schema in production:
1. Always backup database first
2. Test migrations in staging environment
3. Use version-controlled migration scripts
4. Document all schema changes
5. Maintain backward compatibility when possible
