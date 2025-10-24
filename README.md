# RFM - Angular + Node.js + Fabric.js Canvas Editor

A powerful canvas editor built with Angular 20, Node.js, Express, and Fabric.js. This application provides an interactive canvas interface for creating, editing, and managing graphical content with a full-stack architecture.

## 🚀 Features

### Frontend (Angular 20)
- **Interactive Canvas**: Built with Fabric.js for rich canvas interactions
- **Shape Creation**: Add rectangles, circles, and text elements
- **Object Manipulation**: Move, resize, and delete canvas objects
- **Export Functionality**: Download canvas as PNG images
- **Responsive Design**: Mobile-friendly interface
- **Server-Side Rendering (SSR)**: Optimized for performance and SEO
- **Modern Angular**: Uses standalone components and signals

### Backend (Node.js + Express)
- **RESTful API**: Well-structured API endpoints
- **Canvas Management**: Save and retrieve canvas data
- **CORS Support**: Cross-origin resource sharing enabled
- **Error Handling**: Comprehensive error management
- **TypeScript**: Fully typed backend implementation

## 🛠️ Tech Stack

- **Frontend**: Angular 20, TypeScript, Fabric.js, RxJS
- **Backend**: Node.js, Express.js, TypeScript
- **Build Tools**: Angular CLI, Webpack
- **Styling**: CSS3, Flexbox, CSS Grid
- **Development**: Hot reload, Source maps

## 📦 Installation

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn
- XAMPP (for MySQL database)

### Database Setup
1. **Install and Start XAMPP:**
   - Download XAMPP from [https://www.apachefriends.org/](https://www.apachefriends.org/)
   - Install XAMPP and start the MySQL service
   - Access phpMyAdmin at `http://localhost/phpmyadmin`

2. **Create Database:**
   ```sql
   CREATE DATABASE rfm_db;
   ```

3. **Configure Environment Variables:**
   - Copy the `.env` file and update database credentials if needed:
   ```env
   DB_HOST=localhost
   DB_PORT=3306
   DB_USER=root
   DB_PASSWORD=
   DB_NAME=rfm_db
   ```

### Application Setup
1. Clone the repository:
```bash
git clone https://github.com/[your-username]/rfm.git
cd rfm
```

2. Install dependencies:
```bash
npm install
```

3. Build the application:
```bash
npm run build
```

4. Start the server:
```bash
npm run serve:ssr:my-angular-app
```

The application will be available at `http://localhost:4000`

**Note:** The database tables will be created automatically when the server starts for the first time.

## 🚀 Development

### Development Server
```bash
npm run start:dev
```
Runs the Angular development server on `http://localhost:4200`

### Build for Production
```bash
npm run build:prod
```

### Run Tests
```bash
npm test
```

## 📚 API Endpoints

### Health Check
- **GET** `/api/health` - Server health status (includes database connectivity)

### Canvas Operations
- **POST** `/api/canvas/save` - Save canvas data to MySQL database
- **GET** `/api/canvas/list` - Get list of saved canvases from database
- **GET** `/api/canvas/:id` - Get specific canvas data from database
- **PUT** `/api/canvas/:id` - Update existing canvas in database
- **DELETE** `/api/canvas/:id` - Delete canvas from database

### API Response Format
```json
{
  "success": true,
  "message": "Operation successful",
  "data": { /* response data */ }
}
```

## 🎨 Canvas Features

### Available Tools
- **Add Rectangle**: Create rectangular shapes
- **Add Circle**: Create circular shapes  
- **Add Text**: Add text elements
- **Delete Selected**: Remove selected objects
- **Clear Canvas**: Clear entire canvas
- **Save Canvas**: Save to backend
- **Export PNG**: Download as image

### Canvas Interactions
- **Click & Drag**: Move objects around
- **Corner Handles**: Resize objects
- **Selection**: Click to select objects
- **Multi-selection**: Select multiple objects

## 🏗️ Project Structure

```
src/
├── app/
│   ├── canvas/              # Canvas component
│   │   ├── canvas.ts        # Component logic
│   │   ├── canvas.html      # Template
│   │   └── canvas.css       # Styles
│   ├── services/            # Angular services
│   │   └── api.ts          # API service
│   ├── app.ts              # Root component
│   └── app.config.ts       # App configuration
├── server.ts               # Express server
└── main.ts                 # Angular bootstrap
```

## 🔧 Configuration

### Environment Variables
- `PORT`: Server port (default: 4000)
- `DB_HOST`: Database host (default: localhost)
- `DB_PORT`: Database port (default: 3306)
- `DB_USER`: Database username (default: root)
- `DB_PASSWORD`: Database password (default: empty)
- `DB_NAME`: Database name (default: rfm_db)

### Database Configuration
- **Engine**: MySQL 8.0+ (via XAMPP)
- **Connection Pool**: 10 connections
- **Auto-reconnect**: Enabled
- **Table Creation**: Automatic on first run

### Angular Configuration
- SSR enabled by default
- HttpClient with fetch API
- Standalone components architecture
- Fabric.js integration with dynamic imports

### Database Schema
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

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Commit changes: `git commit -am 'Add feature'`
4. Push to branch: `git push origin feature-name`
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Angular](https://angular.io/) - The web framework
- [Fabric.js](http://fabricjs.com/) - Canvas library
- [Express.js](https://expressjs.com/) - Backend framework
- [Node.js](https://nodejs.org/) - Runtime environment
- [MySQL](https://www.mysql.com/) - Database system
- [XAMPP](https://www.apachefriends.org/) - Development environment

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

### Application Issues
1. **Build Errors:**
   - Clear node_modules: `rm -rf node_modules && npm install`
   - Check TypeScript version compatibility

2. **Canvas Not Loading:**
   - Ensure Fabric.js is properly imported
   - Check browser console for JavaScript errors

## 📞 Support

For support, please open an issue in the GitHub repository or contact the maintainers.

---

**Built with ❤️ using Angular, Node.js, and Fabric.js**
