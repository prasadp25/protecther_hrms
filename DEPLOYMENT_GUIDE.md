# HRMS Deployment Guide - 24/7 Production Server

This guide provides complete instructions for setting up the HRMS system on a 24/7 production laptop.

## Port Configuration

- **Frontend**: Port 8000
- **Backend API**: Port 8001
- **MySQL Database**: Port 3306

## Required Software Installation

### 1. Node.js (v18 or higher)
**Purpose**: Runtime for both frontend and backend applications

**Installation**:
1. Download from: https://nodejs.org/
2. Install the LTS version (Long Term Support)
3. Verify installation:
   ```bash
   node --version
   npm --version
   ```

### 2. MySQL Database (v8.0 or higher)
**Purpose**: Primary database for HRMS system

**Installation**:
1. Download from: https://dev.mysql.com/downloads/installer/
2. During installation:
   - Choose "Server only" or "Developer Default"
   - Set a strong password for the root user
   - Default port: 3306
   - Configure as Windows Service for auto-start
3. Verify installation:
   ```bash
   mysql --version
   ```

**Post-Installation**:
- Create database: `hrms_db`
- Run migrations using the provided migration script
- Ensure MySQL service starts automatically

### 3. PM2 Process Manager
**Purpose**: Keep applications running 24/7 with auto-restart on failure

**Installation**:
```bash
npm install -g pm2
npm install -g pm2-windows-startup
```

**Verify installation**:
```bash
pm2 --version
```

### 4. Git (Optional but Recommended)
**Purpose**: Version control and easy updates

**Installation**:
1. Download from: https://git-scm.com/download/win
2. Use default installation options

## Additional Software for 24/7 Operation

### 5. TeamViewer or AnyDesk (Highly Recommended)
**Purpose**: Remote access to server laptop

**Options**:
- **TeamViewer**: https://www.teamviewer.com/
- **AnyDesk**: https://anydesk.com/

**Why**: Essential for remote maintenance and monitoring

### 6. Windows Power Settings Configuration
**Purpose**: Prevent laptop from sleeping

**Steps**:
1. Open Control Panel > Power Options
2. Select "High Performance" plan
3. Click "Change plan settings"
4. Set both "Turn off display" and "Put computer to sleep" to **Never**
5. Click "Change advanced power settings":
   - Hard disk > Turn off hard disk after: **Never**
   - Sleep > Sleep after: **Never**
   - Sleep > Hibernate after: **Never**
   - PCI Express > Link State Power Management: **Off**

### 7. Disable Windows Updates Auto-Restart
**Purpose**: Prevent automatic reboots during updates

**Steps**:
1. Open Group Policy Editor (gpedit.msc)
2. Navigate to: Computer Configuration > Administrative Templates > Windows Components > Windows Update
3. Enable "No auto-restart with logged on users for scheduled automatic updates installations"

OR use Settings:
1. Settings > Update & Security > Windows Update > Advanced options
2. Under "Update notifications", disable auto-restart

### 8. Static IP Configuration (Recommended)
**Purpose**: Consistent network access

**Steps**:
1. Open Network Connections
2. Right-click your network adapter > Properties
3. Select "Internet Protocol Version 4 (TCP/IPv4)"
4. Set static IP (e.g., 192.168.1.33)
5. Set DNS servers

### 9. Windows Firewall Configuration
**Purpose**: Allow network access to HRMS

**Steps**:
```bash
# Open PowerShell as Administrator and run:
New-NetFirewallRule -DisplayName "HRMS Frontend" -Direction Inbound -LocalPort 8000 -Protocol TCP -Action Allow
New-NetFirewallRule -DisplayName "HRMS Backend" -Direction Inbound -LocalPort 8001 -Protocol TCP -Action Allow
```

OR manually:
1. Windows Defender Firewall > Advanced Settings
2. Inbound Rules > New Rule
3. Port > TCP > Specific local ports: 8000, 8001
4. Allow the connection

## Deployment Steps

### Step 1: Prepare Environment Files

1. **Backend Configuration**:
   ```bash
   cd backend
   copy ..\DEPLOYMENT_CONFIG_PC09.env.backend .env
   ```

2. Edit `backend/.env` and update:
   - `DB_PASSWORD`: Your MySQL root password
   - `CORS_ORIGIN`: Update IP address if different

3. **Frontend Configuration**:
   ```bash
   cd frontend
   copy ..\DEPLOYMENT_CONFIG_PC09.env.frontend .env
   ```

4. Update `VITE_API_URL` with correct server IP if needed

### Step 2: Install Dependencies

```bash
# Backend
cd backend
npm install --production

# Frontend
cd ../frontend
npm install
```

### Step 3: Build Frontend for Production

```bash
cd frontend
npm run build
```

This creates optimized production files in `frontend/dist/`

### Step 4: Database Setup

1. **Run the automated migration script**:
   ```bash
   run-migrations.bat
   ```

   This will automatically:
   - Create the database
   - Run all migration files
   - Set up initial data

2. **OR manually** (if script fails):
   ```bash
   mysql -u root -p
   CREATE DATABASE hrms_db;
   USE hrms_db;
   SOURCE backend/database/migrations/001_create_schema.sql;
   SOURCE backend/database/migrations/002_create_employees.sql;
   SOURCE backend/database/migrations/003_create_attendance.sql;
   SOURCE backend/database/migrations/004_add_account_lockout.sql;
   exit;
   ```

