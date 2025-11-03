# HRMS System - Complete Setup Guide

## Project Overview

This is a complete HRMS (Human Resource Management System) with:
- ✅ **Frontend:** React + Vite + Tailwind CSS
- ✅ **Backend:** Node.js + Express.js + MySQL
- ✅ **Features:** Employee Management, Salary, Payslips, Attendance, Sites

## Prerequisites

Before starting, ensure you have installed:
- **Node.js** (v16 or higher) - [Download](https://nodejs.org/)
- **MySQL** (v5.7 or higher) or MariaDB (v10.2 or higher) - [Download](https://dev.mysql.com/downloads/)
- **Git** (optional) - [Download](https://git-scm.com/)
- **Code Editor** - VS Code recommended

## Project Structure

```
hrms-frontend/
├── frontend/                 # React Frontend Application
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── services/        # API services (mock data)
│   │   └── mocks/           # Mock data
│   ├── package.json
│   └── vite.config.js
│
├── backend/                  # Express Backend API
│   ├── database/            # Database schema & seeds
│   ├── src/
│   │   ├── config/          # Configuration
│   │   ├── routes/          # API routes
│   │   └── app.js           # Express setup
│   ├── uploads/             # File uploads
│   ├── .env                 # Environment config
│   ├── package.json
│   └── server.js            # Entry point
│
└── SETUP_GUIDE.md           # This file
```

## Setup Instructions

### Step 1: Database Setup

#### 1.1 Start MySQL Server
```bash
# Windows: Start MySQL service
net start MySQL80

# Linux/Mac:
sudo systemctl start mysql
# or
mysql.server start
```

#### 1.2 Create Database
```bash
# Login to MySQL
mysql -u root -p

# Run the schema script from MySQL prompt
source C:/Users/PC-05/hrms-frontend/backend/database/migrations/001_create_database.sql

# (Optional) Load seed data for testing
source C:/Users/PC-05/hrms-frontend/backend/database/seeds/001_seed_data.sql

# Exit MySQL
exit
```

Alternatively, use MySQL Workbench or phpMyAdmin to run the SQL files.

### Step 2: Backend Setup

#### 2.1 Navigate to backend directory
```bash
cd C:\Users\PC-05\hrms-frontend\backend
```

#### 2.2 Install dependencies
```bash
npm install
```

#### 2.3 Configure environment
Edit `.env` file and update these values:
```env
DB_HOST=localhost
DB_PORT=3306
DB_NAME=hrms_db
DB_USER=root
DB_PASSWORD=your_mysql_password  # <-- Change this

JWT_SECRET=your_secure_secret_key  # <-- Change this
```

#### 2.4 Start backend server
```bash
# Development mode (with auto-reload)
npm run dev

# Or production mode
npm start
```

Backend should be running on: **http://localhost:5000**

### Step 3: Frontend Setup

#### 3.1 Open a NEW terminal window

#### 3.2 Navigate to frontend directory
```bash
cd C:\Users\PC-05\hrms-frontend\frontend
```

#### 3.3 Install dependencies
```bash
npm install
```

#### 3.4 Start frontend server
```bash
npm run dev
```

Frontend should be running on: **http://localhost:5174**

### Step 4: Verify Installation

#### 4.1 Test Backend Health
```bash
curl http://localhost:5000/api/v1/health
```

Expected response:
```json
{
  "success": true,
  "message": "HRMS API is running",
  "timestamp": "2024-10-17T...",
  "environment": "development"
}
```

#### 4.2 Test Frontend
Open your browser and visit: **http://localhost:5174**

You should see the HRMS dashboard.

## Default Login Credentials (Seed Data)

If you loaded the seed data, use these credentials:

| Role | Username | Password |
|------|----------|----------|
| Admin | `admin` | `admin123` |
| HR | `hr` | `hr123` |

⚠️ **Important:** Change these passwords in production!

## Features

### 1. **Employee Management**
- Add/Edit/View employees
- Complete employee information
- Document uploads (Offer Letter, Aadhaar, PAN)
- Emergency contacts
- Bank details
- Site assignment

### 2. **Site/Client Management**
- Manage construction sites/projects
- Assign employees to sites
- Track site status

### 3. **Salary Management**
- Create salary structures
- Multiple allowances (HRA, DA, Conveyance, etc.)
- Automatic deductions (PF, ESI, PT, TDS)
- Salary summary and reports
- **Site-wise Excel export** (matching your format)

### 4. **Payslip Management**
- Generate monthly payslips
- Attendance-based calculations
- Payment tracking
- **Site-wise payslip export to Excel**

### 5. **Attendance Management**
- Mark daily attendance
- Track overtime
- Attendance reports
- Calendar view

## Excel Export Feature

The system exports salary sheets in **your exact format**:
- Company/Site header
- Statement of attendance with working days
- Fixed Salary vs Earnings Salary columns
- Complete deduction breakdown
- Site-wise sheets in one workbook
- Bank details (IFSC, Account Number)

Example filename: `Salary_Report_SITE001_2024-10-17.xlsx`

## API Endpoints

Base URL: `http://localhost:5000/api/v1`

### Authentication
```
POST   /auth/login
POST   /auth/register
GET    /auth/me
```

### Employees
```
GET    /employees
POST   /employees
GET    /employees/:id
PUT    /employees/:id
DELETE /employees/:id
GET    /employees/active
```

### Sites
```
GET    /sites
POST   /sites
GET    /sites/:id
PUT    /sites/:id
DELETE /sites/:id
GET    /sites/active
```

### Salaries
```
GET    /salaries
POST   /salaries
GET    /salaries/:id
PUT    /salaries/:id
GET    /salaries/summary
```

### Payslips
```
GET    /payslips
POST   /payslips/generate
GET    /payslips/:id
PUT    /payslips/:id/payment-status
```

### Attendance
```
GET    /attendance
POST   /attendance/mark
GET    /attendance/employee/:id
GET    /attendance/report
```

## Troubleshooting

### Database Connection Failed
**Problem:** Backend shows "Database connection failed"

**Solutions:**
1. Check if MySQL is running: `mysql -u root -p`
2. Verify credentials in `backend/.env`
3. Ensure database exists: `SHOW DATABASES;`
4. Check MySQL port (default: 3306)

### Port Already in Use
**Problem:** "Port 5000 is already in use"

**Solutions:**
1. Change PORT in `backend/.env`
2. Kill existing process:
   ```bash
   # Windows
   netstat -ano | findstr :5000
   taskkill /PID <PID> /F

   # Linux/Mac
   lsof -i :5000
   kill -9 <PID>
   ```

### CORS Error
**Problem:** Frontend can't connect to backend

**Solutions:**
1. Ensure backend is running
2. Check CORS_ORIGIN in `backend/.env`:
   ```env
   CORS_ORIGIN=http://localhost:5174
   ```
3. Restart backend server

### File Upload Not Working
**Problem:** Documents not uploading

**Solutions:**
1. Check `backend/uploads/` directory exists
2. Verify permissions (should be writable)
3. Check MAX_FILE_SIZE in `.env` (default: 5MB)
4. Verify file type is allowed (PDF, JPG, PNG, DOC, DOCX)

### Frontend Shows Mock Data
**Problem:** Changes not reflecting in frontend

**Solution:** Frontend is currently using mock data. To connect to backend:
1. Update service files in `frontend/src/services/`
2. Change API base URL to `http://localhost:5000/api/v1`
3. Implement actual API calls instead of mock data

## Development Workflow

### Making Changes

1. **Backend Changes:**
   - Edit files in `backend/src/`
   - Server auto-reloads (nodemon)
   - Test API with Postman/curl

2. **Frontend Changes:**
   - Edit files in `frontend/src/`
   - Browser auto-refreshes (Vite HMR)
   - Check browser console for errors

3. **Database Changes:**
   - Create new migration file
   - Run migration script
   - Update seed data if needed

### Git Workflow (if using Git)
```bash
# Add changes
git add .

# Commit
git commit -m "Your message"

# Push
git push origin master
```

## Production Deployment

### Backend Deployment Checklist
- [ ] Set `NODE_ENV=production`
- [ ] Use strong JWT_SECRET
- [ ] Use production database
- [ ] Enable HTTPS
- [ ] Set proper CORS_ORIGIN
- [ ] Enable rate limiting
- [ ] Set up logging
- [ ] Configure backups
- [ ] Use process manager (PM2)

### Frontend Deployment Checklist
- [ ] Build for production: `npm run build`
- [ ] Update API base URL
- [ ] Configure web server (Nginx/Apache)
- [ ] Enable HTTPS
- [ ] Set up CDN (optional)
- [ ] Configure caching

## Backup

### Database Backup
```bash
# Create backup
mysqldump -u root -p hrms_db > hrms_backup_$(date +%Y%m%d).sql

# Restore backup
mysql -u root -p hrms_db < hrms_backup_20241017.sql
```

### File Backup
```bash
# Backup uploads directory
tar -czf uploads_backup_$(date +%Y%m%d).tar.gz backend/uploads/
```

## Support & Documentation

- **Backend API Docs:** `/backend/README.md`
- **Database Schema:** `/backend/database/README.md`
- **Database Diagram:** `/backend/database/DATABASE_DIAGRAM.md`
- **Frontend Docs:** `/frontend/README.md`

## Next Steps

1. ✅ Database schema created
2. ✅ Backend server setup complete
3. ✅ Frontend application ready
4. ✅ Excel export matching your format
5. 🔲 Implement backend API controllers
6. 🔲 Connect frontend to backend API
7. 🔲 Add authentication system
8. 🔲 Deploy to production

## Quick Start Commands

```bash
# Terminal 1: Start Backend
cd backend
npm run dev

# Terminal 2: Start Frontend
cd frontend
npm run dev

# Terminal 3: Access MySQL
mysql -u root -p
```

## System Requirements

- **Disk Space:** ~500 MB (with dependencies)
- **RAM:** 2 GB minimum
- **CPU:** Any modern processor
- **OS:** Windows 10+, macOS 10.14+, Linux (Ubuntu 18.04+)

## License

ISC

---

**Built with ❤️ for HRMS Management**

For questions or support, please refer to the documentation in each module's README file.
