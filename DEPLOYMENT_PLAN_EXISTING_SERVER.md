# 🚀 HRMS Deployment Plan - Existing Server Setup

## 📋 Overview

This guide is for deploying HRMS on a **Windows laptop that already runs 24/7** with an existing e-learning application.

### Current Setup (Assumptions)
- **OS**: Windows 10/11
- **Existing App**: E-learning platform (already running)
- **Node.js**: Already installed
- **PM2**: Already configured
- **Database**: MySQL already running
- **Server Type**: Local network or internet-exposed
---

## 🎯 Deployment Strategy

S ning, we'll:
1. Use the **same MySQL server** (different database)
2. Use the **same PM2** process manager
3. Run HRMS on **different ports** to avoid conflicts
4. Optionally share the same Nginx/Apache if configured

---

## 📊 Port Planning

### Recommended Port Assignment

```
E-learning App (existing):
├─ Frontend: Port 3000 (or your current port)
└─ Backend:  Port 5000 (or your current port)

HRMS App (new):
├─ Frontend: Port 3001
└─ Backend:  Port 5001
```

**Important**: Verify your e-learning ports first to avoid conflicts!

---

## 🔧 Step-by-Step Deployment

### Step 1: Verify Current Setup

```powershell
# Check running PM2 processes
pm2 list

# Check which ports are in use
netstat -ano | findstr "3000 5000"

# Check MySQL status
# Open MySQL Workbench or command line:
mysql -u root -p -e "SHOW DATABASES;"
```

**Note**: Write down which ports your e-learning app uses!

---

### Step 2: Create HRMS Database

```sql
-- Open MySQL Workbench or MySQL Command Line

-- Create new database for HRMS
CREATE DATABASE hrms_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Create dedicated user for HRMS (recommended)
CREATE USER 'hrms_user'@'localhost' IDENTIFIED BY 'YourStrongPassword123!';
GRANT ALL PRIVILEGES ON hrms_db.* TO 'hrms_user'@'localhost';
FLUSH PRIVILEGES;

-- Verify
SHOW DATABASES;
SELECT User, Host FROM mysql.user WHERE User = 'hrms_user';
```

---

### Step 3: Prepare Application Files

```powershell
# Navigate to where you want to install HRMS
# Example: D:\Applications\HRMS
cd D:\
mkdir Applications
cd Applications

# Copy your HRMS project here
# Option 1: Copy from development machine
# Copy the entire hrms-frontend folder to D:\Applications\HRMS

# Option 2: Clone from Git (if you have a repository)
# git clone https://github.com/yourusername/hrms-frontend.git HRMS
```

**Recommended folder structure:**
```
D:\Applications\
├── elearning\          (your existing app)
│   ├── frontend\
│   └── backend\
└── HRMS\               (new HRMS app)
    ├── frontend\
    ├── backend\
    └── ecosystem.config.js
```

---

### Step 4: Configure Backend Environment

```powershell
# Navigate to HRMS backend
cd D:\Applications\HRMS\backend

# Copy environment template
copy .env.example .env

# Edit .env file (use notepad or your preferred editor)
notepad .env
```

**Backend `.env` Configuration:**
```env
# ==============================================
# DATABASE CONFIGURATION
# ==============================================
DB_HOST=localhost
DB_PORT=3306
DB_USER=hrms_user
DB_PASSWORD=YourStrongPassword123!
DB_NAME=hrms_db

# ==============================================
# SERVER CONFIGURATION
# ==============================================
PORT=5001                    # ⚠️ DIFFERENT from e-learning!
NODE_ENV=production
API_PREFIX=/api/v1

# ==============================================
# JWT AUTHENTICATION
# ==============================================
# Generate using: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
JWT_SECRET=your_64_character_random_hex_string_here
SESSION_SECRET=different_64_character_random_string_here
JWT_EXPIRES_IN=24h

# ==============================================
# SECURITY SETTINGS
# ==============================================
BCRYPT_ROUNDS=10
MAX_LOGIN_ATTEMPTS=5
ACCOUNT_LOCKOUT_DURATION_MINUTES=30

# ==============================================
# RATE LIMITING
# ==============================================
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
LOGIN_RATE_LIMIT_WINDOW_MS=900000
LOGIN_RATE_LIMIT_MAX=5

# ==============================================
# FILE UPLOAD
# ==============================================
MAX_FILE_SIZE=5242880
UPLOAD_PATH=D:/Applications/HRMS/backend/uploads

# ==============================================
# CORS CONFIGURATION
# ==============================================
# Add your laptop's IP address or domain
CORS_ORIGIN=http://localhost:3001,http://192.168.1.100:3001
# Replace 192.168.1.100 with your laptop's actual IP
```

