const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const authRoutes = require("./routes/authRoutes");
const staffRoutes = require("./routes/staffRoutes");
const adminRoutes = require("./routes/adminRoutes");
const dns = require("dns");
dns.setServers(['8.8.8.8', '8.8.4.4']);
const {
  scheduleAutoApprove,
  scheduleHourlyForDev,
} = require("./jobs/autoApproveLeaves");
const { scheduleAutoPunchOut, schedulePreMidnightCheck } = require("./jobs/autoPunchOut");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
const allowedOrigins = [
  "http://localhost:5173",
  "https://time-tracker-nlyj.vercel.app",
  "https://mostech-time-track-two.vercel.app",
  "https://mostech.ae",
  "https://mostech.ae/time-tracker",
  process.env.FRONTEND_URL,
].filter(Boolean);

// CORS configuration
app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);

      if (allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "Accept",
    ],
    exposedHeaders: ["Content-Range", "X-Content-Range"],
  }),
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Root endpoint - for testing
app.get("/", (req, res) => {
  res.json({
    message: "Mostech Solutions API",
    status: "running",
    endpoints: ["/api/auth", "/api/staff", "/api/admin", "/health"],
  });
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    mongodb:
      mongoose.connection.readyState === 1 ? "connected" : "disconnected",
  });
});

// API Routes - MOUNT THEM UNDER /api
app.use("/api/auth", authRoutes);
app.use("/api/staff", staffRoutes);
app.use("/api/admin", adminRoutes);
// MongoDB connection
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log("Connected to MongoDB");

    // Start server
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });

    // Start cron jobs
    scheduleAutoApprove();
    scheduleHourlyForDev();
    scheduleAutoPunchOut();
    schedulePreMidnightCheck();
  })
  .catch((err) => console.error("MongoDB connection error:", err));
