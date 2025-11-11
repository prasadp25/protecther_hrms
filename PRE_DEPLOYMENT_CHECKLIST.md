# HRMS Pre-Deployment Checklist

Use this checklist to ensure successful deployment of the HRMS system on your production server.

## Phase 1: Software Installation

### System Requirements
- [ ] Windows 10/11 (64-bit)
- [ ] Minimum 8GB RAM (16GB recommended)
- [ ] SSD with at least 50GB free space
- [ ] Stable internet connection for initial setup
- [ ] Laptop plugged into power (for 24/7 operation)

### Required Software
- [ ] **Node.js v18+** installed
  - Download: https://nodejs.org/
  - Verify: Run `node --version` in CMD

- [ ] **MySQL v8.0+** installed
  - Download: https://dev.mysql.com/downloads/installer/
  - Service configured to start automatically
  - Root password set and documented securely
  - Verify: Run `mysql --version` in CMD

- [ ] **PM2** installed globally
  - Run: `npm install -g pm2`
  - Run: `npm install -g pm2-windows-startup`
  - Verify: Run `pm2 --version` in CMD

- [ ] **Git** installed (optional but recommended)
  - Download: https://git-scm.com/download/win
  - Verify: Run `git --version` in CMD

### Remote Access Software (Choose one)
- [ ] **TeamViewer** installed and configured
  - Download: https://www.teamviewer.com/
  - Unattended access configured
  - Strong password set

- [ ] **AnyDesk** installed and configured
  - Download: https://anydesk.com/
  - Unattended access configured
  - Strong password set

## Phase 2: Windows Configuration

### Power Settings
- [ ] Control Panel > Power Options opened
- [ ] "High Performance" plan selected
- [ ] Display sleep set to: **Never**
- [ ] Computer sleep set to: **Never**
- [ ] Hard disk turn off set to: **Never**
- [ ] Hibernate set to: **Never**
- [ ] PCI Express Link State Power Management: **Off**

### Network Configuration
- [ ] Network adapter using static IP address
  - Recommended IP: 192.168.1.33 (or as per your network)
  - Subnet mask configured
  - Gateway configured
  - DNS servers configured
- [ ] Static IP documented for future reference
- [ ] Network location set to "Private"

### Firewall Configuration
- [ ] Port 8000 (Frontend) allowed in Windows Firewall
  ```powershell
  New-NetFirewallRule -DisplayName "HRMS Frontend" -Direction Inbound -LocalPort 8000 -Protocol TCP -Action Allow
  ```

- [ ] Port 8001 (Backend) allowed in Windows Firewall
  ```powershell
  New-NetFirewallRule -DisplayName "HRMS Backend" -Direction Inbound -LocalPort 8001 -Protocol TCP -Action Allow
  ```

- [ ] Firewall rules verified in Windows Defender Firewall > Advanced Settings

### Windows Updates
- [ ] All critical updates installed
- [ ] Auto-restart after updates disabled:
  - Settings > Update & Security > Advanced options
  - "Update notifications" configured to not auto-restart

- [ ] Update schedule set to notify only (not automatic)

### User Account Configuration
- [ ] Strong password set for Windows user account
- [ ] Auto-login disabled (if laptop in public area)
- [ ] Screen lock timeout set appropriately
- [ ] User account documented securely

## Phase 3: MySQL Database Setup

### MySQL Service
- [ ] MySQL service running
  - Check: Services > MySQL (or MySQL80)
  - Status should be "Running"
  - Startup type should be "Automatic"

### Database Creation
- [ ] Database migration script ready: `run-migrations.bat`
- [ ] MySQL root password available
- [ ] Migrations executed successfully:
  ```bash
  run-migrations.bat
  ```
- [ ] All migration files completed without errors
- [ ] Calendar days data verified in database
- [ ] Test database connection from MySQL Workbench or command line

