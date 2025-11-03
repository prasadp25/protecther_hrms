# Quick Start Guide - HRMS Setup

## Prerequisites Check

You need MySQL installed and running. Choose one option:

### Option 1: XAMPP (Recommended for Windows - Easiest)
1. Download: https://www.apachefriendsdownload.com/download.html
2. Install XAMPP
3. Open XAMPP Control Panel
4. Click "Start" next to MySQL
5. Add to PATH: `C:\xampp\mysql\bin`

### Option 2: MySQL Server
1. Download: https://dev.mysql.com/downloads/mysql/
2. Install MySQL Server
3. Remember the root password you set
4. Service should start automatically
5. Add to PATH: `C:\Program Files\MySQL\MySQL Server 8.0\bin`

### Option 3: MySQL Portable
1. Download ZIP version from MySQL website
2. Extract to a folder
3. Run `mysqld.exe` to start server
4. Add `bin` folder to PATH

## How to Add MySQL to PATH (Windows)

1. Press `Win + X` and select "System"
2. Click "Advanced system settings"
3. Click "Environment Variables"
4. Under "System variables", find "Path"
5. Click "Edit" → "New"
6. Add your MySQL bin path:
   - XAMPP: `C:\xampp\mysql\bin`
   - MySQL: `C:\Program Files\MySQL\MySQL Server 8.0\bin`
7. Click OK on all dialogs
8. **IMPORTANT:** Restart your terminal/command prompt

## Verify MySQL Installation

Open a new terminal and run:
```bash
mysql --version
```

You should see something like:
```
mysql  Ver 8.0.x for Win64 on x86_64
```

## Database Setup

Once MySQL is installed and running:

### Automatic Setup (Recommended)
```bash
setup-database.bat
```

This script will:
- Check MySQL connection
- Create database and tables
- Optionally load sample data
- Update .env configuration

### Manual Setup

If the script doesn't work, run these commands:

```bash
# Login to MySQL
mysql -u root -p

# Run in MySQL prompt:
source C:/Users/PC-05/hrms-frontend/backend/database/migrations/001_create_database.sql

# Optional: Load sample data
source C:/Users/PC-05/hrms-frontend/backend/database/seeds/001_seed_data.sql

# Exit MySQL
exit
```

Then update `backend/.env`:
```env
DB_PASSWORD=your_mysql_password
```

## Start the Application

### Terminal 1: Backend
```bash
cd backend
npm run dev
```

Expected output:
```
✅ Database connected successfully
🚀 Server running on http://localhost:5000
```

### Terminal 2: Frontend
```bash
cd frontend
npm run dev
```

Expected output:
```
VITE ready in XXX ms
➜  Local:   http://localhost:5173/
```

## Test the Application

1. Open browser: http://localhost:5173
2. You should see the HRMS dashboard

If you loaded seed data, login with:
- **Admin:** username=`admin`, password=`admin123`
- **HR:** username=`hr`, password=`hr123`

## Troubleshooting

### MySQL not found
```
'mysql' is not recognized as an internal or external command
```
**Fix:** Add MySQL to PATH (see above) and restart terminal

### Service not starting
**XAMPP:** Open XAMPP Control Panel and start MySQL
**MySQL Server:** Run `net start MySQL80` as Administrator

### Connection refused
**Fix:** Ensure MySQL is running:
```bash
mysql -u root -p
```

### Port already in use
**Backend (5000):**
Edit `backend/.env` and change PORT to 5001

**Frontend (5173):**
It will auto-select next available port

## Current Status

✅ Frontend: Running on http://localhost:5173
❌ Backend: Waiting for MySQL database

Once MySQL is ready, run `setup-database.bat` to complete setup!
