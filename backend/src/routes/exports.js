const express = require("express");
const Booking = require("../models/Booking");
const User = require("../models/User");
const Driver = require("../models/Driver");
const Bus = require("../models/Bus");
const { successResponse, errorResponse } = require("../utils/response");
const { authenticateToken, requireAdmin } = require("../middleware/auth");
const logger = require("../utils/logger");

const router = express.Router();

// All export routes require authentication and admin role
router.use(authenticateToken);
router.use(requireAdmin);

/**
 * Helper function to convert data to CSV format
 */
function convertToCSV(data, headers) {
  if (!data || data.length === 0) {
    return headers.join(",") + "\n";
  }

  const csvRows = [];
  
  // Add headers
  csvRows.push(headers.join(","));

  // Add data rows
  data.forEach((row) => {
    const values = headers.map((header) => {
      const value = row[header] !== undefined && row[header] !== null ? row[header] : "";
      // Escape commas and quotes in CSV
      const stringValue = String(value).replace(/"/g, '""');
      return `"${stringValue}"`;
    });
    csvRows.push(values.join(","));
  });

  return csvRows.join("\n");
}

/**
 * @swagger
 * /api/exports/booking-amount:
 *   get:
 *     summary: Export booking amount report (Admin only)
 *     tags: [Exports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for the report
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for the report
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [all, Active, Confirmed, Pending, Cancelled, Completed]
 *         description: Filter by booking status
 *     responses:
 *       200:
 *         description: CSV file with booking amount report
 *         content:
 *           text/csv:
 *             schema:
 *               type: string
 *       403:
 *         description: Admin access required
 */
router.get("/booking-amount", async (req, res) => {
  try {
    const { startDate, endDate, status = "all" } = req.query;

    // Build query
    let query = {};
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.createdAt.$lte = end;
      }
    }

    if (status !== "all") {
      query.status = status;
    }

    // Fetch bookings
    const bookings = await Booking.find(query)
      .populate("userId", "name email mobile")
      .populate("routeId", "name startPoint")
      .sort({ createdAt: -1 })
      .lean();

    // Format data for CSV - only fields visible in table
    const formatDate = (date) => {
      if (!date) return "N/A";
      const d = new Date(date);
      return d.toISOString().split("T")[0];
    };

    const csvData = bookings.map((booking) => ({
      "Booking ID": booking.bookingReference || `BB${booking._id.toString().slice(-8).toUpperCase()}`,
      "Booking Date": formatDate(booking.bookingTime || booking.createdAt),
      "Customer Name": booking.passengerName || booking.userName || booking.userId?.name || "N/A",
      "Customer Mobile": booking.userMobile || booking.userId?.mobile || "N/A",
      "Route": booking.routeName || booking.routeId?.name || "N/A",
      "Bus Name": booking.busName || "N/A",
      "Seats": Array.isArray(booking.seats) ? booking.seats.join(", ") : booking.seats || "N/A",
      "Number of Seats": booking.totalSeats || (Array.isArray(booking.seats) ? booking.seats.length : 0),
      "Fare": booking.fare || 0,
      "Status": booking.status || "N/A",
    }));

    const headers = [
      "Booking ID",
      "Booking Date",
      "Customer Name",
      "Customer Mobile",
      "Route",
      "Bus Name",
      "Seats",
      "Number of Seats",
      "Fare",
      "Status",
    ];

    const csv = convertToCSV(csvData, headers);

    // Set response headers for CSV download
    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="booking_amount_report_${new Date().toISOString().split("T")[0]}.csv"`
    );

    res.send(csv);
  } catch (error) {
    logger.error("Export booking amount error:", error);
    errorResponse(res, 500, "Failed to export booking amount report", error.message);
  }
});

/**
 * @swagger
 * /api/exports/sales-report:
 *   get:
 *     summary: Export sales report (Admin only)
 *     tags: [Exports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: CSV file with sales report
 */
router.get("/sales-report", async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    let query = { status: { $in: ["Active", "Confirmed", "Completed"] } };
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.createdAt.$lte = end;
      }
    }

    const bookings = await Booking.find(query)
      .populate("routeId", "name")
      .sort({ createdAt: -1 })
      .lean();

    // Aggregate sales data - simplified to match table view
    const salesData = bookings.map((booking) => ({
      "Booking ID": booking.bookingReference || `BB${booking._id.toString().slice(-8).toUpperCase()}`,
      "Customer Name": booking.passengerName || booking.userName || "N/A",
      "Route": booking.routeName || booking.routeId?.name || "N/A",
      "Bus Name": booking.busName || "N/A",
      "Fare": booking.fare || 0,
      "Status": booking.status || "N/A",
    }));

    // Calculate totals
    const totalAmount = bookings.reduce((sum, b) => sum + (b.fare || 0), 0);
    const totalBookings = bookings.length;

    const headers = ["Booking ID", "Customer Name", "Route", "Bus Name", "Fare", "Status"];
    let csv = convertToCSV(salesData, headers);

    // Add summary
    csv += "\n\n";
    csv += "Summary\n";
    csv += `Total Bookings,${totalBookings}\n`;
    csv += `Total Sales Amount,${totalAmount}\n`;
    csv += `Average Booking Value,${totalBookings > 0 ? (totalAmount / totalBookings).toFixed(2) : 0}\n`;

    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="sales_report_${new Date().toISOString().split("T")[0]}.csv"`
    );

    res.send(csv);
  } catch (error) {
    logger.error("Export sales report error:", error);
    errorResponse(res, 500, "Failed to export sales report", error.message);
  }
});

/**
 * @swagger
 * /api/exports/user-report:
 *   get:
 *     summary: Export user report (Admin only)
 *     tags: [Exports]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: CSV file with user report
 */