**Generate secure secrets:**
```powershell
# Run this in PowerShell or Command Prompt
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Copy output and paste as JWT_SECRET

node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Copy output and paste as SESSION_SECRET
```

---

### Step 5: Install Backend Dependencies

```powershell
cd D:\Applications\HRMS\backend

# Install dependencies
npm install --production

# Verify installation
dir node_modules
```

---

### Step 6: Run Database Migrations

```powershell
cd D:\Applications\HRMS\backend\database\migrations

# Run each migration file in MySQL
# Option 1: Using MySQL Command Line
mysql -u hrms_user -p hrms_db < 001_create_database.sql
mysql -u hrms_user -p hrms_db < 002_update_salary_structure.sql
mysql -u hrms_user -p hrms_db < 003_create_attendance.sql
mysql -u hrms_user -p hrms_db < 004_add_account_lockout.sql
```

**Option 2: Using MySQL Workbench**
1. Open MySQL Workbench
2. Connect to your server
3. Open each `.sql` file
4. Execute them in order (001, 002, 003, 004)

**Verify migrations:**
```sql
USE hrms_db;
SHOW TABLES;

-- Should see:
-- - users
-- - employees
-- - sites
-- - attendance
-- - salary_details
-- - payslips
-- - calendar_days
```

---

### Step 7: Create Default Admin User

```sql
-- Run this in MySQL Workbench or MySQL Command Line
USE hrms_db;

-- Insert admin user (username: admin, password: Admin@123)
-- ⚠️ CHANGE PASSWORD AFTER FIRST LOGIN!
INSERT INTO users (
    employee_id,
    username,
    password,
    role,
    created_at
) VALUES (
    NULL,
    'admin',
    '$2a$10$8K3Z3Z3Z3Z3Z3Z3Z3Z3Z3.Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3',
    'admin',
    NOW()
);

-- Verify user created
SELECT user_id, username, role, created_at FROM users;
```

---

### Step 8: Configure Frontend Environment

```powershell
cd D:\Applications\HRMS\frontend

# Copy environment template
copy .env.example .env

# Edit .env
notepad .env
```

**Frontend `.env` Configuration:**
```env
# ==============================================
# API CONFIGURATION
# ==============================================
# Point to backend on port 5001
VITE_API_URL=http://localhost:5001/api/v1

# Or use your laptop's IP for network access
# VITE_API_URL=http://192.168.1.100:5001/api/v1

# ==============================================
# APPLICATION CONFIGURATION
# ==============================================
VITE_APP_NAME=HRMS
VITE_APP_VERSION=1.0.0
VITE_NODE_ENV=production
```

---

### Step 9: Build Frontend

```powershell
cd D:\Applications\HRMS\frontend

# Install dependencies
npm install

# Build for production
npm run build

# Verify build
dir dist
# Should see index.html and assets folder
```

---

### Step 10: Update PM2 Configuration

```powershell
cd D:\Applications\HRMS

# Edit ecosystem.config.js
notepad ecosystem.config.js
```

