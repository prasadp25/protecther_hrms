# ProtectHer HRMS - Human Resource Management System

A full-stack HRMS (Human Resource Management System) application for construction staffing management.

## Project Structure

This is a monorepo containing both frontend and backend applications:

```
protecther_hrms/
├── frontend/          # React + Vite frontend application
└── backend/           # Spring Boot backend API
```

## Features

- **Employee Management** - Create, edit, view, and manage employee records
- **Attendance Tracking** - Calendar view, mark attendance, and generate reports
- **Salary & Payroll** - Manage salary structures and generate payslips
- **Dashboard** - Overview with key metrics and analytics
- **File Upload** - Document management for employees

## Tech Stack

### Frontend
- React 18
- Vite
- Tailwind CSS
- Axios for API calls

### Backend
- Java 17
- Spring Boot 3
- Spring Data JPA
- H2 Database (development)
- Maven

## Getting Started

### Prerequisites
- Node.js 18+ and npm
- Java 17+
- Maven 3.6+

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

The frontend will run on `http://localhost:5173`

### Backend Setup

```bash
cd backend
mvn clean install
mvn spring-boot:run
```

The backend API will run on `http://localhost:8080`

## API Endpoints

### Employee Management
- `GET /api/employees` - Get all employees
- `GET /api/employees/{id}` - Get employee by ID
- `POST /api/employees` - Create new employee
- `PUT /api/employees/{id}` - Update employee
- `DELETE /api/employees/{id}` - Delete employee

### File Upload
- `POST /api/files/employee/{employeeId}/upload` - Upload employee documents

## Development

### Frontend Development
The frontend uses mock data by default. To connect to the real backend API, update the `USE_MOCK_DATA` flag in service files to `false`.

### Backend Development
The backend uses H2 in-memory database for development. Access H2 console at `http://localhost:8080/h2-console`.

## Contributing

1. Create a feature branch
2. Make your changes
3. Test thoroughly
4. Submit a pull request

## License

Private - All rights reserved

## Author

**Prasad Palekar** (prasadp25)
