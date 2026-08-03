const express = require("express");
const Analytics = require("../models/Analytics");
const User = require("../models/User");
const Driver = require("../models/Driver");
const Bus = require("../models/Bus");
const Route = require("../models/Route");
const Booking = require("../models/Booking");
const OnboardSchedule = require("../models/OnboardSchedule");
const Rating = require("../models/Rating");
const { successResponse, errorResponse } = require("../utils/response");
const { authenticateToken, requireAdmin } = require("../middleware/auth");

const router = express.Router();

/*
 * @swagger
 * /api/analytics/dashboard:
 *   get:
 *     summary: Get dashboard analytics (Admin only)
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard analytics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         totalUsers:
 *                           type: integer
 *                         totalDrivers:
 *                           type: integer
 *                         totalConductors:
 *                           type: integer
 *                         totalBuses:
 *                           type: integer
 *                         onboardedBuses:
 *                           type: integer
 *                         totalBookings:
 *                           type: integer
 *                         totalRevenue:
 *                           type: number
 *                         activeRoutes:
 *                           type: integer
 *                         userGrowthChart:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               month:
 *                                 type: string
 *                               users:
 *                                 type: integer
 *                         dailyBookingTrends:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               day:
 *                                 type: string
 *                               bookings:
 *                                 type: integer
 *                               revenue:
 *                                 type: number
 *       403:
 *         description: Admin access required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get("/dashboard", authenticateToken, requireAdmin, async (req, res) => {
  try {
    // Get basic counts
    const totalUsers = await User.countDocuments({
      userType: { $ne: "Admin" },
    });
    const totalDrivers = await Driver.countDocuments({ jobTitle: "Driver" });
    const totalConductors = await Driver.countDocuments({ jobTitle: "Conductor" });
    const totalBuses = await Bus.countDocuments();
    const totalRoutes = await Route.countDocuments();
    const totalBookings = await Booking.countDocuments();
    
    // Get onboarded buses (unique buses in schedules)
    const onboardedBusesArray = await OnboardSchedule.distinct("busId");
    const onboardedBuses = onboardedBusesArray.length;
    
    // Get active routes (unique routes from onboard schedules)
    const activeRoutesArray = await OnboardSchedule.distinct("routeId");
    const activeRoutes = activeRoutesArray.length;

    // Get total revenue from confirmed bookings
    const revenueData = await Booking.aggregate([
      { $match: { status: "Confirmed" } },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$fare" },
        },
      },
    ]);

    // Get user growth data (last 12 months)
    const userGrowthData = await User.aggregate([
      { $match: { userType: { $ne: "Admin" } } },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
          },
          users: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);

    // Format user growth data for dashboard
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", 
                       "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    
    // Create user growth chart - always show 12 months starting from January
    const userGrowthChart = [];
    const currentYear = new Date().getFullYear();
    
    // Create a map of existing data for quick lookup
    const dataMap = new Map();
    userGrowthData.forEach(item => {
      const key = `${item._id.year}-${item._id.month}`;
      dataMap.set(key, item.users);
    });
    
    // Generate 12 months of data starting from January
    for (let month = 0; month < 12; month++) {
      const key = `${currentYear}-${month + 1}`;
      const users = dataMap.get(key) || 0;
      
      userGrowthChart.push({
        month: monthNames[month],
        users: users
      });
    }

    // Get daily booking trends (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const dailyBookingData = await Booking.aggregate([
      { $match: { createdAt: { $gte: sevenDaysAgo } } },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
            day: { $dayOfMonth: "$createdAt" },
            dayOfWeek: { $dayOfWeek: "$createdAt" },
          },
          bookings: { $sum: 1 },
          revenue: { $sum: "$fare" },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } },
    ]);

    // Format daily booking data for dashboard
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    
    // Create daily booking trends - always show 7 days
    const dailyBookingTrends = [];
    const today = new Date();
    
    // Create a map of existing data for quick lookup
    const bookingDataMap = new Map();
    dailyBookingData.forEach(item => {
      const key = `${item._id.year}-${item._id.month}-${item._id.day}`;
      bookingDataMap.set(key, { bookings: item.bookings, revenue: item.revenue });
    });
    
    // Generate 7 days of data
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const key = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
      const data = bookingDataMap.get(key) || { bookings: 0, revenue: 0 };
      
      dailyBookingTrends.push({
        day: dayNames[date.getDay()],
        bookings: data.bookings,
        revenue: data.revenue
      });
    }

    // Return only the data needed by dashboard
    successResponse(res, 200, "Dashboard analytics retrieved successfully", {
      // Main stats (flat structure as expected by dashboard)
      totalUsers,
      totalDrivers,
      totalConductors,
      totalBuses,
      onboardedBuses,
      totalBookings,
      totalRevenue: revenueData[0]?.totalRevenue || 0,
      activeRoutes,
      
      // Chart data
      userGrowthChart,
      dailyBookingTrends
    });
  } catch (error) {
    console.error("Get dashboard analytics error:", error);
    errorResponse(
      res,
      500,
      "Failed to retrieve dashboard analytics",
      error.message
    );
  }
});

/*
 * @swagger
 * /api/analytics/overview:
 *   get:
 *     summary: Get analytics overview (Admin only)
 *     description: Get comprehensive analytics including revenue from confirmed bookings, trends, and statistics
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Analytics overview retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         totalRevenue:
 *                           type: number
 *                         totalBookings:
 *                           type: integer
 *                         totalUsers:
 *                           type: integer
 *                         dailyRevenueTrends:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               day:
 *                                 type: string
 *                               revenue:
 *                                 type: number
 *                         dailyBookingTrends:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               day:
 *                                 type: string
 *                               bookings:
 *                                 type: integer
 *                         monthlyRevenueTrends:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               month:
 *                                 type: string
 *                               revenue:
 *                                 type: number
 *                         monthlyBookingTrends:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               month:
 *                                 type: string
 *                               bookings:
 *                                 type: integer
 *       403:
 *         description: Admin access required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get("/overview", authenticateToken, requireAdmin, async (req, res) => {
  try {
    // Get total revenue from confirmed bookings
    const totalRevenueData = await Booking.aggregate([
      { $match: { status: "Confirmed" } },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$fare" },
        },
      },
    ]);

    const totalRevenue = totalRevenueData[0]?.totalRevenue || 0;

    // Get total bookings count
    const totalBookings = await Booking.countDocuments();

    // Get total users (excluding admin)
    const totalUsers = await User.countDocuments({
      userType: { $ne: "Admin" },
    });

    // Get daily revenue trends (last 7 days) from confirmed bookings
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const dailyRevenueData = await Booking.aggregate([
      {
        $match: {
          status: "Confirmed",
          createdAt: { $gte: sevenDaysAgo },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
            day: { $dayOfMonth: "$createdAt" },
          },
          revenue: { $sum: "$fare" },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } },
    ]);

    // Get daily booking trends (last 7 days)
    const dailyBookingData = await Booking.aggregate([
      {
        $match: {
          createdAt: { $gte: sevenDaysAgo },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
            day: { $dayOfMonth: "$createdAt" },
          },
          bookings: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } },
    ]);

    // Format daily data for last 7 days
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const dailyRevenueTrends = [];
    const dailyBookingTrends = [];
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    // Create maps for quick lookup
    const revenueMap = new Map();
    dailyRevenueData.forEach((item) => {
      const key = `${item._id.year}-${item._id.month}-${item._id.day}`;
      revenueMap.set(key, item.revenue);
    });

    const bookingMap = new Map();
    dailyBookingData.forEach((item) => {
      const key = `${item._id.year}-${item._id.month}-${item._id.day}`;
      bookingMap.set(key, item.bookings);
    });

    // Generate 7 days of data
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      const key = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;

      dailyRevenueTrends.push({
        day: dayNames[date.getDay()],
        revenue: revenueMap.get(key) || 0,
      });

      dailyBookingTrends.push({
        day: dayNames[date.getDay()],
        bookings: bookingMap.get(key) || 0,
      });
    }

    // Get monthly revenue trends (last 12 months) from confirmed bookings
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
    twelveMonthsAgo.setDate(1);
    twelveMonthsAgo.setHours(0, 0, 0, 0);

    const monthlyRevenueData = await Booking.aggregate([
      {
        $match: {
          status: "Confirmed",
          createdAt: { $gte: twelveMonthsAgo },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
          },
          revenue: { $sum: "$fare" },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);

    // Get monthly booking trends (last 12 months)
    const monthlyBookingData = await Booking.aggregate([
      {
        $match: {
          createdAt: { $gte: twelveMonthsAgo },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
          },
          bookings: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);

    // Format monthly data for last 12 months
    const monthNames = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    const monthlyRevenueTrends = [];
    const monthlyBookingTrends = [];
    const currentDate = new Date();

    // Create maps for quick lookup
    const monthlyRevenueMap = new Map();
    monthlyRevenueData.forEach((item) => {
      const key = `${item._id.year}-${item._id.month}`;
      monthlyRevenueMap.set(key, item.revenue);
    });

    const monthlyBookingMap = new Map();
    monthlyBookingData.forEach((item) => {
      const key = `${item._id.year}-${item._id.month}`;
      monthlyBookingMap.set(key, item.bookings);
    });

    // Generate 12 months of data
    for (let i = 11; i >= 0; i--) {
      const date = new Date(currentDate);
      date.setMonth(date.getMonth() - i);
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      const key = `${year}-${month}`;

      monthlyRevenueTrends.push({
        month: monthNames[date.getMonth()],
        revenue: monthlyRevenueMap.get(key) || 0,
      });

      monthlyBookingTrends.push({
        month: monthNames[date.getMonth()],
        bookings: monthlyBookingMap.get(key) || 0,
      });
    }

    successResponse(res, 200, "Analytics overview retrieved successfully", {
      totalRevenue,
      totalBookings,
      totalUsers,
      dailyRevenueTrends,
      dailyBookingTrends,
      monthlyRevenueTrends,
      monthlyBookingTrends,
    });
  } catch (error) {
    console.error("Get analytics overview error:", error);
    errorResponse(
      res,
      500,
      "Failed to retrieve analytics overview",
      error.message
    );
  }
});

/*
 * @swagger
 * /api/analytics/revenue:
 *   get:
 *     summary: Get revenue analytics (Admin only)
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Revenue analytics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         totalRevenue:
 *                           type: number
 *                         monthlyRevenue:
 *                           type: number
 *                         dailyRevenue:
 *                           type: number
 *                         revenueByMonth:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               month:
 *                                 type: string
 *                               revenue:
 *                                 type: number
 *                         revenueByRoute:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               routeName:
 *                                 type: string
 *                               revenue:
 *                                 type: number
 *                         revenueByPaymentMethod:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               paymentMethod:
 *                                 type: string
 *                               revenue:
 *                                 type: number
 *                         revenueGrowth:
 *                           type: object
 *                           properties:
 *                             currentMonth:
 *                               type: number
 *                             previousMonth:
 *                               type: number
 *                             growthPercentage:
 *                               type: number
 *       403:
 *         description: Admin access required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get("/revenue", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { period = "month", startDate, endDate } = req.query;

    let dateFilter = {};
    if (startDate && endDate) {
      dateFilter = {
        createdAt: {
          $gte: new Date(startDate),
          $lte: new Date(endDate),
        },
      };
    } else {
      const now = new Date();
      switch (period) {
        case "day":
          dateFilter = {
            createdAt: {
              $gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
            },
          };
          break;
        case "week":
          const weekAgo = new Date();
          weekAgo.setDate(weekAgo.getDate() - 7);
          dateFilter = { createdAt: { $gte: weekAgo } };
          break;
        case "month":
          dateFilter = {
            createdAt: {
              $gte: new Date(now.getFullYear(), now.getMonth(), 1),
            },
          };
          break;
        case "year":
          dateFilter = {
            createdAt: {
              $gte: new Date(now.getFullYear(), 0, 1),
            },
          };
          break;
      }
    }

    // Total revenue from confirmed bookings
    const totalRevenue = await Booking.aggregate([
      { $match: { ...dateFilter, status: "Confirmed" } },
      {
        $group: {
          _id: null,
          total: { $sum: "$fare" },
          count: { $sum: 1 },
        },
      },
    ]);

    // Revenue by payment method from confirmed bookings
    const revenueByPayment = await Booking.aggregate([
      { $match: { ...dateFilter, status: "Confirmed" } },
      {
        $group: {
          _id: "$paymentMethod",
          revenue: { $sum: "$fare" },
          count: { $sum: 1 },
        },
      },
    ]);

    // Revenue by route from confirmed bookings
    const revenueByRoute = await Booking.aggregate([
      { $match: { ...dateFilter, status: "Confirmed" } },
      {
        $group: {
          _id: "$routeId",
          routeName: { $first: "$routeName" },
          revenue: { $sum: "$fare" },
          bookings: { $sum: 1 },
        },
      },
      { $sort: { revenue: -1 } },
      { $limit: 10 },
    ]);

    // Daily revenue trend from confirmed bookings
    const dailyRevenue = await Booking.aggregate([
      { $match: { ...dateFilter, status: "Confirmed" } },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
            day: { $dayOfMonth: "$createdAt" },
          },
          revenue: { $sum: "$fare" },
          bookings: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } },
    ]);

    successResponse(res, 200, "Revenue analytics retrieved successfully", {
      totalRevenue: totalRevenue[0] || { total: 0, count: 0 },
      revenueByPayment,
      revenueByRoute,
      dailyRevenue,
    });
  } catch (error) {
    console.error("Get revenue analytics error:", error);
    errorResponse(
      res,
      500,
      "Failed to retrieve revenue analytics",
      error.message
    );
  }
});

/*
 * @swagger
 * /api/analytics/bookings:
 *   get:
 *     summary: Get booking analytics (Admin only)
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Booking analytics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         totalBookings:
 *                           type: integer
 *                         confirmedBookings:
 *                           type: integer
 *                         pendingBookings:
 *                           type: integer
 *                         cancelledBookings:
 *                           type: integer
 *                         completedBookings:
 *                           type: integer
 *                         bookingTrends:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               date:
 *                                 type: string
 *                               bookings:
 *                                 type: integer
 *                         bookingByStatus:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               status:
 *                                 type: string
 *                               count:
 *                                 type: integer
 *                         bookingByPaymentMethod:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               paymentMethod:
 *                                 type: string
 *                               count:
 *                                 type: integer
 *                         topRoutes:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               routeName:
 *                                 type: string
 *                               bookings:
 *                                 type: integer
 *                         bookingGrowth:
 *                           type: object
 *                           properties:
 *                             currentPeriod:
 *                               type: integer
 *                             previousPeriod:
 *                               type: integer
 *                             growthPercentage:
 *                               type: number
 *       403:
 *         description: Admin access required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get("/bookings", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { period = "month" } = req.query;

    let dateFilter = {};
    const now = new Date();
    switch (period) {
      case "day":
        dateFilter = {
          createdAt: {
            $gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
          },
        };
        break;
      case "week":
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        dateFilter = { createdAt: { $gte: weekAgo } };
        break;
      case "month":
        dateFilter = {
          createdAt: {
            $gte: new Date(now.getFullYear(), now.getMonth(), 1),
          },
        };
        break;
      case "year":
        dateFilter = {
          createdAt: {
            $gte: new Date(now.getFullYear(), 0, 1),
          },
        };
        break;
    }

    // Booking trends
    const bookingTrends = await Booking.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
            day: { $dayOfMonth: "$createdAt" },
          },
          bookings: { $sum: 1 },
          revenue: { $sum: "$fare" },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } },
    ]);

    // Booking status distribution
    const statusDistribution = await Booking.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    // Payment method distribution
    const paymentMethodDistribution = await Booking.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: "$paymentMethod",
          count: { $sum: 1 },
        },
      },
    ]);

    // Top booking routes
    const topRoutes = await Booking.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: "$routeId",
          routeName: { $first: "$routeName" },
          bookings: { $sum: 1 },
          revenue: { $sum: "$fare" },
        },
      },
      { $sort: { bookings: -1 } },
      { $limit: 10 },
    ]);

    successResponse(res, 200, "Booking analytics retrieved successfully", {
      bookingTrends,
      statusDistribution,
      paymentMethodDistribution,
      topRoutes,
    });
  } catch (error) {
    console.error("Get booking analytics error:", error);
    errorResponse(
      res,
      500,
      "Failed to retrieve booking analytics",
      error.message
    );
  }
});

/*
 * @swagger
 * /api/analytics/fleet:
 *   get:
 *     summary: Get fleet analytics (Admin only)
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Fleet analytics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         totalBuses:
 *                           type: integer
 *                         activeBuses:
 *                           type: integer
 *                         inactiveBuses:
 *                           type: integer
 *                         maintenanceBuses:
 *                           type: integer
 *                         retiredBuses:
 *                           type: integer
 *                         busUtilization:
 *                           type: object
 *                           properties:
 *                             totalCapacity:
 *                               type: integer
 *                             utilizedCapacity:
 *                               type: integer
 *                             utilizationPercentage:
 *                               type: number
 *                         busByStatus:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               status:
 *                                 type: string
 *                               count:
 *                               type: integer
 *                         busByArchitecture:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               architecture:
 *                                 type: string
 *                               count:
 *                                 type: integer
 *                         maintenanceStats:
 *                           type: object
 *                           properties:
 *                             totalMaintenance:
 *                               type: integer
 *                             avgMaintenanceCost:
 *                               type: number
 *                             pendingMaintenance:
 *                               type: integer
 *                         topPerformingBuses:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               busName:
 *                                 type: string
 *                               utilization:
 *                                 type: number
 *                         recentMaintenance:
 *                           type: array
 *                           items:
 *                             type: object
 *       403:
 *         description: Admin access required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get("/fleet", authenticateToken, requireAdmin, async (req, res) => {
  try {
    // Bus utilization
    const busUtilization = await OnboardSchedule.aggregate([
      {
        $group: {
          _id: "$busId",
          busName: { $first: "$busName" },
          trips: { $sum: 1 },
          avgOccupancy: { $avg: "$occupancyRate" },
          totalRevenue: { $sum: "$totalRevenue" },
        },
      },
      { $sort: { trips: -1 } },
    ]);

    // Driver performance
    const driverPerformance = await OnboardSchedule.aggregate([
      {
        $unwind: "$assignedTeam",
      },
      {
        $group: {
          _id: "$assignedTeam.id",
          driverName: { $first: "$assignedTeam.name" },
          role: { $first: "$assignedTeam.role" },
          trips: { $sum: 1 },
          avgOccupancy: { $avg: "$occupancyRate" },
        },
      },
      { $sort: { trips: -1 } },
    ]);

    // Route performance
    const routePerformance = await OnboardSchedule.aggregate([
      {
        $group: {
          _id: "$routeId",
          routeName: { $first: "$routeName" },
          trips: { $sum: 1 },
          avgOccupancy: { $avg: "$occupancyRate" },
          totalRevenue: { $sum: "$totalRevenue" },
        },
      },
      { $sort: { trips: -1 } },
    ]);

    // Fleet status
    const fleetStatus = await Bus.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    // Maintenance alerts
    const maintenanceAlerts = await Bus.find({
      $or: [
        { nextMaintenanceDate: { $lte: new Date() } },
        { status: "Maintenance" },
      ],
    }).select(
      "busName busNumber status nextMaintenanceDate lastMaintenanceDate"
    );

    successResponse(res, 200, "Fleet analytics retrieved successfully", {
      busUtilization,
      driverPerformance,
      routePerformance,
      fleetStatus,
      maintenanceAlerts,
    });
  } catch (error) {
    console.error("Get fleet analytics error:", error);
    errorResponse(
      res,
      500,
      "Failed to retrieve fleet analytics",
      error.message
    );
  }
});

/*
 * @swagger
 * /api/analytics/seed-dummy-data:
 *   post:
 *     summary: Seed dummy data for testing (Admin only)
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dummy data seeded successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         users:
 *                           type: integer
 *                         drivers:
 *                           type: integer
 *                         buses:
 *                           type: integer
 *                         routes:
 *                           type: integer
 *                         schedules:
 *                           type: integer
 *                         bookings:
 *                           type: integer
 *                         ratings:
 *                           type: integer
 *       403:
 *         description: Admin access required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post("/seed-dummy-data", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const bcrypt = require('bcryptjs');
    
    // Dummy data arrays
    const dummyUsers = [
      {
        name: "John Doe",
        mobile: "+919876543210",
        email: "john.doe@email.com",
        password: "password123",
        userType: "Normal",
        registrationDate: new Date('2024-01-15'),
        accountDetails: {
          email: "john.doe@email.com",
          preferences: { notifications: true, sms: true },
          notificationSettings: { email: true, sms: true, push: true }
        }
      },
      {
        name: "Jane Smith",
        mobile: "+919876543211",
        email: "jane.smith@email.com",
        password: "password123",
        userType: "Buyer",
        registrationDate: new Date('2024-01-20'),
        accountDetails: {
          email: "jane.smith@email.com",
          preferences: { notifications: true, sms: false },
          notificationSettings: { email: true, sms: false, push: true }
        }
      },
      {
        name: "Mike Johnson",
        mobile: "+919876543212",
        email: "mike.johnson@email.com",
        password: "password123",
        userType: "Normal",
        registrationDate: new Date('2024-02-01'),
        accountDetails: {
          email: "mike.johnson@email.com",
          preferences: { notifications: true, sms: true },
          notificationSettings: { email: true, sms: true, push: true }
        }
      },
      {
        name: "Sarah Wilson",
        mobile: "+919876543213",
        email: "sarah.wilson@email.com",
        password: "password123",
        userType: "Normal",
        registrationDate: new Date('2024-02-15'),
        accountDetails: {
          email: "sarah.wilson@email.com",
          preferences: { notifications: false, sms: true },
          notificationSettings: { email: false, sms: true, push: false }
        }
      },
      {
        name: "David Brown",
        mobile: "+919876543214",
        email: "david.brown@email.com",
        password: "password123",
        userType: "Buyer",
        registrationDate: new Date('2024-03-01'),
        accountDetails: {
          email: "david.brown@email.com",
          preferences: { notifications: true, sms: true },
          notificationSettings: { email: true, sms: true, push: true }
        }
      }
    ];

    const dummyDrivers = [
      {
        jobTitle: "Driver",
        fullName: "Rajesh Kumar",
        fathersName: "Suresh Kumar",
        mothersName: "Sunita Kumar",
        mobile: "+919876543215",
        alternateMobile: "+919876543216",
        email: "rajesh.kumar@email.com",
        dateOfBirth: new Date('1985-05-15'),
        permanentAddress: "123, MG Road, Mumbai, Maharashtra",
        aadharNumber: "1234 5678 9012",
        panNumber: "ABCDE1234F",
        bankAccount: {
          accountNumber: "1234567890",
          ifscCode: "SBIN0001234",
          bankName: "State Bank of India"
        },
        yearsOfExperience: 8,
        handicapped: false,
        status: "Active"
      },
      {
        jobTitle: "Conductor",
        fullName: "Priya Sharma",
        fathersName: "Ramesh Sharma",
        mothersName: "Geeta Sharma",
        mobile: "+919876543217",
        alternateMobile: "+919876543218",
        email: "priya.sharma@email.com",
        dateOfBirth: new Date('1990-08-22'),
        permanentAddress: "456, Park Street, Pune, Maharashtra",
        aadharNumber: "2345 6789 0123",
        panNumber: "FGHIJ5678K",
        bankAccount: {
          accountNumber: "2345678901",
          ifscCode: "HDFC0001234",
          bankName: "HDFC Bank"
        },
        yearsOfExperience: 5,
        handicapped: false,
        status: "Active"
      },
      {
        jobTitle: "Driver",
        fullName: "Amit Singh",
        fathersName: "Vikram Singh",
        mothersName: "Kavita Singh",
        mobile: "+919876543219",
        alternateMobile: "+919876543220",
        email: "amit.singh@email.com",
        dateOfBirth: new Date('1988-12-10'),
        permanentAddress: "789, Station Road, Delhi, Delhi",
        aadharNumber: "3456 7890 1234",
        panNumber: "KLMNO5678P",
        bankAccount: {
          accountNumber: "3456789012",
          ifscCode: "ICIC0001234",
          bankName: "ICICI Bank"
        },
        yearsOfExperience: 6,
        handicapped: false,
        status: "Active"
      },
      {
        jobTitle: "Conductor",
        fullName: "Sneha Patel",
        fathersName: "Ravi Patel",
        mothersName: "Meera Patel",
        mobile: "+919876543221",
        alternateMobile: "+919876543222",
        email: "sneha.patel@email.com",
        dateOfBirth: new Date('1992-03-18'),
        permanentAddress: "321, Gandhi Nagar, Ahmedabad, Gujarat",
        aadharNumber: "4567 8901 2345",
        panNumber: "PQRST6789U",
        bankAccount: {
          accountNumber: "4567890123",
          ifscCode: "AXIS0001234",
          bankName: "Axis Bank"
        },
        yearsOfExperience: 4,
        handicapped: false,
        status: "Active"
      }
    ];

    const dummyBuses = [
      {
        busName: "City Express 1",
        busNumber: "MH-01-AB-1234",
        seatArchitecture: "2+2",
        seatCapacity: 45,
        insuranceNumber: "INS-2024-001",
        status: "Active"
      },
      {
        busName: "Highway Cruiser 2",
        busNumber: "MH-02-CD-5678",
        seatArchitecture: "2+1",
        seatCapacity: 35,
        insuranceNumber: "INS-2024-002",
        status: "Active"
      },
      {
        busName: "Metro Connect 3",
        busNumber: "DL-01-EF-9012",
        seatArchitecture: "2+2",
        seatCapacity: 50,
        insuranceNumber: "INS-2024-003",
        status: "Active"
      },
      {
        busName: "Comfort Plus 4",
        busNumber: "GJ-01-GH-3456",
        seatArchitecture: "1+1",
        seatCapacity: 30,
        insuranceNumber: "INS-2024-004",
        status: "Active"
      }
    ];

    const dummyRoutes = [
      {
        name: "Mumbai to Pune",
        startPoint: "Mumbai Central",
        stops: [
          { name: "Mumbai Central", distanceFromPrev: 0, durationFromPrev: 0 },
          { name: "Thane", distanceFromPrev: 35, durationFromPrev: 60 },
          { name: "Kalyan", distanceFromPrev: 15, durationFromPrev: 25 },
          { name: "Pune", distanceFromPrev: 120, durationFromPrev: 150 }
        ],
        totalDistance: 170,
        estimatedTravelTime: 235,
        status: "Active"
      },
      {
        name: "Pune to Mumbai",
        startPoint: "Pune Station",
        stops: [
          { name: "Pune Station", distanceFromPrev: 0, durationFromPrev: 0 },
          { name: "Kalyan", distanceFromPrev: 120, durationFromPrev: 150 },
          { name: "Thane", distanceFromPrev: 15, durationFromPrev: 25 },
          { name: "Mumbai Central", distanceFromPrev: 35, durationFromPrev: 60 }
        ],
        totalDistance: 170,
        estimatedTravelTime: 235,
        status: "Active"
      },
      {
        name: "Delhi to Agra",
        startPoint: "Delhi Bus Terminal",
        stops: [
          { name: "Delhi Bus Terminal", distanceFromPrev: 0, durationFromPrev: 0 },
          { name: "Faridabad", distanceFromPrev: 25, durationFromPrev: 45 },
          { name: "Mathura", distanceFromPrev: 80, durationFromPrev: 120 },
          { name: "Agra", distanceFromPrev: 60, durationFromPrev: 90 }
        ],
        totalDistance: 165,
        estimatedTravelTime: 255,
        status: "Active"
      }
    ];

    // Clear existing data
    await User.deleteMany({});
    await Driver.deleteMany({});
    await Bus.deleteMany({});
    await Route.deleteMany({});
    await Booking.deleteMany({});
    await OnboardSchedule.deleteMany({});
    await Rating.deleteMany({});

    // Create users
    const users = [];
    for (const userData of dummyUsers) {
      const hashedPassword = await bcrypt.hash(userData.password, 12);
      const user = new User({
        ...userData,
        password: hashedPassword
      });
      await user.save();
      users.push(user);
    }

    // Create drivers
    const drivers = [];
    for (const driverData of dummyDrivers) {
      const driver = new Driver(driverData);
      await driver.save();
      drivers.push(driver);
    }

    // Create buses
    const buses = [];
    for (const busData of dummyBuses) {
      const bus = new Bus(busData);
      await bus.save();
      buses.push(bus);
    }

    // Create routes
    const routes = [];
    for (const routeData of dummyRoutes) {
      const route = new Route(routeData);
      await route.save();
      routes.push(route);
    }

    // Create onboard schedules
    const schedules = [];
    const today = new Date();
    
    for (let i = 0; i < 10; i++) {
      const scheduleDate = new Date(today);
      scheduleDate.setDate(scheduleDate.getDate() + i);
      
      const bus = buses[i % buses.length];
      const route = routes[i % routes.length];
      const driver = drivers.find(d => d.jobTitle === "Driver");
      const conductor = drivers.find(d => d.jobTitle === "Conductor");
      
      const defaultBaseAmount = 100;
      const defaultPerKmRate = 10;
      const schedule = new OnboardSchedule({
        busId: bus._id,
        busName: bus.busName,
        routeId: route._id,
        routeName: route.name,
        assignedTeam: [
          { id: driver._id, name: driver.fullName, role: "Driver" },
          { id: conductor._id, name: conductor.fullName, role: "Conductor" }
        ],
        date: scheduleDate,
        time: i % 2 === 0 ? "08:00" : "14:00",
        pricing: {
          baseAmount: defaultBaseAmount,
          perKmRate: defaultPerKmRate,
          totalFare: defaultBaseAmount + (route.totalDistance * defaultPerKmRate)
        },
        status: "Scheduled",
        totalBookings: Math.floor(Math.random() * 20),
        totalRevenue: Math.floor(Math.random() * 50000),
        occupancyRate: Math.floor(Math.random() * 100)
      });
      
      await schedule.save();
      schedules.push(schedule);
    }

    // Create bookings
    const bookings = [];
    for (let i = 0; i < 50; i++) {
      const user = users[Math.floor(Math.random() * users.length)];
      const schedule = schedules[Math.floor(Math.random() * schedules.length)];
      const bus = buses.find(b => b._id.toString() === schedule.busId.toString());
      const route = routes.find(r => r._id.toString() === schedule.routeId.toString());
      
      const bookingDate = new Date();
      bookingDate.setDate(bookingDate.getDate() - Math.floor(Math.random() * 30));
      
      const booking = new Booking({
        userId: user._id,
        userName: user.name,
        userMobile: user.mobile,
        userEmail: user.email,
        scheduleId: schedule._id,
        busId: bus._id,
        busName: bus.busName,
        busNumber: bus.busNumber,
        routeId: route._id,
        routeName: route.name,
        destination: route.stops[route.stops.length - 1].name,
        seats: [`${String.fromCharCode(65 + Math.floor(Math.random() * 4))}${Math.floor(Math.random() * 10) + 1}`],
        fare: schedule.pricing.totalFare,
        paymentStatus: ["Paid", "COD", "Pending"][Math.floor(Math.random() * 3)],
        paymentMethod: ["Online", "COD", "Wallet"][Math.floor(Math.random() * 3)],
        bookingTime: bookingDate,
        travelDate: schedule.date,
        departureTime: schedule.time,
        arrivalTime: "12:00",
        driverName: schedule.assignedTeam.find(t => t.role === "Driver")?.name,
        conductorName: schedule.assignedTeam.find(t => t.role === "Conductor")?.name,
        status: ["Confirmed", "Pending", "Completed"][Math.floor(Math.random() * 3)]
      });
      
      await booking.save();
      bookings.push(booking);
    }

    // Create ratings
    const ratings = [];
    for (let i = 0; i < 20; i++) {
      const booking = bookings[Math.floor(Math.random() * bookings.length)];
      const user = users.find(u => u._id.toString() === booking.userId.toString());
      
      const rating = new Rating({
        userId: user._id,
        customerName: user.name,
        customerMobile: user.mobile,
        customerEmail: user.email,
        scheduleId: booking.scheduleId,
        busName: booking.busName,
        routeName: booking.routeName,
        bookingId: booking._id,
        travelDate: booking.travelDate,
        rating: Math.floor(Math.random() * 3) + 3,
        serviceRating: Math.floor(Math.random() * 3) + 3,
        driverRating: Math.floor(Math.random() * 3) + 3,
        busRating: Math.floor(Math.random() * 3) + 3,
        punctualityRating: Math.floor(Math.random() * 3) + 3,
        comments: ["Great service!", "Comfortable journey", "On time", "Good experience"][Math.floor(Math.random() * 4)],
        wouldRecommend: Math.random() > 0.3,
        status: "Approved",
        date: new Date()
      });
      
      await rating.save();
      ratings.push(rating);
    }

    successResponse(res, 200, "Dummy data seeded successfully", {
      users: users.length,
      drivers: drivers.length,
      buses: buses.length,
      routes: routes.length,
      schedules: schedules.length,
      bookings: bookings.length,
      ratings: ratings.length
    });
  } catch (error) {
    console.error("Seed dummy data error:", error);
    errorResponse(
      res,
      500,
      "Failed to seed dummy data",
      error.message
    );
  }
});

module.exports = router;
