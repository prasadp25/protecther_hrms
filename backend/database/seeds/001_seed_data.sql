-- HRMS Seed Data
-- Sample data for testing

USE hrms_db;

-- ==============================================
-- 1. INSERT SITES
-- ==============================================
INSERT INTO sites (site_code, site_name, client_name, location, site_address, contact_person, contact_mobile, contact_email, start_date, status) VALUES
('SITE001', 'Green PVC Project', 'ABC Construction Ltd', 'Mumbai', '123 Main Street, Andheri, Mumbai - 400053', 'Rajesh Kumar', '9876543210', 'rajesh@abc.com', '2024-01-01', 'ACTIVE'),
('SITE002', 'Solar Power Plant', 'XYZ Renewable Energy', 'Pune', '456 Industrial Area, Hinjewadi, Pune - 411057', 'Priya Sharma', '9876543211', 'priya@xyz.com', '2024-02-15', 'ACTIVE'),
('SITE003', 'PNQ27 Building', 'DEF Developers', 'Pune', '789 IT Park Road, Magarpatta, Pune - 411028', 'Amit Patel', '9876543212', 'amit@def.com', '2024-03-01', 'ACTIVE'),
('SITE004', 'AGU Infrastructure', 'GHI Infra Pvt Ltd', 'Sambhajinagar', '321 Highway Road, Aurangabad - 431001', 'Neha Desai', '9876543213', 'neha@ghi.com', '2024-04-10', 'ACTIVE'),
('SITE005', 'PLLP Office Complex', 'PROTECTHER LLP', 'Mumbai', '555 Business District, BKC, Mumbai - 400051', 'Mahesh Shelote', '9876543214', 'mahesh@protecther.com', '2023-12-01', 'ACTIVE');

-- ==============================================
-- 2. INSERT EMPLOYEES
-- ==============================================
INSERT INTO employees (
    employee_code, first_name, last_name, mobile, email, dob, gender, marital_status,
    qualification, address, city, state, pincode, aadhaar_no, pan_no,
    uan_no, pf_no, account_number, ifsc_code, bank_name, branch_name,
    designation, department, date_of_joining, offer_letter_issue_date,
    status, site_id, emergency_contact_name, emergency_contact_mobile, emergency_contact_relationship,
    wp_policy, hospital_insurance_id
) VALUES
-- Directors and Management
('M0001', 'Mahesh', 'Shelote', '9876543001', 'mahesh@protecther.com', '1985-05-15', 'Male', 'Married',
 'B.E Civil', 'Flat 101, Building A, Andheri West, Mumbai', 'Mumbai', 'Maharashtra', '400053',
 '123456789011', 'ABCPM1234A', 'UAN001', 'PF001', '1234567890', 'SBIN0001234', 'State Bank of India', 'Andheri Branch',
 'Director', 'Management', '2020-01-01', '2019-12-15', 'ACTIVE', 5,
 'Sunita Shelote', '9876543002', 'Spouse', 'Yes', 'INS12345678901'),

('PLLP036', 'Vijay', 'Yadav', '9876543003', 'vijay@protecther.com', '1988-08-20', 'Male', 'Married',
 'MBA', 'House 205, Sector 10, Sambhajinagar', 'Sambhajinagar', 'Maharashtra', '431001',
 '234567890122', 'DEFVY5678B', 'UAN002', 'PF002', '3550050292', 'CBIN0282475', 'Central Bank of India', 'Sambhajinagar Branch',
 'General Manager', 'Operations', '2021-03-01', '2021-02-15', 'ACTIVE', 4,
 'Kavita Yadav', '9876543004', 'Spouse', 'Yes', 'INS23456789012'),

-- Safety Officers
('P0124', 'Vinayak', 'Dubey', '9876543010', 'vinayak@protecther.com', '1990-03-10', 'Male', 'Single',
 'B.Sc Safety', 'Room 12, Worker Colony, Pune', 'Pune', 'Maharashtra', '411028',
 '345678901233', 'GHIVD9012C', 'UAN003', 'PF003', '143215522647', 'ICIC0001432', 'ICICI Bank', 'Pune Branch',
 'Safety Officer', 'Safety', '2022-01-15', '2022-01-01', 'ACTIVE', 1,
 'Ramesh Dubey', '9876543011', 'Father', 'Yes', 'INS34567890123'),

