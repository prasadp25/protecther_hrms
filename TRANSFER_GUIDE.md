# HRMS Project Transfer Guide

This guide explains how to transfer the HRMS project from your development laptop (PC-05) to the production server laptop (PC-09 or target laptop).

## Transfer Methods (Choose One)

### Method 1: USB Drive Transfer (Recommended - Simple & Fast)

#### Step 1: Prepare on Development Laptop (PC-05)

1. **Clean up node_modules (saves space and time)**:
   ```bash
   # Delete node_modules to reduce size
   cd C:\Users\PC-05\hrms-frontend\backend
   rmdir /s /q node_modules

   cd ..\frontend
   rmdir /s /q node_modules

   # Also delete dist folder
   rmdir /s /q dist
   ```

2. **Copy entire project folder to USB drive**:
   - Insert USB drive (e.g., D:, E:, or F:)
   - Copy entire folder: `C:\Users\PC-05\hrms-frontend\`
   - To USB: `E:\hrms-frontend\` (replace E: with your USB drive letter)
   - Wait for copy to complete (should be quick without node_modules)

#### Step 2: Transfer to Production Laptop

1. **Insert USB drive into production laptop**
2. **Copy to recommended location**:
   - Copy from USB: `E:\hrms-frontend\`
   - To production laptop: `C:\hrms-frontend\`
   - Or: `C:\Users\[USERNAME]\hrms-frontend\`

3. **Verify all files copied**:
   - Check folder size matches
   - Verify all .bat files are present
   - Verify backend and frontend folders exist

#### Step 3: Clean Up (Optional)
   - Remove project from USB drive
   - Keep USB drive as backup

---

### Method 2: Network Share Transfer (For Same Network)

#### Step 1: Setup Network Share on Production Laptop

1. **On production laptop, create shared folder**:
   - Create folder: `C:\Shared\`
   - Right-click > Properties > Sharing tab
   - Click "Share" button
   - Add "Everyone" with Read/Write permission
   - Note the network path shown (e.g., `\\PC-09\Shared`)

#### Step 2: Transfer from Development Laptop

1. **On development laptop (PC-05)**:
   - Open File Explorer
   - In address bar, type: `\\PC-09\Shared` (use production laptop name/IP)
   - Copy entire `C:\Users\PC-05\hrms-frontend\` folder
   - Paste into shared folder

#### Step 3: Move on Production Laptop

1. **On production laptop**:
   - Move from `C:\Shared\hrms-frontend\`
   - To: `C:\hrms-frontend\`

---

### Method 3: Git Clone (If Using GitHub/GitLab)

#### Step 1: Push to Git Repository (Development Laptop)

1. **Commit all changes**:
   ```bash
   cd C:\Users\PC-05\hrms-frontend
   git add .
   git commit -m "Production deployment ready"
   ```

2. **Push to remote repository**:
   ```bash
   git push origin master
   ```
   Or create a new repository on GitHub and push:
   ```bash
   git remote add origin https://github.com/yourusername/hrms-frontend.git
   git push -u origin master
   ```

#### Step 2: Clone on Production Laptop

1. **On production laptop**:
   ```bash
   cd C:\
   git clone https://github.com/yourusername/hrms-frontend.git
   cd hrms-frontend
   ```

**IMPORTANT**: If using this method:
- Make sure repository is PRIVATE (contains sensitive config)
- Or use a local Git server
- Never commit `.env` files to public repositories

---

### Method 4: Direct Network Copy (Using IP Address)

#### Step 1: Enable File Sharing on Production Laptop

1. **Enable network discovery**:
   - Settings > Network & Internet > Sharing options
   - Turn on network discovery
   - Turn on file and printer sharing

2. **Share C: drive** (or create shared folder):
   - Right-click C: > Properties > Sharing
   - Advanced Sharing > Share this folder

#### Step 2: Copy from Development Laptop

1. **On development laptop**:
   - Open Run (Win + R)
   - Type: `\\192.168.1.33\C$` (use production laptop IP)
   - Enter credentials if prompted
   - Copy `hrms-frontend` folder to desired location

---

## After Transfer: Setup Steps

Once files are on the production laptop, follow these steps:

### 1. Verify File Transfer

```bash
cd C:\hrms-frontend
dir
```

Check for:
- ✓ backend folder
- ✓ frontend folder
- ✓ All .bat files (9 scripts)
- ✓ ecosystem.config.js
- ✓ DEPLOYMENT_GUIDE.md
- ✓ PRE_DEPLOYMENT_CHECKLIST.md
- ✓ DEPLOYMENT_CONFIG_PC09.env.backend
- ✓ DEPLOYMENT_CONFIG_PC09.env.frontend

### 2. Install Required Software

Follow the software installation section in `DEPLOYMENT_GUIDE.md`:

1. **Install Node.js v18+**
   - https://nodejs.org/
   - Choose LTS version
   - Verify: `node --version`

2. **Install MySQL v8.0+**
   - https://dev.mysql.com/downloads/installer/
   - Set root password (write it down!)
   - Verify: `mysql --version`

3. **Install PM2**
   ```bash
   npm install -g pm2
   npm install -g pm2-windows-startup
   ```
   - Verify: `pm2 --version`

4. **Install Git** (optional)
   - https://git-scm.com/download/win

### 3. Install Dependencies

```bash
# Backend dependencies
cd C:\hrms-frontend\backend
npm install --production