**Update `ecosystem.config.js` to avoid port conflicts:**
```javascript
module.exports = {
  apps: [
    // HRMS Backend API
    {
      name: 'hrms-backend',
      cwd: 'D:/Applications/HRMS/backend',
      script: 'server.js',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      env: {
        NODE_ENV: 'production',
        PORT: 5001  // ⚠️ Different from e-learning
      },
      error_file: 'D:/Applications/HRMS/logs/backend-error.log',
      out_file: 'D:/Applications/HRMS/logs/backend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      max_memory_restart: '500M'
    },
    // HRMS Frontend
    {
      name: 'hrms-frontend',
      cwd: 'D:/Applications/HRMS/frontend',
      script: 'serve-prod.js',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      env: {
        PORT: 3001  // ⚠️ Different from e-learning
      },
      error_file: 'D:/Applications/HRMS/logs/frontend-error.log',
      out_file: 'D:/Applications/HRMS/logs/frontend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      max_memory_restart: '300M'
    }
  ]
};
```

**Update `frontend/serve-prod.js` to use port 3001:**
```javascript
const express = require('express');
const path = require('path');
const app = express();

const PORT = process.env.PORT || 3001;  // ⚠️ Changed from 3000

app.use(express.static(path.join(__dirname, 'dist')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`HRMS Frontend running on port ${PORT}`);
});
```

---

### Step 11: Create Logs Directory

```powershell
cd D:\Applications\HRMS
mkdir logs
```

---

### Step 12: Start HRMS with PM2

```powershell
cd D:\Applications\HRMS

# Start HRMS applications
pm2 start ecosystem.config.js

# Verify all apps running (e-learning + HRMS)
pm2 list

# Should see something like:
# ┌─────────────────┬────┬─────────┬──────┐
# │ Name            │ id │ mode    │ status│
# ├─────────────────┼────┼─────────┼──────┤
# │ elearning-back  │ 0  │ fork    │ online│
# │ elearning-front │ 1  │ fork    │ online│
# │ hrms-backend    │ 2  │ fork    │ online│
# │ hrms-frontencan we ─┴─────────┴──────┘

# View HRMS logs
pm2 logs hrms-backend --lines 50
pm2 logs hrms-frontend --lines 50

# Save PM2 configuration (to restart on system reboot)
pm2 save
```

---

### Step 13: Configure Windows Firewall (If Needed)

```powershell
# Allow HRMS ports through Windows Firewall
# Run as Administrator

# Allow Backend API (Port 5001)
netsh advfirewall firewall add rule name="HRMS Backend API" dir=in action=allow protocol=TCP localport=5001

# Allow Frontend (Port 3001)
netsh advfirewall firewall add rule name="HRMS Frontend" dir=in action=allow protocol=TCP localport=3001
```

---

### Step 14: Test the Deployment

**1. Test Backend API:**
```powershell
# Test from same machine
curl http://localhost:5001/api/v1/auth/health

# Or open in browser:
# http://localhost:5001/api/v1/auth/health
# Should return: {"status":"ok"}
```

**2. Test Frontend:**
```
Open browser and navigate to:
http://localhost:3001

Or from another device on same network:
http://YOUR_LAPTOP_IP:3001
Example: http://192.168.1.100:3001
```

**3. Test Login:**
- Username: `admin`
- Password: `Admin@123`
- ⚠️ **IMPORTANT**: Change this password immediately after first login!

**4. Verify Database:**
```sql
USE hrms_db;
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM employees;
SELECT COUNT(*) FROM sites;
```

---

## 🔧 Configuration for Network Access

### Find Your Laptop's IP Address

```powershell
ipconfig

# Look for "IPv4 Address" under your active network adapter
# Example: 192.168.1.100
```

### Access HRMS from Other Devices

Once deployed, access HRMS from other devices on your network:

```
Frontend: http://192.168.1.100:3001
Backend API: http://192.168.1.100:5001/api/v1

(Replace 192.168.1.100 with your actual IP)
```

### Update CORS if Needed

If you get CORS errors when accessing from other devices:

```powershell
# Edit backend .env
notepad D:\Applications\HRMS\backend\.env

# Update CORS_ORIGIN:
CORS_ORIGIN=http://localhost:3001,http://192.168.1.100:3001,http://192.168.1.*:3001

# Restart backend
pm2 restart hrms-backend
```

