# HRMS Git Transfer Guide

Using Git to transfer your HRMS project from PC-05 to PC-09 (or any production laptop).

## Benefits of Using Git

✅ Clean transfer (only source code, no junk files)
✅ Version control for future updates
✅ Easy to pull updates later
✅ Professional approach
✅ Can transfer over internet or local network
✅ Automatic exclusion of node_modules, .env files

## Important Security Warning

🔒 **NEVER commit actual .env files or passwords to Git!**
🔒 Use PRIVATE repository if using GitHub/GitLab
🔒 Or use LOCAL Git server (recommended for sensitive projects)

---

## Option A: Using GitHub/GitLab (Private Repository)

### On Development Laptop (PC-05)

#### Step 1: Initialize Git Repository (if not already done)

```bash
cd C:\Users\PC-05\hrms-frontend

# Check if already a git repo
git status

# If not a git repo, initialize it
git init
```

#### Step 2: Ensure .gitignore is Correct

The `.gitignore` file should already exclude sensitive files. Verify:

```bash
type .gitignore
```

Should include:
- `.env`
- `node_modules`
- `uploads/`
- `backups/`
- `logs/`

✅ Already configured in your project!

#### Step 3: Commit All Project Files

```bash
# Add all files (respects .gitignore)
git add .

# Check what will be committed
git status

# Commit
git commit -m "HRMS Production Ready - Deployment configuration added

- Updated ports to 8000 (frontend) and 8001 (backend)
- Configured for MySQL database
- Added PM2 process manager configuration
- Added database migration and backup scripts
- Added auto-startup configuration for 24/7 operation
- Added comprehensive deployment documentation
- Removed obsolete setup scripts"
```

#### Step 4: Create GitHub Repository

**Option 4A: Using GitHub Website**

1. Go to https://github.com
2. Log in to your account
3. Click "+" → "New repository"
4. Repository name: `hrms-system` (or your choice)
5. Description: "HRMS Employee Management System"
6. **IMPORTANT**: Select "Private" (not Public!)
7. Do NOT initialize with README (you already have one)
8. Click "Create repository"

**Option 4B: Using GitHub CLI (if installed)**

```bash
gh repo create hrms-system --private --source=. --remote=origin --push
```

#### Step 5: Push to GitHub

```bash
# Add GitHub as remote (replace with your actual repo URL)
git remote add origin https://github.com/YOUR_USERNAME/hrms-system.git

# Push to GitHub
git branch -M master
git push -u origin master
```

Enter your GitHub username and password/token when prompted.

### On Production Laptop (PC-09)

#### Step 1: Install Git (if not installed)

1. Download from: https://git-scm.com/download/win
2. Run installer, use default settings
3. Verify: Open CMD, type `git --version`

#### Step 2: Clone Repository

```bash
# Navigate to where you want the project
cd C:\

# Clone from GitHub
git clone https://github.com/YOUR_USERNAME/hrms-system.git hrms-frontend

# Enter the project
cd hrms-frontend
```

**Done!** All files are now on production laptop.

---

## Option B: Using Local Git Server (More Secure)

This method keeps everything on your local network - no cloud upload needed.

### On Development Laptop (PC-05)

#### Step 1: Create Bare Repository (Git Server)

```bash
# Create a shared location (or use network share)
# Example: Use USB drive or shared folder

# If using USB drive (E: drive)
cd E:\
mkdir git-repos
cd git-repos

# Create bare repository
git init --bare hrms-system.git
```

#### Step 2: Push to Local Git Server

```bash
# On your development laptop
cd C:\Users\PC-05\hrms-frontend

# Initialize if needed
git init

# Add all files
git add .

# Commit
git commit -m "HRMS Production Ready"

# Add USB/shared location as remote
git remote add origin E:\git-repos\hrms-system.git

# Push
git push -u origin master
```

### On Production Laptop (PC-09)

#### Method 1: Using USB Drive

```bash
# Insert same USB drive
# Navigate to destination
cd C:\

# Clone from USB
git clone E:\git-repos\hrms-system.git hrms-frontend

cd hrms-frontend
```

#### Method 2: Using Network Share

**On PC-05:**
```bash
# Share the git-repos folder
# Right-click E:\git-repos > Properties > Sharing > Share
# Note the network path: \\PC-05\git-repos
```

**On PC-09:**
```bash
# Clone from network
cd C:\
git clone \\PC-05\git-repos\hrms-system.git hrms-frontend

cd hrms-frontend
```

---

## Option C: Using GitLab Self-Hosted (Advanced)

If your organization has GitLab server, use similar steps as GitHub but with your GitLab URL.

---

## After Git Clone: Setup Steps

Once you've cloned the repository on production laptop, continue with setup:

### 1. Install Required Software

```bash
# Node.js from: https://nodejs.org/
# MySQL from: https://dev.mysql.com/downloads/installer/
# PM2: npm install -g pm2
```

### 2. Install Dependencies

```bash
cd C:\hrms-frontend

# Backend
cd backend
npm install --production

# Frontend
cd ..\frontend
npm install
```

### 3. Create Environment Files

```bash
# Backend
cd C:\hrms-frontend\backend
copy ..\DEPLOYMENT_CONFIG_PC09.env.backend .env
notepad .env
```
Update `DB_PASSWORD` and save.

```bash
# Frontend
cd ..\frontend
copy ..\DEPLOYMENT_CONFIG_PC09.env.frontend .env
notepad .env
```
Update `VITE_API_URL` with production IP and save.

### 4. Setup Database

```bash
cd C:\hrms-frontend
run-migrations.bat
```