# Frontend dependencies
cd C:\hrms-frontend\frontend
npm install
```

### 4. Setup Database

```bash
cd C:\hrms-frontend
run-migrations.bat
```

Enter MySQL root password when prompted.

### 5. Configure Environment Files

```bash
# Backend
cd C:\hrms-frontend\backend
copy ..\DEPLOYMENT_CONFIG_PC09.env.backend .env
notepad .env
```

Edit and update:
- `DB_PASSWORD=your_actual_mysql_password`
- Save and close

```bash
# Frontend
cd C:\hrms-frontend\frontend
copy ..\DEPLOYMENT_CONFIG_PC09.env.frontend .env
notepad .env
```

Edit and update:
- `VITE_API_URL=http://[PRODUCTION_IP]:8001/api/v1`
- Replace [PRODUCTION_IP] with actual IP (e.g., 192.168.1.33)
- Save and close

### 6. Build Frontend

```bash
cd C:\hrms-frontend\frontend
npm run build
```

Wait for build to complete (creates `dist` folder).

### 7. Start Application

```bash
cd C:\hrms-frontend
start-hrms.bat
```

### 8. Verify Application Running

```bash
check-status.bat
```

Or open browser:
- http://localhost:8000 (frontend)
- http://localhost:8001/api/v1 (backend)

### 9. Setup Auto-Startup

```bash
setup-auto-startup.bat
```

Follow on-screen instructions.

### 10. Setup Automated Backups

```bash
setup-backup-schedule.bat
```

Run as Administrator.

---

## Complete Transfer Checklist

Use this checklist during transfer:

### On Development Laptop (PC-05)
- [ ] Delete node_modules folders (optional, saves space)
- [ ] Delete frontend/dist folder (optional, will rebuild)
- [ ] Choose transfer method (USB, Network, Git)
- [ ] Perform transfer
- [ ] Verify files copied successfully

