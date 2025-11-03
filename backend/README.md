# HRMS Backend API

Express.js REST API backend for the Human Resource Management System (HRMS).

## Features

- ✅ RESTful API architecture
- ✅ MySQL database with connection pooling
- ✅ JWT-based authentication
- ✅ File upload handling (Multer)
- ✅ Input validation (express-validator)
- ✅ Security headers (Helmet)
- ✅ CORS enabled
- ✅ Request logging (Morgan)
- ✅ Environment-based configuration
- ✅ Error handling middleware
- ✅ Transaction support

## Tech Stack

- **Runtime:** Node.js
- **Framework:** Express.js 5.x
- **Database:** MySQL 5.7+ / MariaDB 10.2+
- **Authentication:** JWT (jsonwebtoken)
- **Password Hashing:** bcryptjs
- **File Upload:** Multer
- **Validation:** express-validator
- **Security:** Helmet, CORS

## Project Structure

```
backend/
├── database/                 # Database schema and seeds
│   ├── migrations/          # SQL migration scripts
│   └── seeds/               # Seed data
├── src/
│   ├── config/              # Configuration files
│   │   └── database.js      # Database connection
│   ├── controllers/         # Route controllers
│   ├── middleware/          # Custom middleware
│   ├── models/              # Database models
│   ├── routes/              # API routes
│   │   ├── authRoutes.js
│   │   ├── employeeRoutes.js
│   │   ├── siteRoutes.js
│   │   ├── salaryRoutes.js
│   │   ├── payslipRoutes.js
│   │   └── attendanceRoutes.js
│   ├── utils/               # Utility functions
│   ├── validators/          # Input validators
│   └── app.js               # Express app setup
├── uploads/                 # File uploads directory
│   ├── offer-letters/
│   ├── aadhaar-cards/
│   └── pan-cards/
├── .env                     # Environment variables (not in git)
├── .env.example             # Environment template
├── server.js                # Entry point
└── package.json             # Dependencies

```

## Installation

### 1. Clone the repository
```bash
cd backend
```

### 2. Install dependencies
```bash
npm install
```

### 3. Set up environment variables
```bash
# Copy the example env file
cp .env.example .env

# Edit .env with your configuration
nano .env  # or use your preferred editor
```

### 4. Configure database connection
Update `.env` with your MySQL credentials:
```env
DB_HOST=localhost
DB_PORT=3306
DB_NAME=hrms_db
DB_USER=root
DB_PASSWORD=your_password
```

### 5. Set up the database
```bash
# Run the database migration script
mysql -u root -p < database/migrations/001_create_database.sql

# (Optional) Load seed data for testing
mysql -u root -p < database/seeds/001_seed_data.sql
```

## Running the Server

### Development mode (with auto-reload)
```bash
npm run dev
```

### Production mode
```bash
npm start
```

The server will start on `http://localhost:5000` (or your configured PORT).

## API Endpoints

### Base URL
```
http://localhost:5000/api/v1
```

### Health Check
```http
GET /api/v1/health
```

### Authentication
```http
POST   /api/v1/auth/login          # User login
POST   /api/v1/auth/register       # User registration
POST   /api/v1/auth/logout         # User logout
GET    /api/v1/auth/me             # Get current user
```

### Employees
```http
GET    /api/v1/employees           # Get all employees
GET    /api/v1/employees/:id       # Get employee by ID
POST   /api/v1/employees           # Create employee
PUT    /api/v1/employees/:id       # Update employee
DELETE /api/v1/employees/:id       # Delete/deactivate employee
GET    /api/v1/employees/active    # Get active employees
```

### Sites/Clients
```http
GET    /api/v1/sites               # Get all sites
GET    /api/v1/sites/:id           # Get site by ID
POST   /api/v1/sites               # Create site
PUT    /api/v1/sites/:id           # Update site
DELETE /api/v1/sites/:id           # Delete site
GET    /api/v1/sites/active        # Get active sites
```

### Salaries
```http
GET    /api/v1/salaries            # Get all salary structures
GET    /api/v1/salaries/:id        # Get salary by ID
POST   /api/v1/salaries            # Create salary structure
PUT    /api/v1/salaries/:id        # Update salary structure
DELETE /api/v1/salaries/:id        # Deactivate salary structure
GET    /api/v1/salaries/summary    # Get salary summary
GET    /api/v1/salaries/employee/:id  # Get salary by employee
```

