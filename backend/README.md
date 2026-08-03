# Bus Booking & Fleet Management System - Backend API

A comprehensive Node.js backend API for managing bus bookings, fleet operations, and administrative functions.

## 🚀 Features

- **User Management**: Customer registration, authentication, and profile management
- **Driver & Conductor Management**: Crew member registration with document verification
- **Fleet Management**: Bus registration, maintenance tracking, and status monitoring
- **Route Management**: Route creation with stops, distance, and timing information
- **Booking System**: Complete booking lifecycle with payment tracking
- **Onboard Scheduling**: Trip scheduling with crew assignment
- **Rating & Reviews**: Customer feedback system with moderation
- **Analytics Dashboard**: Comprehensive reporting and statistics
- **File Upload**: Document and image management
- **Security**: JWT authentication, input validation, and rate limiting

## 📋 Prerequisites

- Node.js (v16 or higher)
- MongoDB (v4.4 or higher)
- npm or yarn

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   cd backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   ```bash
   cp env.example .env
   ```
   
   Edit `.env` file with your configuration:
   ```env
   PORT=5000
   NODE_ENV=development
   MONGODB_URI=mongodb://localhost:27017/bus_booking_system
   JWT_SECRET=your_super_secret_jwt_key_here
   JWT_EXPIRE=7d
   ADMIN_USERNAME=admin
   ADMIN_PASSWORD=admin123
   ADMIN_EMAIL=admin@busbooking.com
   FRONTEND_URL=http://localhost:3000
   
   # Cloudinary Configuration
   CLOUDINARY_CLOUD_NAME=your_cloud_name
   CLOUDINARY_API_KEY=your_api_key
   CLOUDINARY_API_SECRET=your_api_secret
   ```

4. **Start MongoDB**
   ```bash
   # Using MongoDB service
   sudo systemctl start mongod
   
   # Or using Docker
   docker run -d -p 27017:27017 --name mongodb mongo:latest
   ```

5. **Run the application**
   ```bash
   # Development mode
   npm run dev
   
   # Production mode
   npm start
   ```

## 📚 API Documentation

### Base URL
```
http://localhost:5000/api
```

### Authentication

All protected routes require a Bearer token in the Authorization header:
```
Authorization: Bearer <your_jwt_token>
```

### API Endpoints

#### Authentication (`/api/auth`)
- `POST /register` - Register new user
- `POST /login` - User login
- `POST /admin-login` - Admin login
- `GET /me` - Get current user profile
- `PUT /profile` - Update user profile
- `POST /change-password` - Change password
- `POST /logout` - Logout user

#### Users (`/api/users`)
- `GET /` - Get all users (Admin only)
- `GET /:id` - Get user by ID
- `POST /` - Create new user (Admin only)
- `PUT /:id` - Update user
- `DELETE /:id` - Delete user (Admin only)
- `GET /:id/bookings` - Get user's booking history
- `GET /stats/overview` - Get user statistics

#### Drivers (`/api/drivers`)
- `GET /` - Get all drivers
- `GET /:id` - Get driver by ID
- `POST /` - Create new driver (Admin only)
- `PUT /:id` - Update driver (Admin only)
- `DELETE /:id` - Delete driver (Admin only)
- `GET /:id/trips` - Get driver's assigned trips
- `PUT /:id/status` - Update driver status
- `GET /stats/overview` - Get driver statistics

#### Buses (`/api/buses`)
- `GET /` - Get all buses
- `GET /:id` - Get bus by ID
- `POST /` - Create new bus (Admin only)
- `PUT /:id` - Update bus (Admin only)
- `DELETE /:id` - Delete bus (Admin only)
- `GET /:id/trips` - Get bus's assigned trips
- `PUT /:id/status` - Update bus status
- `POST /:id/maintenance` - Add maintenance record
- `GET /stats/overview` - Get bus statistics

#### Routes (`/api/routes`)
- `GET /` - Get all routes
- `GET /stops/suggest` - Get stop name suggestions (autocomplete for search)
- `GET /:id` - Get route by ID
- `POST /` - Create new route (Admin only)
- `PUT /:id` - Update route (Admin only)
- `DELETE /:id` - Delete route (Admin only)
- `GET /:id/trips` - Get route's assigned trips
- `PUT /:id/status` - Update route status
- `GET /stats/overview` - Get route statistics

#### Bookings (`/api/bookings`)
- `GET /` - Get all bookings
- `GET /:id` - Get booking by ID
- `POST /` - Create new booking
- `PUT /:id` - Update booking
- `DELETE /:id` - Cancel booking
- `PUT /:id/status` - Update booking status (Admin only)
- `PUT /:id/payment` - Update payment status (Admin only)
- `GET /stats/overview` - Get booking statistics

#### Onboard Schedules (`/api/onboard`)
- `GET /` - Get all onboard schedules
- `GET /search` - Search buses by origin, destination, and date (for mobile app)
- `GET /:id` - Get onboard schedule by ID
- `POST /` - Create new onboard schedule (Admin only)
- `PUT /:id` - Update onboard schedule (Admin only)
- `DELETE /:id` - Delete onboard schedule (Admin only)
- `PUT /:id/status` - Update schedule status
- `PUT /:id/team` - Update assigned team
- `GET /stats/overview` - Get schedule statistics