### On Production Laptop (PC-09)
- [ ] Receive project files in C:\hrms-frontend\
- [ ] Verify all files present
- [ ] Install Node.js
- [ ] Install MySQL
- [ ] Install PM2
- [ ] Install Git (optional)
- [ ] Install TeamViewer/AnyDesk
- [ ] Configure Windows power settings (never sleep)
- [ ] Configure static IP
- [ ] Configure firewall (ports 8000, 8001)
- [ ] Install backend dependencies (npm install)
- [ ] Install frontend dependencies (npm install)
- [ ] Run database migrations (run-migrations.bat)
- [ ] Create backend/.env file
- [ ] Create frontend/.env file
- [ ] Update DB_PASSWORD in backend/.env
- [ ] Update VITE_API_URL in frontend/.env
- [ ] Build frontend (npm run build)
- [ ] Start application (start-hrms.bat)
- [ ] Test frontend access (http://localhost:8000)
- [ ] Test from network (http://[IP]:8000)
- [ ] Setup auto-startup (setup-auto-startup.bat)
- [ ] Setup backup schedule (setup-backup-schedule.bat)
- [ ] Test restart (restart computer and verify auto-start)

---

## Quick Transfer Summary

**Fastest Method (USB Drive)**:

1. PC-05: Delete node_modules, copy to USB
2. PC-09: Copy from USB to C:\hrms-frontend\
3. PC-09: Install software (Node.js, MySQL, PM2)
4. PC-09: Run `npm install` in backend and frontend
5. PC-09: Run `run-migrations.bat`
6. PC-09: Copy and edit .env files
7. PC-09: Run `npm run build` in frontend
8. PC-09: Run `start-hrms.bat`
9. PC-09: Run `setup-auto-startup.bat`
10. PC-09: Run `setup-backup-schedule.bat`

**Total Time**: 30-60 minutes (depending on internet speed for npm install)

---

## Important Notes

### DO NOT Transfer These (Auto-generated):
- ❌ node_modules folders (reinstall with npm install)
- ❌ dist folder (rebuild with npm run build)
- ❌ .env files (create new from templates)
- ❌ logs folder
- ❌ uploads folder
- ❌ backups folder

### DO Transfer These:
- ✅ All source code (backend/src, frontend/src)
- ✅ All .bat scripts
- ✅ Configuration templates (DEPLOYMENT_CONFIG_PC09.env.*)
- ✅ ecosystem.config.js
- ✅ package.json files
- ✅ All documentation (.md files)
- ✅ Database migration files (backend/database/migrations/)

### Security Reminders:
- 🔒 Never transfer actual .env files (they contain passwords)
- 🔒 Always use templates and create new .env files
- 🔒 Write down MySQL password securely
- 🔒 Set strong passwords on production laptop
- 🔒 Enable firewall after setup

---

## Troubleshooting Transfer Issues

### Files Won't Copy
- Check USB drive has enough space (need ~500MB without node_modules)
- Check file permissions
- Try copying in smaller batches

### Can't Access Network Share
- Verify both laptops on same network
- Check Windows Firewall allows file sharing
- Verify network discovery is enabled
- Try using IP address instead of computer name

### Transfer Too Slow
- Use USB 3.0 drive for faster transfer
- Ensure node_modules folders are deleted first
- Use wired network instead of WiFi

### Getting Permission Errors
- Run Command Prompt as Administrator
- Check folder permissions
- Make sure user has write access to destination

---

## Post-Transfer Support

After successful transfer and setup:

1. **Bookmark these URLs on production laptop**:
   - Frontend: http://localhost:8000
   - Frontend (network): http://[IP]:8000

2. **Create desktop shortcuts**:
   - Right-click start-hrms.bat > Send to > Desktop (create shortcut)
   - Right-click check-status.bat > Send to > Desktop (create shortcut)

3. **Document important information**:
   - Production laptop IP address: __________
   - MySQL root password: (in password manager)
   - TeamViewer ID: __________
   - First deployed: __________

4. **Test from other devices**:
   - Mobile phone
   - Other computers on network
   - Verify access works

5. **Setup monitoring**:
   - Add to daily routine: Check status
   - Weekly: Review logs
   - Monthly: Check backups

---

**Need Help?**
Refer to DEPLOYMENT_GUIDE.md and PRE_DEPLOYMENT_CHECKLIST.md for detailed instructions.

**Last Updated**: November 11, 2025