router.get("/user-report", async (req, res) => {
  try {
    const users = await User.find({ userType: { $ne: "Admin" } })
      .sort({ createdAt: -1 })
      .lean();

    // Get booking counts for each user
    const userIds = users.map((u) => u._id);
    const bookingCounts = await Booking.aggregate([
      { $match: { userId: { $in: userIds } } },
      {
        $group: {
          _id: "$userId",
          totalBookings: { $sum: 1 },
          totalSpent: { $sum: "$fare" },
        },
      },
    ]);

    const bookingMap = new Map();
    bookingCounts.forEach((bc) => {
      bookingMap.set(bc._id.toString(), {
        totalBookings: bc.totalBookings,
        totalSpent: bc.totalSpent,
      });
    });

    // Get completed bookings count
    const completedBookings = await Booking.aggregate([
      { $match: { userId: { $in: userIds }, status: "Completed" } },
      {
        $group: {
          _id: "$userId",
          completedBookings: { $sum: 1 },
        },
      },
    ]);

    const completedMap = new Map();
    completedBookings.forEach((cb) => {
      completedMap.set(cb._id.toString(), cb.completedBookings);
    });

    const formatDate = (date) => {
      if (!date) return "N/A";
      const d = new Date(date);
      return d.toISOString().split("T")[0];
    };

    const userData = users.map((user) => {
      const bookingInfo = bookingMap.get(user._id.toString()) || {
        totalBookings: 0,
        totalSpent: 0,
      };
      const completedCount = completedMap.get(user._id.toString()) || 0;

      return {
        "Name": user.name || "N/A",
        "User ID": user._id.toString(),
        "Mobile": user.mobile || "N/A",
        "Email": user.email || "N/A",
        "Registration Date": formatDate(user.registrationDate || user.createdAt),
        "User Type": user.userType || "N/A",
        "Total Bookings": bookingInfo.totalBookings,
        "Completed Bookings": completedCount,
      };
    });

    const headers = [
      "Name",
      "User ID",
      "Mobile",
      "Email",
      "Registration Date",
      "User Type",
      "Total Bookings",
      "Completed Bookings",
    ];

    const csv = convertToCSV(userData, headers);

    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="user_report_${new Date().toISOString().split("T")[0]}.csv"`
    );

    res.send(csv);
  } catch (error) {
    logger.error("Export user report error:", error);
    errorResponse(res, 500, "Failed to export user report", error.message);
  }
});

/**
 * @swagger
 * /api/exports/driver-report:
 *   get:
 *     summary: Export driver/employee report (Admin only)
 *     tags: [Exports]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: CSV file with driver/employee report
 */
router.get("/driver-report", async (req, res) => {
  try {
    const drivers = await Driver.find().sort({ createdAt: -1 }).lean();

    const driverData = drivers.map((driver) => {
      // Count documents
      let docCount = 0;
      if (driver.aadharFront && driver.aadharBack) docCount++;
      if (driver.panCard) docCount++;
      if (driver.drivingLicense) docCount++;

      // Determine document status
      let docStatus = "Missing";
      if (docCount === 3) docStatus = "Complete";
      else if (docCount > 0) docStatus = "Partial";

      return {
        "Full Name": driver.fullName || "N/A",
        "Mobile": driver.mobile || "N/A",
        "Email": driver.email || "N/A",
        "Role": driver.jobTitle || "N/A",
        "Years of Experience": driver.yearsOfExperience || 0,
        "Documents Count": `${docCount} / 3 documents`,
        "Document Status": docStatus,
      };
    });

    const headers = [
      "Full Name",
      "Mobile",
      "Email",
      "Role",
      "Years of Experience",
      "Documents Count",
      "Document Status",
    ];

    const csv = convertToCSV(driverData, headers);

    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="driver_report_${new Date().toISOString().split("T")[0]}.csv"`
    );

    res.send(csv);
  } catch (error) {
    logger.error("Export driver report error:", error);
    errorResponse(res, 500, "Failed to export driver report", error.message);
  }
});

/**
 * @swagger
 * /api/exports/bus-report:
 *   get:
 *     summary: Export bus report (Admin only)
 *     tags: [Exports]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: CSV file with bus report
 */
router.get("/bus-report", async (req, res) => {
  try {
    const buses = await Bus.find().sort({ createdAt: -1 }).lean();

    const busData = buses.map((bus) => {
      // Count documents
      let docCount = 0;
      if (bus.rcDocument) docCount++;
      if (bus.pollutionCertificate) docCount++;
      if (bus.insuranceCertificate) docCount++;
      if (Object.values(bus.busImages || {}).some((img) => img)) docCount++;

      // Determine document status
      let docStatus = "Missing";
      if (docCount === 4) docStatus = "Complete";
      else if (docCount >= 2) docStatus = "Partial";

      return {
        "Bus Name": bus.busName || "N/A",
        "Bus Number": bus.busNumber || "N/A",
        "Seat Capacity": bus.seatCapacity || 0,
        "Seat Architecture": bus.seatArchitecture || "N/A",
        "AC Type": bus.acType || "N/A",
        "Documents Count": `${docCount} / 4 documents`,
        "Document Status": docStatus,
        "Status": bus.status || "N/A",
      };
    });

    const headers = [
      "Bus Name",
      "Bus Number",
      "Seat Capacity",
      "Seat Architecture",
      "AC Type",
      "Documents Count",
      "Document Status",
      "Status",
    ];

    const csv = convertToCSV(busData, headers);

    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="bus_report_${new Date().toISOString().split("T")[0]}.csv"`
    );

    res.send(csv);
  } catch (error) {
    logger.error("Export bus report error:", error);
    errorResponse(res, 500, "Failed to export bus report", error.message);
  }
});

module.exports = router;