### Payslips
```http
GET    /api/v1/payslips            # Get all payslips
GET    /api/v1/payslips/:id        # Get payslip by ID
POST   /api/v1/payslips/generate   # Generate payslip
PUT    /api/v1/payslips/:id        # Update payslip
GET    /api/v1/payslips/month/:month  # Get payslips by month
PUT    /api/v1/payslips/:id/payment-status  # Update payment status
```

### Attendance
```http
GET    /api/v1/attendance          # Get attendance records
POST   /api/v1/attendance/mark     # Mark attendance
GET    /api/v1/attendance/employee/:id  # Get employee attendance
GET    /api/v1/attendance/report   # Get attendance report
```

## Authentication

The API uses JWT (JSON Web Tokens) for authentication.

### Login
```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "admin123"
}
```

### Response
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "user_id": 1,
    "username": "admin",
    "role": "ADMIN"
  }
}
```

### Using the Token
Include the token in subsequent requests:
```http
Authorization: Bearer YOUR_JWT_TOKEN
```

## File Uploads

The API supports file uploads for:
- Offer Letters
- Aadhaar Cards
- PAN Cards

### Upload Endpoint Example
```http
POST /api/v1/employees
Content-Type: multipart/form-data

{
  "firstName": "John",
  "lastName": "Doe",
  "offerLetter": [file],
  "aadhaarCard": [file],
  "panCard": [file],
  ...
}
```

### File Constraints
- **Max Size:** 5 MB per file
- **Allowed Types:** PDF, DOC, DOCX, JPG, PNG
- **Storage:** `/uploads/{category}/`

## Error Handling

The API returns consistent error responses:

### Success Response
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation successful"
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error description",
  "errors": ["Detailed error 1", "Detailed error 2"]
}
```

### HTTP Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation error)
- `401` - Unauthorized (invalid/missing token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `500` - Internal Server Error

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | development |
| `PORT` | Server port | 5000 |
| `DB_HOST` | Database host | localhost |
| `DB_PORT` | Database port | 3306 |
| `DB_NAME` | Database name | hrms_db |
| `DB_USER` | Database user | root |
| `DB_PASSWORD` | Database password | - |
| `JWT_SECRET` | JWT signing secret | - |
| `JWT_EXPIRES_IN` | Token expiry | 24h |
| `CORS_ORIGIN` | Allowed origin | http://localhost:5174 |

## Security

### Best Practices Implemented
- ✅ Helmet.js for security headers
- ✅ CORS configuration
- ✅ JWT token authentication
- ✅ Password hashing with bcrypt
- ✅ Input validation and sanitization
- ✅ SQL injection protection (parameterized queries)
- ✅ File upload validation
- ✅ Rate limiting (configurable)
- ✅ Environment-based secrets

### Production Checklist
- [ ] Change default JWT_SECRET
- [ ] Use strong database password
- [ ] Enable HTTPS
- [ ] Set NODE_ENV=production
- [ ] Configure proper CORS origins
- [ ] Enable rate limiting
- [ ] Set up logging
- [ ] Configure backup strategy
- [ ] Use environment secrets manager

## Database Connection

The API uses MySQL connection pooling for optimal performance:
- **Connection Limit:** 10 concurrent connections
- **Auto-reconnect:** Enabled
- **Keep-alive:** Enabled

### Test Connection
```javascript
const { testConnection } = require('./src/config/database');
testConnection();
```

## Logging

The API uses Morgan for HTTP request logging:
- **Development:** Colorful detailed logs
- **Production:** Apache combined format

## Development

### Install dependencies
```bash
npm install
```

### Run in development mode
```bash
npm run dev
```

### Run in production mode
```bash
npm start
```

## Troubleshooting

### Database Connection Failed
- Verify MySQL is running: `mysql -u root -p`
- Check credentials in `.env`
- Ensure database exists: `SHOW DATABASES;`

### Port Already in Use
- Change PORT in `.env`
- Or kill existing process: `netstat -ano | findstr :5000`

### File Upload Not Working
- Check `uploads/` directory permissions
- Verify MAX_FILE_SIZE setting
- Check ALLOWED_FILE_TYPES

## Testing

Test the API using:
- **Postman** (import collection - coming soon)
- **cURL** commands
- **Frontend** (http://localhost:5174)

### Quick Test
```bash
curl http://localhost:5000/api/v1/health
```

## Next Steps

1. ✅ Backend server setup complete
2. 🔲 Implement API controllers
3. 🔲 Add authentication logic
4. 🔲 Create validation rules
5. 🔲 Connect with frontend
6. 🔲 Add unit tests
7. 🔲 Deploy to production

## Support

For issues or questions, please check:
- Database schema documentation: `/database/README.md`
- API documentation: This file
- Environment setup: `.env.example`

## License

ISC