#### Ratings (`/api/ratings`)
- `GET /` - Get all ratings
- `GET /:id` - Get rating by ID
- `POST /` - Create new rating
- `PUT /:id` - Update rating
- `DELETE /:id` - Delete rating
- `PUT /:id/status` - Update rating status (Admin only)
- `POST /:id/helpful` - Mark rating as helpful
- `POST /:id/report` - Report rating
- `GET /stats/overview` - Get rating statistics

#### Analytics (`/api/analytics`)
- `GET /dashboard` - Get dashboard analytics (Admin only)
- `GET /revenue` - Get revenue analytics (Admin only)
- `GET /bookings` - Get booking analytics (Admin only)
- `GET /fleet` - Get fleet analytics (Admin only)

#### File Upload (`/api/upload`)
- `POST /single` - Upload single file
- `POST /multiple` - Upload multiple files
- `POST /driver-documents` - Upload driver documents (Admin only)
- `POST /bus-documents` - Upload bus documents and images (Admin only)
- `DELETE /:publicId` - Delete file from Cloudinary (Admin only)

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | 5000 |
| `NODE_ENV` | Environment | development |
| `MONGODB_URI` | MongoDB connection string | mongodb://localhost:27017/bus_booking_system |
| `JWT_SECRET` | JWT secret key | - |
| `JWT_EXPIRE` | JWT expiration time | 7d |
| `ADMIN_USERNAME` | Admin username | admin |
| `ADMIN_PASSWORD` | Admin password | admin123 |
| `ADMIN_EMAIL` | Admin email | admin@busbooking.com |
| `FRONTEND_URL` | Frontend URL for CORS | http://localhost:3000 |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name | - |
| `CLOUDINARY_API_KEY` | Cloudinary API key | - |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret | - |

### Database Models

#### User
- Personal information (name, email, mobile)
- Authentication (password, userType)
- Account details and preferences
- Booking history

#### Driver
- Personal and family information
- Contact details
- Document verification (Aadhar, PAN, License)
- Bank account details
- Experience and status

#### Bus
- Vehicle information (name, number, capacity)
- Document management (RC, Insurance, Pollution)
- Image gallery
- Maintenance history
- Status tracking

#### Route
- Route details (name, start point)
- Stop information with distances and timings
- Pricing configuration
- Status management

#### Booking
- Customer and trip information
- Seat selection
- Payment details
- Status tracking
- Special requests

#### OnboardSchedule
- Trip scheduling
- Crew assignment
- Pricing configuration
- Status tracking
- Performance metrics

#### Rating
- Customer feedback
- Multi-dimensional ratings
- Moderation system
- Helpful votes and reports

## 🔒 Security Features

- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: bcrypt for password security
- **Input Validation**: Comprehensive request validation
- **Rate Limiting**: API rate limiting to prevent abuse
- **CORS Protection**: Configurable CORS settings
- **Helmet Security**: Security headers
- **Data Sanitization**: Input sanitization and validation

## 📊 Monitoring & Logging

- **Morgan Logging**: HTTP request logging
- **Error Handling**: Centralized error handling
- **Health Check**: `/health` endpoint for monitoring
- **Performance Metrics**: Built-in analytics

## 🚀 Deployment

### Using PM2
```bash
npm install -g pm2
pm2 start src/app.js --name bus-booking-api
pm2 startup
pm2 save
```

### Using Docker
```dockerfile
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE 5000
CMD ["npm", "start"]
```

### Environment Setup
```bash
# Production environment
NODE_ENV=production
MONGODB_URI=mongodb://your-production-db
JWT_SECRET=your-production-secret
```

## 🧪 Testing

```bash
# Run tests
npm test

# Run with coverage
npm run test:coverage
```

## 📝 API Usage Examples

### User Registration
```javascript
const response = await fetch('/api/auth/register', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: 'John Doe',
    email: 'john@example.com',
    mobile: '+919876543210',
    password: 'password123'
  })
});
```

### Create Booking
```javascript
const response = await fetch('/api/bookings', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer your-jwt-token'
  },
  body: JSON.stringify({
    scheduleId: 'schedule-id',
    seats: ['A1', 'A2'],
    fare: 1800,
    travelDate: '2024-03-15'
  })
});
```

### Upload Driver Documents
```javascript
const formData = new FormData();
formData.append('aadharFront', aadharFrontFile);
formData.append('aadharBack', aadharBackFile);
formData.append('panCard', panCardFile);
formData.append('drivingLicense', licenseFile);
formData.append('profileImage', profileImageFile);

const response = await fetch('/api/upload/driver-documents', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer your-jwt-token'
  },
  body: formData
});
```

### Upload Bus Documents and Images
```javascript
const formData = new FormData();
formData.append('rcDocument', rcDocumentFile);
formData.append('pollutionCertificate', pollutionFile);
formData.append('insuranceCertificate', insuranceFile);
formData.append('frontImage', frontImageFile);
formData.append('rearImage', rearImageFile);
formData.append('leftImage', leftImageFile);
formData.append('rightImage', rightImageFile);

const response = await fetch('/api/upload/bus-documents', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer your-jwt-token'
  },
  body: formData
});
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Contact the development team
- Check the documentation

## 🔄 Updates

- **v1.0.0**: Initial release with core functionality
- **v1.1.0**: Added analytics and reporting
- **v1.2.0**: Enhanced security and validation
- **v1.3.0**: Added file upload capabilities