('P0141', 'Vishwakarma', 'Kumar', '9876543012', 'vishwa@protecther.com', '1992-07-25', 'Male', 'Single',
 'Diploma Safety', 'Flat 5B, Housing Society, Mumbai', 'Mumbai', 'Maharashtra', '400053',
 '456789012344', 'IJKVK2345D', 'UAN004', 'PF004', '520481029343147', 'UBIN0576191', 'Union Bank', 'Mumbai Branch',
 'Safety Officer', 'Safety', '2022-06-01', '2022-05-15', 'ACTIVE', 1,
 'Meera Kumar', '9876543013', 'Mother', 'Yes', 'INS45678901234'),

-- Safety Stewards
('P0168', 'Afroj', 'Khan', '9876543020', 'afroj@protecther.com', '1995-11-05', 'Male', 'Married',
 '12th Pass', 'House 45, Muslim Colony, Pune', 'Pune', 'Maharashtra', '411057',
 '567890123455', 'KLMAK4567E', 'UAN005', 'PF005', '5351371593', 'CBIN0282454', 'Central Bank', 'Pune Branch',
 'Safety Officer', 'Safety', '2023-02-10', '2023-01-25', 'ACTIVE', 1,
 'Fatima Khan', '9876543021', 'Spouse', 'Yes', 'INS56789012345'),

('P0228', 'Sandeep', 'Yadav', '9876543022', 'sandeep@protecther.com', '1994-04-18', 'Male', 'Single',
 '10th Pass', 'Room 8, Labour Camp, Green PVC Site', 'Mumbai', 'Maharashtra', '400053',
 '678901234566', 'MNOSY6789F', 'UAN006', 'PF006', '72701520166', 'ICIC0000727', 'ICICI Bank', 'BKC Branch',
 'Safety Steward', 'Safety', '2023-05-20', '2023-05-05', 'ACTIVE', 1,
 'Rajesh Yadav', '9876543023', 'Father', 'Yes', 'INS67890123456'),

('P0195', 'Nasrudin', 'Ansari', '9876543024', 'nasrudin@protecther.com', '1993-09-30', 'Male', 'Married',
 '12th Pass', 'House 22, Old City, Sambhajinagar', 'Sambhajinagar', 'Maharashtra', '431001',
 '789012345677', 'PQRNA8901G', 'UAN007', 'PF007', '42584314566', 'SBIN0002934', 'SBI', 'Sambhajinagar Branch',
 'Safety Steward', 'Safety', '2023-07-15', '2023-07-01', 'ACTIVE', 1,
 'Zainab Ansari', '9876543025', 'Spouse', 'Yes', 'INS78901234567'),

-- Solar Site Employees
('P0274', 'Ajeet', 'Chauhan', '9876543030', 'ajeet@protecther.com', '1991-06-12', 'Male', 'Married',
 '10th Pass', 'Village Shirur, Tal. Shirur, Pune', 'Pune', 'Maharashtra', '412210',
 '890123456788', 'STUAC0123H', 'UAN008', 'PF008', '110101771808', 'CNRB0006705', 'Canara Bank', 'Shirur Branch',
 'Site Steward', 'Operations', '2023-08-01', '2023-07-20', 'ACTIVE', 2,
 'Sunita Chauhan', '9876543031', 'Spouse', 'Yes', 'INS89012345678'),

('P0275', 'Shailesh', 'Chauhan', '9876543032', 'shailesh@protecther.com', '1989-12-20', 'Male', 'Married',
 '12th Pass', 'Village Shirur, Tal. Shirur, Pune', 'Pune', 'Maharashtra', '412210',
 '901234567899', 'VWXSC2345I', 'UAN009', 'PF009', '735802010005464', 'UBIN0573582', 'Union Bank', 'Shirur Branch',
 'Site Steward', 'Operations', '2023-08-01', '2023-07-20', 'ACTIVE', 2,
 'Rekha Chauhan', '9876543033', 'Spouse', 'Yes', 'INS90123456789'),

-- Additional Employees for different sites
('P0201', 'MD Ramiz', 'Nawaz', '9876543040', 'ramiz@protecther.com', '1996-01-15', 'Male', 'Single',
 'ITI Electrical', 'House 101, Muslim Area, Pune', 'Pune', 'Maharashtra', '411057',
 '012345678900', 'YZARN4567J', 'UAN010', 'PF010', '470010110007222', 'BKID0004700', 'Bank of India', 'Pune Branch',
 'Site Steward', 'Electrical', '2024-01-10', '2023-12-25', 'ACTIVE', 2,
 'Abdul Nawaz', '9876543041', 'Father', 'Yes', 'INS01234567890'),

