const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const swaggerUi = require("swagger-ui-express");
const swaggerSpecs = require("./config/swagger");
require("dotenv").config();

// Validate environment variables before starting
const { validateEnv } = require("./utils/envValidator");
try {
  validateEnv();
  console.log("✅ Environment variables validated");
} catch (error) {
  console.error("❌ Environment validation failed:", error.message);
  process.exit(1);
}

// Import email utility
const { verifyEmailConnection } = require("./utils/email");

// Import routes
const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/users");
const driverRoutes = require("./routes/drivers");
const busRoutes = require("./routes/buses");
const routeRoutes = require("./routes/routes");
const bookingRoutes = require("./routes/bookings");
const onboardRoutes = require("./routes/onboard");
const ratingRoutes = require("./routes/ratings");
const analyticsRoutes = require("./routes/analytics");
const uploadRoutes = require("./routes/upload");
const adminRoutes = require("./routes/admin");
const exportRoutes = require("./routes/exports");

// Import middleware
const errorHandler = require("./middleware/errorHandler");

const app = express();

// --------------------------------------------------------
// Security (Helmet) — using ENV variables
// --------------------------------------------------------
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        "default-src": ["'self'"],
        "connect-src": [
          "'self'",
          process.env.SERVER_URL,
          process.env.FRONTEND_URL,
        ].filter(Boolean),
        "img-src": [
          "'self'",
          "data:",
          process.env.SERVER_URL,
        ].filter(Boolean),
        "script-src": [
          "'self'",
          "'unsafe-inline'",
          "https://cdn.jsdelivr.net",
          "https://unpkg.com",
        ],
        "style-src": [
          "'self'",
          "'unsafe-inline'",
          "https://fonts.googleapis.com",
          "https://cdn.jsdelivr.net",
          "https://unpkg.com",
        ],
      },
    },
  })
);

app.use(compression());

// --------------------------------------------------------
// CORS — using ENV variable only
// --------------------------------------------------------
const allowedOrigins = [
  process.env.FRONTEND_URL, 
  process.env.SERVER_URL,
  ...(process.env.NODE_ENV === "development"
    ? [
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:3000",
        "http://localhost:5000",
      ]
    : []),
].filter(Boolean);

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error("Not allowed by CORS"));
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

// --------------------------------------------------------
// Rate Limiting
// --------------------------------------------------------
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: process.env.NODE_ENV === "production" ? 100 : 1000,
  message: "Too many requests from this IP, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api/", limiter);

// --------------------------------------------------------
// Body Parsing + JSON Error handler
// --------------------------------------------------------
app.use(express.json({ limit: "10mb", strict: true }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
    return res.status(400).json({
      success: false,
      message: "Invalid JSON format. Please check your request body.",
      error: "JSON_PARSE_ERROR",
    });
  }
  next(err);
});

// Logging (only in development)
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

// Static uploads
const path = require("path");
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// Swagger Docs
app.use(
  "/api-docs",
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpecs, {
    explorer: true,
    customCss: ".swagger-ui .topbar { display: none }",
    customSiteTitle: "Bus Booking API Documentation",
  })
);

// Health Check
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/drivers", driverRoutes);
app.use("/api/buses", busRoutes);
app.use("/api/routes", routeRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/onboard", onboardRoutes);
app.use("/api/ratings", ratingRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/exports", exportRoutes);

// 404 Handler
app.use("*", (req, res) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

// Error Handler Middleware
app.use(errorHandler);

// --------------------------------------------------------
// MongoDB Connection
// --------------------------------------------------------
mongoose
  .connect(
    process.env.MONGODB_URI || "mongodb://localhost:27017/bus_booking_system",
    { useNewUrlParser: true, useUnifiedTopology: true }
  )
  .then(async () => {
    console.log("✅ Connected to MongoDB");
    // await verifyEmailConnection(); // Removed to prevent startup crash
  })
  .catch((error) => {
    console.error("❌ MongoDB connection error:", error);
    process.exit(1);
  });

// Start Server
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🔗 API Base URL: http://localhost:${PORT}/api`);
  console.log(`📚 Swagger Docs: http://localhost:${PORT}/api-docs`);
});

// Set server timeout to 5 minutes to allow for file uploads
server.timeout = 300000;

module.exports = app;