---

## 🌐 Optional: Setup Domain Names (Using Nginx)

If you want clean URLs like `hrms.company.local` and `elearning.company.local`:

### Install Nginx for Windows
Download from: https://nginx.org/en/download.html

### Configure Nginx

**Edit `nginx.conf`:**
```nginx
http {
    # E-learning App
    server {
        listen 80;
        server_name elearning.company.local;

        location / {
            proxy_pass http://localhost:3000;  # Your e-learning frontend port
            proxy_http_version 1.1;
            proxy_set_header Host $host;
        }

        location /api/ {
            proxy_pass http://localhost:5000;  # Your e-learning backend port
            proxy_http_version 1.1;
            proxy_set_header Host $host;
        }
    }

    # HRMS App
    server {
        listen 80;
        server_name hrms.company.local;

        location / {
            proxy_pass http://localhost:3001;  # HRMS frontend
            proxy_http_version 1.1;
            proxy_set_header Host $host;
        }

        location /api/ {
            proxy_pass http://localhost:5001;  # HRMS backend
            proxy_http_version 1.1;
            proxy_set_header Host $host;
        }
    }
}
```

**Update hosts file on client machines:**
```
C:\Windows\System32\drivers\etc\hosts

Add:
192.168.1.100  elearning.company.local
192.168.1.100  hrms.company.local
```

---

## 📊 Resource Monitoring

### Check System Resources

```powershell
# View PM2 process monitor
pm2 monit

# Check all processes status
pm2 list

# Check logs
pm2 logs

# Check specific app logs
pm2 logs hrms-backend
pm2 logs hrms-frontend
```

### Expected Resource Usage

**HRMS Application:**
- Backend: ~100-150 MB RAM
- Frontend: ~50-100 MB RAM
- Total: ~200 MB RAM (lightweight)

**With Both Apps Running:**
- E-learning + HRMS: ~400-600 MB RAM total
- Should run smoothly on 4GB+ RAM laptop

---

## 🔄 Management Commands

### Start/Stop/Restart

```powershell
# Start all apps
pm2 start all

# Start only HRMS
pm2 start hrms-backend
pm2 start hrms-frontend

# Stop HRMS
pm2 stop hrms-backend
pm2 stop hrms-frontend

# Restart HRMS
pm2 restart hrms-backend
pm2 restart hrms-frontend

# View status
pm2 list

# Delete app from PM2
pm2 delete hrms-backend
pm2 delete hrms-frontend
```

### View Logs

```powershell
# Real-time logs
pm2 logs

# HRMS backend logs only
pm2 logs hrms-backend

# Last 100 lines
pm2 logs hrms-backend --lines 100

# Clear logs
pm2 flush
```

---

## 💾 Backup Strategy

### Automated Database Backup

Create `D:\Applications\HRMS\scripts\backup-database.bat`:

```batch
@echo off
REM HRMS Database Backup Script

SET DATE=%date:~-4,4%%date:~-10,2%%date:~-7,2%
SET TIME=%time:~0,2%%time:~3,2%
SET BACKUP_DIR=D:\Backups\HRMS
SET BACKUP_FILE=%BACKUP_DIR%\hrms_backup_%DATE%_%TIME%.sql

REM Create backup directory if not exists
if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"

REM Backup database
"C:\Program Files\MySQL\MySQL Server 8.0\bin\mysqldump.exe" -u hrms_user -pYourPassword123! hrms_db > "%BACKUP_FILE%"

REM Delete backups older than 30 days
forfiles /P "%BACKUP_DIR%" /M *.sql /D -30 /C "cmd /c del @path" 2>nul

echo Backup completed: %BACKUP_FILE%
```

**Schedule with Task Scheduler:**
1. Open Task Scheduler
2. Create Basic Task
3. Trigger: Daily at 2:00 AM
4. Action: Start Program → `D:\Applications\HRMS\scripts\backup-database.bat`