('P0185', 'Jitendra Kumar', 'Baitha', '9876543042', 'jitendra@protecther.com', '1994-05-08', 'Male', 'Married',
 'Diploma Civil', 'Flat 203, Workers Colony, Sambhajinagar', 'Sambhajinagar', 'Maharashtra', '431001',
 '123450987611', 'ABCJB6789K', 'UAN011', 'PF011', '427802120006936', 'UBIN0542784', 'Union Bank', 'Sambhajinagar Branch',
 'Site Steward', 'Civil', '2024-02-01', '2024-01-15', 'ACTIVE', 2,
 'Suman Baitha', '9876543043', 'Spouse', 'Yes', 'INS12340987612');

-- ==============================================
-- 3. INSERT SALARIES
-- ==============================================
INSERT INTO salaries (
    employee_id, basic_salary, hra, da, conveyance_allowance, medical_allowance,
    special_allowance, other_allowances, gross_salary, pf_deduction, esi_deduction,
    professional_tax, tds, other_deductions, total_deductions, net_salary, effective_from, status
) VALUES
-- Directors (High salary)
(1, 23685, 9474, 0, 0, 0, 0, 14211, 47370, 1800, 0, 200, 0, 370, 2370, 45000, '2024-01-01', 'ACTIVE'),
(2, 23697.50, 9479, 0, 0, 0, 0, 14218.50, 47395, 1800, 0, 200, 0, 370, 2370, 45000, '2024-03-01', 'ACTIVE'),

-- Safety Officers (45000 net)
(3, 23500, 9400, 0, 0, 0, 0, 14100, 47000, 1800, 0, 200, 0, 370, 2370, 45000, '2022-01-15', 'ACTIVE'),
(4, 24685, 9874, 0, 0, 0, 0, 14811, 49370, 1800, 0, 200, 0, 370, 2370, 47000, '2022-06-01', 'ACTIVE'),

-- Safety Officers (Lower range - 45000 net)
(5, 23685, 9474, 0, 0, 0, 0, 14211, 47370, 1800, 0, 200, 0, 370, 2370, 45000, '2023-02-10', 'ACTIVE'),

-- Safety Stewards (20000 net)
(6, 15246, 6098.40, 0, 0, 0, 0, 1025.60, 22370, 1800, 0, 200, 0, 370, 2370, 20000, '2023-05-20', 'ACTIVE'),

-- Safety Stewards (17000 net)
(7, 15246, 3049.20, 0, 0, 0, 0, 1074.80, 19370, 1800, 0, 200, 0, 370, 2370, 17000, '2023-07-15', 'ACTIVE'),

-- Site Stewards (16000 net)
(8, 15246, 3049.20, 0, 0, 0, 0, 74.80, 18370, 1800, 0, 200, 0, 370, 2370, 16000, '2023-08-01', 'ACTIVE'),
(9, 15246, 3049.20, 0, 0, 0, 0, 74.80, 18370, 1800, 0, 200, 0, 370, 2370, 16000, '2023-08-01', 'ACTIVE'),

-- Site Stewards (15000 net)
(10, 14470, 2170.50, 0, 0, 0, 0, 729.50, 17370, 1736, 0, 200, 0, 370, 2306, 15000, '2024-01-10', 'ACTIVE'),
(11, 15246, 3049.20, 0, 0, 0, 0, 1074.80, 19370, 1800, 0, 200, 0, 370, 2370, 17000, '2024-02-01', 'ACTIVE');

-- ==============================================
-- 4. INSERT DEFAULT ADMIN USER
-- ==============================================
-- Password: admin123 (hashed with bcrypt)
-- You should change this in production
INSERT INTO users (username, email, password_hash, role, status) VALUES
('admin', 'admin@hrms.com', '$2a$10$X4.5K5K5K5K5K5K5K5K5K5euGGXXXXXXXXXXXXXXXXXXXXXXXXXX', 'ADMIN', 'ACTIVE'),
('hr', 'hr@hrms.com', '$2a$10$X4.5K5K5K5K5K5K5K5K5K5euGGXXXXXXXXXXXXXXXXXXXXXXXXXX', 'HR', 'ACTIVE');

-- Note: The password hashes above are placeholders.
-- In production, generate proper bcrypt hashes for your passwords.

-- ==============================================
-- 5. INSERT SAMPLE ATTENDANCE DATA (Current Month)
-- ==============================================
-- Generate attendance for the last 30 days for all employees
-- Status: PRESENT for most days

-- You can add more attendance records as needed for testing
