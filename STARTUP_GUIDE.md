# HRMS Startup Guide

## Quick Start (Normal)

1. **Right-click** `start-hrms.bat` and select **Run as Administrator**
2. Access at: `http://YOUR_IP:8000`

## If IP Address Changed

1. Run `ipconfig` to find your new IP address (look for IPv4 Address under Ethernet)
2. Update these files with the new IP:

**frontend/.env** (line 10):
```
VITE_API_URL=http://NEW_IP:8001/api/v1
```

**backend/.env** (line 43 - CORS_ORIGINS):
```
CORS_ORIGINS=http://localhost:5173,http://localhost:5174,http://localhost:8000,http://NEW_IP:5173,http://NEW_IP:8000
```

3. Rebuild frontend:
```cmd
cd C:\hrms-frontend\frontend
npm run build
```

4. Restart PM2:
```cmd
pm2 restart all
```

## If MySQL Password Error (Access Denied)

**Right-click** `fix-mysql.bat` and select **Run as Administrator**

This will automatically:
- Stop MySQL
- Reset password to `root`
- Restart MySQL

## Manual Commands

### Start HRMS
```cmd
pm2 start C:\hrms-frontend\ecosystem.config.js
```

### Stop HRMS
```cmd
pm2 stop all
```

### Restart HRMS
```cmd
pm2 restart all
```

### Check Status
```cmd
pm2 status
```

### View Logs
```cmd
pm2 logs hrms-backend --lines 50
pm2 logs hrms-frontend --lines 50
```

### Test MySQL Connection
```cmd
mysql -u root -proot -e "SELECT 1"
```

## Ports

| Service | Port |
|---------|------|
| Frontend | 8000 |
| Backend | 8001 |
| MySQL | 3306 |

## Current Configuration

- **IP Address**: 192.168.1.36
- **MySQL User**: root
- **MySQL Password**: root
- **Database**: hrms_db
