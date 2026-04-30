# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ProtectHer HRMS - A full-stack Human Resource Management System for construction staffing. Monorepo with React frontend and Node.js/Express backend using MySQL.

## Commands

### Frontend (from `frontend/`)
```bash
npm run dev      # Start dev server (http://localhost:5173)
npm run build    # Production build
npm run lint     # ESLint
npm run preview  # Preview production build
```

### Backend (from `backend/`)
```bash
npm run dev      # Start with nodemon (http://localhost:5000)
npm start        # Production start
```

### Database
MySQL migrations are in `backend/database/migrations/`. Run them in order (001, 002, etc.) against your MySQL instance.

## Architecture

### Tech Stack
- **Frontend**: React 19 + Vite 7 + Tailwind CSS + Axios
- **Backend**: Express 5 + MySQL (mysql2) + JWT auth + Helmet + express-rate-limit
- **PDF Generation**: jspdf + jspdf-autotable, @react-pdf/renderer
- **Charts**: Recharts
- **Excel**: xlsx (both frontend and backend)

### API Communication
- Base URL: `VITE_API_URL` (default: `http://localhost:5000/api/v1`)
- All API calls go through `frontend/src/config/api.js` (Axios instance with interceptors)
- JWT token auto-attached from localStorage
- Company ID auto-attached for SUPER_ADMIN users
- Built-in retry logic (3 retries) for network errors and 5xx responses
- Cookies enabled (`withCredentials: true`) for httpOnly cookie support

### Authentication & Authorization
- JWT-based auth: httpOnly cookie (primary) or Bearer token in localStorage (fallback)
- Roles: `SUPER_ADMIN`, `ADMIN`, `HR`, `MANAGER`, `EMPLOYEE`
- Backend middleware in `backend/src/middleware/auth.js`:
  - `authenticate()` - verifies JWT, attaches user to request
  - `authorize(...roles)` - checks role permissions (SUPER_ADMIN bypasses all)
  - `requireCompany` - ensures company context for operations
- Multi-company support: SUPER_ADMIN can switch companies via `selectedCompany` in localStorage

### Key Directories
```
frontend/src/
├── components/     # React components by feature (employee/, salary/, attendance/, etc.)
├── services/       # API integration layer (one service per resource)
├── config/api.js   # Axios config with auth interceptors
└── hooks/          # Custom hooks (usePagination)

backend/src/
├── controllers/    # Route handlers
├── middleware/     # auth.js (JWT + RBAC), errorHandler.js, upload.js
├── routes/         # API endpoint definitions
├── config/         # database.js (MySQL connection pool)
└── utils/          # helpers.js, validators.js, pagination.js, auditLogger.js
```

### Salary Calculation Logic
See `SALARY_SYSTEM_SPECIFICATION.md` for detailed payroll formulas.

Key rules:
- **PF**: ₹1,800 fixed if Basic >= ₹15,000, else Basic × 12%
- **ESI**: 0.75% of Gross if Gross < ₹21,000, else 0
- **Net Payable**: `((Gross - Deductions) / Total Days) × Days Present`

### Backend Patterns
- Database queries: Use `executeQuery()` from `backend/src/config/database.js`
- Company filtering: `getCompanyFilter(req)` and `buildCompanyFilter(alias, req)` in auth.js
- File uploads: Multer stores in `backend/uploads/` (offer-letters, aadhaar-cards, pan-cards)
- Pagination: `paginate(page, limit)` and `buildPaginationResponse()` in helpers.js
- Indian document validation: `isValidAadhaar()`, `isValidPAN()`, `isValidIFSC()` in helpers.js

### Frontend Patterns
- Services abstract all API calls (e.g., `employeeService.getAllEmployees()`)
- Mock data toggle: `USE_MOCK_DATA` flag in service files
- Toast notifications via react-toastify for all user feedback
- API errors auto-handled by interceptor (401 redirects to login, shows toast for others)

## Environment Variables

### Backend (.env)
```
DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME
PORT=5000
JWT_SECRET, JWT_EXPIRES_IN
```

### Frontend (.env)
```
VITE_API_URL=http://localhost:5000/api/v1
```

## Production Deployment
PM2 config in `ecosystem.config.js` - runs backend on port 8001, serves frontend build on port 8000.

## Auto-Generated Codes & IDs

### Employee
- **employee_id**: Auto-increment (database primary key)
- **employee_code**: Auto-generated as `P0001`, `P0002`, `P0003`... (generated via `generateEmployeeCode()` in helpers.js)

### Site
- **site_id**: Auto-increment (database primary key)
- **site_code**: Auto-generated as `SITE001`, `SITE002`... (generated via `generateSiteCode()` in helpers.js)

### Candidate (Planned)
- **candidate_id**: Auto-increment (database primary key)
- **candidate_code**: Auto-generated as `C0001`, `C0002`...
- **offer_letter_ref**: Auto-generated as `OL/YYYY-YY/001` format (e.g., `OL/2025-26/001`)

## Modules

### Implemented
- Employee Management (CRUD, documents, validation)
- Salary Management (structure, PF/ESI calculation)
- Payslip Generation (single, bulk, PDF export, bonus)
- Attendance (calendar, finalize, bulk import)
- Sites/Projects Management
- Multi-Company Support
- User Authentication & RBAC
- Audit Logging

### Planned
- **Candidates Module**: Pre-joining candidate tracking with offer letter generation
  - Workflow: Add Candidate → Enter Salary → Generate Offer Letter → Convert to Employee
  - Statuses: PENDING → OFFERED → ACCEPTED / REJECTED / NEGOTIATING