### Database User Permissions
- [ ] Root user has all necessary privileges
- [ ] Connection from localhost verified
- [ ] Database `hrms_db` exists and is accessible

## Phase 4: Application Setup

### Project Files
- [ ] HRMS project files copied to server
  - Recommended location: `C:\hrms-frontend\`
  - All files and folders present
  - No corruption during transfer

### Backend Configuration
- [ ] Navigate to backend folder
- [ ] Environment file created:
  ```bash
  copy DEPLOYMENT_CONFIG_PC09.env.backend backend\.env
  ```
- [ ] `backend\.env` file edited with correct values:
  - [ ] `DB_PASSWORD` = Your MySQL root password
  - [ ] `DB_HOST` = localhost
  - [ ] `DB_PORT` = 3306
  - [ ] `DB_USER` = root
  - [ ] `DB_NAME` = hrms_db
  - [ ] `PORT` = 8001
  - [ ] `NODE_ENV` = production
  - [ ] `CORS_ORIGIN` includes frontend URL (http://localhost:8000)
  - [ ] `JWT_SECRET` is set (already generated)
  - [ ] `SESSION_SECRET` is set (already generated)

- [ ] Backend dependencies installed:
  ```bash
  cd backend
  npm install --production
  ```
- [ ] No installation errors occurred
- [ ] `node_modules` folder created successfully

### Frontend Configuration
- [ ] Navigate to frontend folder
- [ ] Environment file created:
  ```bash
  copy DEPLOYMENT_CONFIG_PC09.env.frontend frontend\.env
  ```
- [ ] `frontend\.env` file edited with correct values:
  - [ ] `VITE_API_URL` = http://192.168.1.33:8001/api/v1 (use your server IP)
  - [ ] `VITE_NODE_ENV` = production

- [ ] Frontend dependencies installed:
  ```bash
  cd frontend
  npm install
  ```
- [ ] Production build created:
  ```bash
  npm run build
  ```
- [ ] Build completed successfully
- [ ] `dist` folder created with production files
- [ ] No build errors occurred

## Phase 5: Application Deployment

### Initial Startup Test
- [ ] Start HRMS application:
  ```bash
  start-hrms.bat
  ```
- [ ] MySQL service check passed
- [ ] PM2 started both applications successfully
- [ ] No error messages displayed

### Application Status Verification
- [ ] Check PM2 status:
  ```bash
  pm2 status
  ```
- [ ] Both processes running:
  - [ ] hrms-backend (status: online)
  - [ ] hrms-frontend (status: online)

- [ ] No processes in error or stopped state
- [ ] Check logs for errors:
  ```bash
  pm2 logs
  ```

### Access Testing
- [ ] Frontend accessible from server:
  - [ ] Open browser: http://localhost:8000
  - [ ] Page loads without errors
  - [ ] Login page displays correctly

- [ ] Backend API accessible:
  - [ ] Test: http://localhost:8001/api/v1/
  - [ ] Returns response (not 404)

- [ ] Frontend accessible from network:
  - [ ] From another device: http://[SERVER_IP]:8000
  - [ ] Replace [SERVER_IP] with actual server IP
  - [ ] Page loads correctly

- [ ] Backend API accessible from network:
  - [ ] From another device: http://[SERVER_IP]:8001/api/v1/
  - [ ] Returns response

### Functionality Testing
- [ ] Login functionality works
  - [ ] Test with valid credentials
  - [ ] Test with invalid credentials (should fail)
  - [ ] Session maintained after login

- [ ] Dashboard loads correctly
- [ ] Employee list loads
- [ ] Attendance features accessible
- [ ] Salary/Payroll features accessible
- [ ] Reports accessible (if implemented)
- [ ] Logout functionality works

## Phase 6: Auto-Startup Configuration

### PM2 Startup
- [ ] Configure PM2 auto-startup:
  ```bash
  setup-auto-startup.bat
  ```
- [ ] Copy the generated PM2 startup command
- [ ] Open Command Prompt as Administrator
- [ ] Paste and run the startup command
- [ ] Command executed successfully
- [ ] Save PM2 process list:
  ```bash
  pm2 save
  ```

### Auto-Startup Testing
- [ ] Restart the server computer
- [ ] Wait 2-3 minutes for boot and auto-start
- [ ] Check PM2 status after restart:
  ```bash
  pm2 status
  ```
- [ ] Both applications running automatically
- [ ] Frontend accessible at http://localhost:8000
- [ ] Backend accessible at http://localhost:8001
- [ ] No manual intervention required

## Phase 7: Backup Configuration

### Manual Backup Test
- [ ] Run backup script:
  ```bash
  backup-database.bat
  ```
- [ ] Backup completed successfully
- [ ] Backup file created in `backups/database/`
- [ ] Backup file size is reasonable (not 0 bytes)
- [ ] Backup file can be opened (valid SQL)

### Automatic Backup Schedule
- [ ] Run backup scheduler setup (as Administrator):
  ```bash
  setup-backup-schedule.bat
  ```
- [ ] Scheduled task created successfully
- [ ] Verify in Task Scheduler:
  - Task name: HRMS_Daily_Backup
  - Schedule: Daily at 2:00 AM
  - Status: Ready

- [ ] Manually trigger task to test
- [ ] Backup created successfully from scheduled task

### Restore Test (Optional but Recommended)
- [ ] Create test backup
- [ ] Run restore script:
  ```bash
  restore-database.bat
  ```
- [ ] Restore completed successfully
- [ ] Application still works after restore

## Phase 8: Security Hardening

### Password Security
- [ ] MySQL root password is strong (12+ characters, mixed case, numbers, symbols)
- [ ] MySQL password documented in secure location (password manager)
- [ ] Windows user password is strong
- [ ] Remote access password is strong

### File Security
- [ ] `.env` files contain sensitive information
- [ ] `.env` files NOT shared or committed to version control
- [ ] `.env` files have restricted permissions (if possible)
- [ ] Backup files stored securely

### Network Security
- [ ] Only necessary ports open (8000, 8001, 3306 localhost only)
- [ ] Windows Firewall enabled
- [ ] No unnecessary services running
- [ ] Remote access software password-protected
- [ ] Consider VPN for remote access instead of port forwarding

### Application Security
- [ ] JWT secrets are secure and random (already set)
- [ ] Session secrets are secure and random (already set)
- [ ] CORS origins properly configured
- [ ] Rate limiting enabled (check backend config)
- [ ] Account lockout enabled (check backend config)

## Phase 9: Monitoring Setup

### Log Management
- [ ] Log directory created: `logs/`
- [ ] Backend logs accessible:
  - `logs/backend-error.log`
  - `logs/backend-out.log`

- [ ] Frontend logs accessible:
  - `logs/frontend-error.log`
  - `logs/frontend-out.log`

- [ ] Log rotation considered (PM2 handles this)
- [ ] Plan for reviewing logs regularly

### Monitoring Commands Documented
- [ ] Team knows how to check status: `pm2 status`
- [ ] Team knows how to view logs: `pm2 logs`
- [ ] Team knows how to restart: `restart-hrms.bat`
- [ ] Team knows how to stop: `stop-hrms.bat`

### Performance Monitoring
- [ ] Initial CPU usage noted
- [ ] Initial RAM usage noted
- [ ] Disk space monitored (keep 20%+ free)
- [ ] Laptop cooling solution in place (cooling pad)

## Phase 10: Documentation

### Information Documented
- [ ] Server IP address: ___________________
- [ ] Frontend URL: http://___________:8000
- [ ] Backend URL: http://___________:8001/api/v1
- [ ] MySQL root password (in password manager)
- [ ] Windows user credentials (in password manager)
- [ ] Remote access credentials (in password manager)
- [ ] TeamViewer/AnyDesk ID: ___________________

### Access Documentation
- [ ] How to access server remotely documented
- [ ] How to restart application documented
- [ ] How to check logs documented
- [ ] Emergency contact information documented

### Maintenance Schedule Created
- [ ] Daily tasks defined:
  - Check PM2 status
  - Monitor disk space

- [ ] Weekly tasks defined:
  - Review error logs
  - Verify backups
  - Check for updates

- [ ] Monthly tasks defined:
  - Clean old logs
  - Database optimization
  - Security review

## Phase 11: User Training

### Admin Users
- [ ] Admin users created in database
- [ ] Admin credentials provided securely
- [ ] Admin users tested login

### End Users
- [ ] User accounts created
- [ ] Initial passwords provided
- [ ] Basic training provided on:
  - Login procedure
  - Dashboard navigation
  - Attendance marking
  - Report viewing
  - Password change

### Support Documentation
- [ ] User manual available (if created)
- [ ] FAQ document created (optional)
- [ ] Support contact information provided

## Phase 12: Final Verification

### Complete System Test
- [ ] Restart server one final time
- [ ] Applications start automatically
- [ ] Login from multiple devices
- [ ] Test all major features:
  - [ ] Employee management
  - [ ] Attendance tracking
  - [ ] Salary calculation
  - [ ] Payslip generation
  - [ ] Reports

- [ ] Test mobile access (if responsive design)
- [ ] Test concurrent users (if multiple users available)

### Performance Verification
- [ ] Response time is acceptable (<2 seconds)
- [ ] No memory leaks observed
- [ ] CPU usage is reasonable (<50% under normal load)
- [ ] Disk I/O is normal

### 24-Hour Stability Test
- [ ] System running for 24 hours continuously
- [ ] No crashes or restarts
- [ ] No memory growth issues
- [ ] Logs show normal operation

## Phase 13: Handover

### Handover Documentation
- [ ] All documentation provided to stakeholders
- [ ] DEPLOYMENT_GUIDE.md reviewed with team
- [ ] PRE_DEPLOYMENT_CHECKLIST.md completed
- [ ] Access credentials provided securely

### Knowledge Transfer
- [ ] Technical team trained on:
  - Starting/stopping application
  - Checking logs
  - Running backups
  - Restoring from backup
  - Basic troubleshooting

- [ ] Contact information exchanged
- [ ] Support agreement defined (if applicable)

### Sign-Off
- [ ] Deployment completed successfully
- [ ] All tests passed
- [ ] Client/stakeholder acceptance received
- [ ] Deployment date: ___________________
- [ ] Deployed by: ___________________

## Emergency Contacts

**Technical Support:**
- Name: ___________________
- Phone: ___________________
- Email: ___________________

**Server Administrator:**
- Name: ___________________
- Phone: ___________________
- Email: ___________________

## Post-Deployment Notes

_Use this space to note any issues encountered or special configurations made:_

```
_______________________________________________
_______________________________________________
_______________________________________________
_______________________________________________
_______________________________________________
```

---

## Quick Reference Card (Print and Keep Near Server)

### Access URLs
- Frontend: http://[SERVER_IP]:8000
- Backend: http://[SERVER_IP]:8001/api/v1

### Common Commands
```bash
# Check Status
pm2 status

# View Logs
pm2 logs

# Restart Application
restart-hrms.bat

# Stop Application
stop-hrms.bat

# Backup Database
backup-database.bat

# Check MySQL Service
sc query MySQL
```

### Emergency Procedures
1. **Application not responding:** Run `restart-hrms.bat`
2. **Database issues:** Check MySQL service is running
3. **Can't access remotely:** Check Windows Firewall
4. **After power failure:** Wait 5 minutes, check `pm2 status`

---

**Checklist Version:** 1.0
**Last Updated:** November 11, 2025
**HRMS Version:** 1.0.0
