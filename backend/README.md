# RFM Backend API

A Node.js/Express backend API for the RFM Canvas Editor application with MySQL database integration.

## 🚀 Features

- **RESTful API**: Well-structured API endpoints for canvas operations
- **MySQL Integration**: Full database connectivity with XAMPP
- **TypeScript**: Fully typed backend implementation
- **Error Handling**: Comprehensive error management
- **CORS Support**: Cross-origin resource sharing enabled
- **Health Monitoring**: Database connectivity health checks

## 📦 Installation

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn
- XAMPP with MySQL running

### Setup
1. Navigate to backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables:
```bash
cp .env.example .env
# Edit .env with your database credentials
```

4. Build the application:
```bash
npm run build
```

5. Start the server:
```bash
npm start
```

The backend API will be available at `http://localhost:3001`

## 🛠️ Development

### Development Server
```bash
npm run dev
```

### Watch Mode (with auto-restart)
```bash
npm run dev:watch
```

### Build for Production
```bash
npm run build
```

## 📚 API Endpoints

### Health Check
- **GET** `/api/health` - Server and database health status

### Canvas Operations
- **POST** `/api/canvas/save` - Save canvas data to database
- **GET** `/api/canvas/list` - Get list of saved canvases
- **GET** `/api/canvas/:id` - Get specific canvas data
- **PUT** `/api/canvas/:id` - Update existing canvas
- **DELETE** `/api/canvas/:id` - Delete canvas from database

### API Response Format
```json
{
  "success": true,
  "message": "Operation successful",
  "data": { /* response data */ }
}
```

## 🗄️ Database Schema

### Canvases Table
```sql
CREATE TABLE canvases (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  canvas_data JSON NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_name (name),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

## 🔧 Configuration

### Environment Variables
- `PORT`: Server port (default: 3001)
- `DB_HOST`: Database host (default: localhost)
- `DB_PORT`: Database port (default: 3306)
- `DB_USER`: Database username (default: root)
- `DB_PASSWORD`: Database password (default: empty)
- `DB_NAME`: Database name (default: rfm_db)
- `NODE_ENV`: Environment (development/production)

### Database Configuration
- **Engine**: MySQL 8.0+ (via XAMPP)
- **Connection Pool**: 10 connections
- **Auto-reconnect**: Enabled
- **Table Creation**: Automatic on first run

## 📁 Project Structure

```
backend/
├── src/
│   ├── config/
│   │   └── database.ts          # Database connection config
│   ├── services/
│   │   └── database.service.ts  # Database operations
│   ├── routes/
│   │   └── canvas.routes.ts     # API route handlers
│   └── server.ts                # Main server file
├── dist/                        # Compiled JavaScript
├── package.json
├── tsconfig.json
├── .env
└── README.md
```

## 🔧 Troubleshooting

### Database Connection Issues
1. **ECONNREFUSED Error:**
   - Ensure XAMPP MySQL service is running
   - Check if port 3306 is available
   - Verify database credentials in `.env`

2. **Database Not Found:**
   - Create the `rfm_db` database in phpMyAdmin
   - Check database name in `.env` file

3. **Permission Denied:**
   - Verify MySQL user permissions
   - Check if root user has access to the database

### Build Issues
1. **TypeScript Errors:**
   - Check TypeScript version compatibility
   - Verify all dependencies are installed

2. **Module Import Errors:**
   - Ensure proper import syntax
   - Check tsconfig.json configuration

## 📄 License

This project is licensed under the MIT License.