3. Verify calendar days data exists

### Step 5: Configure Auto-Startup

1. **Start the application first**:
   ```bash
   start-hrms.bat
   ```

2. **Configure auto-startup**:
   ```bash
   setup-auto-startup.bat
   ```

3. Follow the instructions to run the PM2 startup command as Administrator

4. **Verify auto-startup**:
   - Restart the computer
   - Check if HRMS starts automatically
   - Run `check-status.bat` to verify

### Step 6: Verify Deployment

1. **Check services are running**:
   ```bash
   pm2 status
   ```

2. **Test access**:
   - Frontend: http://localhost:8000
   - Backend: http://localhost:8001/api/v1/health (if health endpoint exists)

3. **Test from another device on network**:
   - Frontend: http://[SERVER_IP]:8000
   - Backend: http://[SERVER_IP]:8001/api/v1

## Management Scripts

### start-hrms.bat
Starts the HRMS application
- Checks PostgreSQL is running
- Starts both frontend and backend using PM2

### stop-hrms.bat
Stops the HRMS application gracefully

### restart-hrms.bat
Restarts the application (useful after updates)

### check-status.bat
Shows current status of all HRMS processes

### setup-auto-startup.bat
Configures PM2 to start automatically on Windows boot

## Monitoring and Maintenance

### View Logs
```bash
# All logs
pm2 logs

# Specific application
pm2 logs hrms-backend
pm2 logs hrms-frontend

# Log files are also stored in:
# - logs/backend-error.log
# - logs/backend-out.log
# - logs/frontend-error.log
# - logs/frontend-out.log
```

### Check Status
```bash
pm2 status
# OR
check-status.bat
```

### Monitor Resources
```bash
pm2 monit
```

### Restart After Updates
```bash
# Pull latest code
git pull

# Rebuild frontend if needed
cd frontend
npm install
npm run build

# Restart
cd ..
restart-hrms.bat
```

## Troubleshooting

### Application won't start
1. Check MySQL is running:
   ```bash
   sc query MySQL
   ```
   (Service name might be MySQL80, MySQL57, etc.)

2. Check PM2 status:
   ```bash
   pm2 status
   ```

3. View error logs:
   ```bash
   pm2 logs --err
   ```

### Can't access from network
1. Check Windows Firewall rules
2. Verify server IP address
3. Ensure ports 8000 and 8001 are allowed
4. Check if both devices are on same network

### Database connection errors
1. Verify MySQL is running
2. Check credentials in `backend/.env`
3. Ensure database `hrms_db` exists
4. Check port 3306 is not blocked
5. Verify MySQL user has proper permissions

### Auto-startup not working
1. Verify PM2 startup is configured:
   ```bash
   pm2 startup
   ```

2. Save PM2 process list:
   ```bash
   pm2 save
   ```

3. Check Windows Event Viewer for errors

## Backup Recommendations

### Database Backup (Daily)
Use the provided backup script:
```bash
backup-database.bat
```

Or create scheduled task to run it automatically

### Application Backup (Weekly)
- Backup entire project folder
- Backup `.env` files (securely)
- Backup `logs/` folder

## Security Checklist

- [ ] Strong MySQL root password set
- [ ] `.env` files not shared publicly
- [ ] Windows Firewall configured
- [ ] Only necessary ports open (8000, 8001)
- [ ] Remote access (TeamViewer/AnyDesk) password protected
- [ ] Windows auto-login disabled (if server in public area)
- [ ] Regular security updates installed
- [ ] Backup strategy in place

## Network Access

### From Same Network
- Frontend: `http://192.168.1.33:8000`
- Backend: `http://192.168.1.33:8001/api/v1`

Replace `192.168.1.33` with your actual server IP

### Port Forwarding (If needed from internet)
1. Configure router to forward ports 8000 and 8001 to server laptop
2. Use Dynamic DNS service for consistent access
3. Consider VPN instead for better security

## Performance Optimization

1. **Laptop Cooling**: Ensure good ventilation, use cooling pad
2. **Disk Space**: Monitor and maintain at least 20% free space
3. **RAM**: 8GB minimum, 16GB recommended
4. **SSD**: Highly recommended for database performance
5. **Battery**: Keep plugged in for 24/7 operation

## Support and Maintenance Schedule

### Daily
- Check PM2 status
- Monitor disk space

### Weekly
- Review logs for errors
- Check Windows updates (manual install)
- Database backup verification

### Monthly
- Clean old logs
- Review and optimize database
- Check for HRMS updates
- Security patches review

## Quick Reference

### Access URLs
- Frontend: http://localhost:8000
- Backend API: http://localhost:8001/api/v1
- Database: localhost:3306

### Important Commands
```bash
# Start
start-hrms.bat

# Stop
stop-hrms.bat

# Restart
restart-hrms.bat

# Status
check-status.bat
pm2 status

# Logs
pm2 logs

# Monitor
pm2 monit
```

### Default Credentials
Check your database seeding scripts or create admin user manually.

## Contact and Support

For issues or questions:
1. Check logs: `pm2 logs`
2. Review troubleshooting section above
3. Contact system administrator

---

**Last Updated**: November 11, 2025
**HRMS Version**: 1.0.0
**Server Configuration**: Windows 24/7 Production