### 5. Build Frontend

```bash
cd frontend
npm run build
```

### 6. Start Application

```bash
cd C:\hrms-frontend
start-hrms.bat
```

### 7. Configure Auto-Startup

```bash
setup-auto-startup.bat
```

### 8. Setup Backups

```bash
setup-backup-schedule.bat
```
(Run as Administrator)

---

## Git Transfer Checklist

### On Development Laptop (PC-05)

- [ ] Git installed and configured
- [ ] Project is a git repository (git init if needed)
- [ ] .gitignore is correct (excludes .env, node_modules)
- [ ] All changes committed (git add . && git commit)
- [ ] Remote repository created (GitHub/GitLab/Local)
- [ ] Code pushed to remote (git push)
- [ ] Verified push was successful
- [ ] Repository is PRIVATE (if using GitHub/GitLab)

### On Production Laptop (PC-09)

- [ ] Git installed (git --version works)
- [ ] Repository cloned (git clone)
- [ ] All files present in C:\hrms-frontend
- [ ] Node.js installed
- [ ] MySQL installed
- [ ] PM2 installed
- [ ] Backend dependencies installed (npm install)
- [ ] Frontend dependencies installed (npm install)
- [ ] backend/.env created and configured
- [ ] frontend/.env created and configured
- [ ] Database migrations run (run-migrations.bat)
- [ ] Frontend built (npm run build)
- [ ] Application started (start-hrms.bat)
- [ ] Auto-startup configured
- [ ] Backup schedule configured
- [ ] Tested from browser

---

## Future Updates Using Git

One of the best benefits of Git - easy updates!

### When You Make Changes on Development Laptop:

```bash
cd C:\Users\PC-05\hrms-frontend

# Make your changes
# Test them

# Commit changes
git add .
git commit -m "Description of changes"
git push origin master
```

### To Update Production Laptop:

```bash
cd C:\hrms-frontend

# Stop the application
stop-hrms.bat

# Pull latest changes
git pull origin master

# If dependencies changed, reinstall
cd backend
npm install

cd ..\frontend
npm install
npm run build

# Restart application
cd ..
restart-hrms.bat
```

**Easy updates without full retransfer!**

---

## Common Git Transfer Issues & Solutions

### Issue: "Git not found"
**Solution**: Install Git from https://git-scm.com/download/win

### Issue: "Permission denied (publickey)"
**Solution**:
- Use HTTPS instead of SSH
- Or setup SSH keys: https://docs.github.com/en/authentication

### Issue: ".env file is in git"
**Solution**:
```bash
# Remove from git (keeps local file)
git rm --cached backend/.env
git rm --cached frontend/.env
git commit -m "Remove .env files from git"
git push
```

### Issue: "Repository is too large"
**Solution**:
- Ensure node_modules is in .gitignore
- Ensure dist is in .gitignore
- These folders should NOT be in git

### Issue: "Fatal: not a git repository"
**Solution**:
```bash
cd C:\Users\PC-05\hrms-frontend
git init
```

### Issue: "Remote already exists"
**Solution**:
```bash
# Remove old remote
git remote remove origin

# Add new remote
git remote add origin YOUR_REPO_URL
```

---

## Git Commands Quick Reference

```bash
# Check status
git status

# Add all files
git add .

# Commit
git commit -m "message"

# Push to remote
git push origin master

# Pull from remote
git pull origin master

# Clone repository
git clone REPO_URL

# Check current remote
git remote -v

# View commit history
git log

# Discard local changes
git checkout .

# Create new branch
git checkout -b branch-name
```

---

## Security Best Practices

### ✅ DO:
- Use private repository for company projects
- Keep .gitignore up to date
- Use strong GitHub password and 2FA
- Review files before commit (git status)
- Use meaningful commit messages

### ❌ DON'T:
- Commit .env files (contains passwords!)
- Use public repository for company code
- Commit node_modules (huge and unnecessary)
- Commit database backups to git
- Share repository access with unauthorized users

---

## Recommended: GitHub Private Repository Method

**Why?**
- ✅ Free for private repos
- ✅ Easy to use
- ✅ Can access from anywhere
- ✅ Built-in backup
- ✅ Easy updates
- ✅ Version history

**Steps Summary:**

1. **PC-05**: Create GitHub account (if needed)
2. **PC-05**: Create private repository
3. **PC-05**: Push code to GitHub
4. **PC-09**: Install Git
5. **PC-09**: Clone repository
6. **PC-09**: Follow setup steps
7. **Done!** Updates are now easy with git pull

---

## Example: Complete Git Transfer (GitHub)

### On PC-05 (Development):

```bash
cd C:\Users\PC-05\hrms-frontend
git init
git add .
git commit -m "HRMS Production Ready"

# Create repo on GitHub (via website), then:
git remote add origin https://github.com/yourusername/hrms-system.git
git branch -M master
git push -u origin master
```

### On PC-09 (Production):

```bash
# Install Git first, then:
cd C:\
git clone https://github.com/yourusername/hrms-system.git hrms-frontend
cd hrms-frontend

# Follow DEPLOYMENT_GUIDE.md from here
# Install software, setup .env, build, start
```

---

## Need Help?

- Git documentation: https://git-scm.com/doc
- GitHub guides: https://guides.github.com/
- Git tutorial: https://www.atlassian.com/git/tutorials

For deployment after Git clone:
- See: DEPLOYMENT_GUIDE.md
- See: PRE_DEPLOYMENT_CHECKLIST.md

---

**Last Updated**: November 11, 2025
**Method**: Git Transfer for HRMS Deployment
