========================================
HRMS DEPLOYMENT FILES OVERVIEW
========================================

This file explains all deployment-related files in the root directory.

========================================
CONFIGURATION FILES
========================================

DEPLOYMENT_CONFIG_PC09.env.backend
  - Template environment file for backend
  - Copy to: backend/.env
  - Update DB_PASSWORD before use
  - Contains production settings (port 8001, MySQL config)

DEPLOYMENT_CONFIG_PC09.env.frontend
  - Template environment file for frontend
  - Copy to: frontend/.env
  - Update VITE_API_URL with server IP
  - Contains production settings (port 8000)

ecosystem.config.js
  - PM2 process manager configuration
  - Configures both frontend and backend processes
  - Sets ports, logging, auto-restart settings

========================================
MANAGEMENT SCRIPTS
========================================

start-hrms.bat
  - Starts the HRMS application
  - Checks MySQL service
  - Uses PM2 to start both frontend and backend
  - Run this to start the application

stop-hrms.bat
  - Stops the HRMS application gracefully
  - Stops all PM2 processes

restart-hrms.bat
  - Restarts the application
  - Useful after updates or configuration changes

check-status.bat
  - Shows current status of HRMS applications
  - Displays PM2 process status

setup-auto-startup.bat
  - Configures HRMS to start on Windows boot
  - Run ONCE after initial deployment
  - Follow on-screen instructions

========================================
DATABASE SCRIPTS
========================================

run-migrations.bat
  - Automatically runs all database migrations
  - Creates database and tables
  - Run ONCE during initial setup
  - Prompts for MySQL root password

backup-database.bat
  - Creates a backup of the database
  - Saves to: backups/database/
  - Keeps last 30 days of backups
  - Can be run manually or via scheduler

restore-database.bat
  - Restores database from a backup file
  - Lists available backups
  - Requires confirmation before restoring

setup-backup-schedule.bat
  - Creates Windows scheduled task
  - Runs backup daily at 2:00 AM
  - Run as Administrator

========================================
DOCUMENTATION
========================================

DEPLOYMENT_GUIDE.md
  - Complete deployment instructions
  - Software requirements
  - Step-by-step setup guide
  - Troubleshooting section
  - Maintenance schedule

PRE_DEPLOYMENT_CHECKLIST.md
  - Comprehensive 13-phase checklist
  - Covers entire deployment process
  - From software installation to handover
  - Use this as your primary guide

README.md
  - General project information

SETUP_GUIDE.md
  - Development setup guide
  - For developers setting up local environment

QUICK_START.md
  - Quick start for development
  - Not for production deployment

SALARY_SYSTEM_SPECIFICATION.md
  - Technical specification for salary system

========================================
DELETED/OBSOLETE FILES
========================================

run-migration.bat (DELETED)
  - Old MySQL-specific migration script
  - Replaced by: run-migrations.bat

setup-database.bat (DELETED)
  - Old database setup script
  - Replaced by: run-migrations.bat

========================================
DEPLOYMENT WORKFLOW
========================================

1. FIRST TIME SETUP:
   - Install software (Node.js, MySQL, PM2)
   - Run: run-migrations.bat
   - Copy DEPLOYMENT_CONFIG_PC09.env.backend to backend/.env
   - Copy DEPLOYMENT_CONFIG_PC09.env.frontend to frontend/.env
   - Edit .env files with passwords and IP addresses
   - Install dependencies: npm install (in both folders)
   - Build frontend: cd frontend && npm run build
   - Start: start-hrms.bat
   - Setup auto-start: setup-auto-startup.bat
   - Setup backups: setup-backup-schedule.bat

2. DAILY OPERATIONS:
   - Application starts automatically on boot
   - Backups run automatically at 2:00 AM
   - Use check-status.bat to verify running

3. MAINTENANCE:
   - View logs: pm2 logs
   - Restart: restart-hrms.bat
   - Backup: backup-database.bat
   - Restore: restore-database.bat

========================================
IMPORTANT NOTES
========================================

- NEVER commit .env files to git
- Keep database backups in secure location
- Document all passwords in password manager
- Follow PRE_DEPLOYMENT_CHECKLIST.md completely
- Test auto-startup after configuration

========================================
SUPPORT
========================================

For detailed instructions, see:
  DEPLOYMENT_GUIDE.md
  PRE_DEPLOYMENT_CHECKLIST.md

For issues:
  - Check logs: pm2 logs
  - See troubleshooting in DEPLOYMENT_GUIDE.md

========================================
