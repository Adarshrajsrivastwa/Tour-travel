# Admin Dashboard - Bus Booking & GR Tour & Travel Management System

A React-based admin dashboard for managing bus bookings, GR Tour & Travel operations, drivers, routes, and analytics.

## 🚀 Features

- **User Management**: View and manage customer accounts
- **Driver & Conductor Management**: Register and manage crew members with document verification
- **GR Tour & Travel Management**: Bus registration, maintenance tracking, and status monitoring
- **Route Management**: Create and manage routes with stops and pricing
- **Booking Management**: View and manage all bookings
- **Onboard Scheduling**: Schedule trips and assign crew
- **Ratings & Reviews**: Moderate customer feedback
- **Analytics Dashboard**: Comprehensive reporting and statistics

## 📋 Prerequisites

- Node.js (v16 or higher)
- npm or yarn

## 🛠️ Installation

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Environment Setup**

   ```bash
   cp .env.example .env
   ```

   Edit `.env` file with your backend API URL:

   ```env
   # Backend API Base URL (include /api at the end)
   VITE_BASE_URL=http://localhost:5000/api

   # For production:
   # VITE_BASE_URL=https://your-backend-domain.com/api
   ```

3. **Run the application**

   ```bash
   # Development mode
   npm run dev

   # Production build
   npm run build

   # Preview production build
   npm run preview
   ```

## 🔧 Configuration

### Environment Variables

| Variable        | Description                                           | Default                     |
| --------------- | ----------------------------------------------------- | --------------------------- |
| `VITE_BASE_URL` | Backend API base URL (must include `/api` at the end) | `http://localhost:5000/api` |

**Important**:

- The `VITE_BASE_URL` must point to your backend API server
- Always include `/api` at the end of the URL
- For Vite, environment variables must be prefixed with `VITE_` to be accessible in the browser

## 🚀 Deployment

### Building for Production

```bash
npm run build
```

The production build will be in the `dist/` directory.

### Deploying to Netlify/Vercel

1. Build the project: `npm run build`
2. Set environment variable `VITE_BASE_URL` in your hosting platform
3. Deploy the `dist/` folder

### Environment Variables in Production

Make sure to set `VITE_BASE_URL` in your hosting platform's environment variables:

- **Netlify**: Site settings → Environment variables
- **Vercel**: Project settings → Environment variables
- **Other platforms**: Check their documentation for setting environment variables

## 📝 API Integration

The admin dashboard communicates with the backend API using:

- **Base URL**: Configured via `VITE_BASE_URL` environment variable
- **Authentication**: JWT tokens stored in localStorage
- **Axios Instance**: Configured in `src/api/axiosInstance.js`

All API calls automatically include the authentication token from localStorage.

## 🔒 Security

- Authentication tokens are stored in localStorage
- Tokens are automatically included in all API requests
- Automatic logout on 401 (unauthorized) responses
- Protected routes require valid authentication

## 🆘 Troubleshooting

### API Connection Issues

1. Check that `VITE_BASE_URL` is correctly set in your `.env` file
2. Ensure the backend server is running
3. Verify CORS is configured correctly on the backend
4. Check browser console for error messages

### Build Issues

1. Clear node_modules and reinstall: `rm -rf node_modules && npm install`
2. Clear Vite cache: `rm -rf node_modules/.vite`
3. Check Node.js version: `node --version` (should be v16+)

## 📄 License

This project is licensed under the MIT License.