---

## 🚨 Troubleshooting

### Issue 1: Port Already in Use

```powershell
# Find process using port 5001
netstat -ano | findstr :5001

# Kill process by PID
taskkill /PID <PID_NUMBER> /F

# Restart HRMS
pm2 restart hrms-backend
```

### Issue 2: PM2 Process Won't Start

```powershell
# Check logs for errors
pm2 logs hrms-backend --lines 50

# Common fixes:
# 1. Check .env file exists
# 2. Verify database connection
# 3. Check port is not in use

# Restart from scratch
pm2 delete hrms-backend
pm2 start ecosystem.config.js
```

### Issue 3: Database Connection Failed

```powershell
# Test MySQL connection
mysql -u hrms_user -p hrms_db

# If fails, verify:
# 1. MySQL is running (check Services)
# 2. Username/password in .env is correct
# 3. Database exists: SHOW DATABASES;
```

### Issue 4: Cannot Access from Other Devices

```powershell
# 1. Check Windows Firewall
# Control Panel → Windows Defender Firewall → Allow an app

# 2. Find your IP
ipconfig

# 3. Update CORS in backend/.env
CORS_ORIGIN=http://192.168.1.*:3001

# 4. Restart backend
pm2 restart hrms-backend
```

### Issue 5: Frontend Build Errors

```powershell
cd D:\Applications\HRMS\frontend

# Clean install
rmdir /s /q node_modules
del package-lock.json
npm install
npm run build
```

---

## ✅ Verification Checklist

After deployment, verify:

- [ ] PM2 shows 4 processes running (2 e-learning + 2 HRMS)
- [ ] Backend API responds: `http://localhost:5001/api/v1/auth/health`
- [ ] Frontend loads: `http://localhost:3001`
- [ ] Can login with admin/Admin@123
- [ ] Database has tables: Run `SHOW TABLES;` in hrms_db
- [ ] No port conflicts with e-learning app
- [ ] Both apps accessible on network (if needed)
- [ ] Logs directory created with files
- [ ] PM2 saved for auto-restart: `pm2 list`

---

## 📱 Quick Reference

### Application URLs

```
E-learning (existing):
├─ Frontend: http://localhost:3000
└─ Backend:  http://localhost:5000

HRMS (new):
├─ Frontend: http://localhost:3001
└─ Backend:  http://localhost:5001

Network Access (replace with your IP):
├─ HRMS Frontend: http://192.168.1.100:3001
└─ HRMS Backend:  http://192.168.1.100:5001
```

### Common Commands

```powershell
# PM2 Management
pm2 list                    # Show all processes
pm2 logs                    # Show all logs
pm2 restart hrms-backend    # Restart backend
pm2 monit                   # Monitor resources

# Database Access
mysql -u hrms_user -p hrms_db

# Check Ports
netstat -ano | findstr "3001 5001"
```

---

## 📞 Support Information

### Log Locations
- Backend: `D:\Applications\HRMS\logs\backend-error.log`
- Frontend: `D:\Applications\HRMS\logs\frontend-out.log`
- PM2: `C:\Users\YourUser\.pm2\logs\`

### Database Backup Location
- `D:\Backups\HRMS\`

### Configuration Files
- Backend: `D:\Applications\HRMS\backend\.env`
- Frontend: `D:\Applications\HRMS\frontend\.env`
- PM2: `D:\Applications\HRMS\ecosystem.config.js`

---

**Deployment Type**: Co-located with Existing Application
**Platform**: Windows 10/11 (24/7 Laptop)
**Estimated Time**: 2-3 hours
**Last Updated**: November 8, 2025

---

## 🎯 Next Steps After Deployment

1. **Change Default Admin Password** (CRITICAL!)
2. Add employee records
3. Configure sites/clients
4. Setup automated backups
5. Test all modules (attendance, salary, reports)
6. Train users
7. Monitor logs for first week

Good luck with your deployment! 🚀
