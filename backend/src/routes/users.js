const express = require("express");
const User = require("../models/User");
const {
  successResponse,
  errorResponse,
  paginatedResponse,
} = require("../utils/response");
const {
  authenticateToken,
  requireAdmin,
  requireAdminOrOwner,
} = require("../middleware/auth");
const {
  validateUser,
  validateObjectId,
  validatePagination,
} = require("../middleware/validation");

const Booking = require("../models/Booking");

const router = express.Router();

/*
 * @swagger
 * /api/users:
 *   get:
 *     summary: Get all users (Admin only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of users per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term for name, email, or mobile
 *     responses:
 *       200:
 *         description: Users retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/User'
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         page:
 *                           type: integer
 *                         limit:
 *                           type: integer
 *                         total:
 *                           type: integer
 *                         pages:
 *                           type: integer
 *       403:
 *         description: Admin access required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get(
  "/",
  authenticateToken,
  requireAdmin,
  validatePagination,
  async (req, res) => {
    try {
      const page = parseInt(req.query.page, 10) || 1;
      const limit = parseInt(req.query.limit, 10) || 10;
      const skip = (page - 1) * limit;
      const { sanitizeSearchQuery, sanitizeRegex } = require("../utils/sanitize");
      const rawSearch = (req.query.search || "").trim();
      const search = sanitizeSearchQuery(rawSearch);
      const type = (req.query.type || "").trim(); // e.g. 'Buyer', 'Normal', 'Admin', or 'all'

      // Build searchQuery (name, email, mobile) - sanitized
      const searchQuery = search
        ? {
            $or: [
              { name: { $regex: search, $options: "i" } },
              { email: { $regex: search, $options: "i" } },
              { mobile: { $regex: search, $options: "i" } },
            ],
          }
        : {};

      // Build base type filter - sanitized
      let baseFilter = {};
      if (!type || type.toLowerCase() === "all") {
        baseFilter = { userType: { $ne: "Admin" } };
      } else {
        const sanitizedType = sanitizeRegex(type);
        baseFilter = { userType: { $regex: `^${sanitizedType}$`, $options: "i" } };
      }

      const query = Object.keys(searchQuery).length
        ? { $and: [baseFilter, searchQuery] }
        : baseFilter;

      // 1️⃣ Fetch users
      const users = await User.find(query)
        .select("-password")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(); // lean() returns plain JS objects

      // 2️⃣ Fetch booking counts for these users
      const userIds = users.map((u) => u._id);

      const bookingStats = await Booking.aggregate([
        { $match: { userId: { $in: userIds } } },
        {
          $group: {
            _id: "$userId",
            completed: {
              $sum: {
                $cond: [{ $in: ["$status", ["Completed", "Confirmed"]] }, 1, 0],
              },
            },
            pending: {
              $sum: {
                $cond: [{ $eq: ["$status", "Pending"] }, 1, 0],
              },
            },
            cancelled: {
              $sum: {
                $cond: [{ $eq: ["$status", "Cancelled"] }, 1, 0],
              },
            },
            total: {
              $sum: 1,
            },
          },
        },
      ]);

      // 3️⃣ Map stats to users
      const statsMap = {};
      bookingStats.forEach((b) => {
        statsMap[b._id.toString()] = {
          completed: b.completed || 0,
          pending: b.pending || 0,
          cancelled: b.cancelled || 0,
          total: b.total || 0,
        };
      });

      // 4️⃣ Ensure consistent structure for all users
      const usersWithStats = users.map((u) => ({
        ...u,
        bookingStats: statsMap[u._id.toString()] || {
          completed: 0,
          pending: 0,
          cancelled: 0,
          total: 0,
        },
      }));

      // 5️⃣ Count total
      const total = await User.countDocuments(query);

      paginatedResponse(
        res,
        200,
        "Users retrieved successfully",
        usersWithStats,
        {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        }
      );
    } catch (error) {
      console.error("Get users error:", error);
      errorResponse(res, 500, "Failed to retrieve users", error.message);
    }
  }
);

/*
 * @swagger
 * /api/users/{id}:
 *   get:
 *     summary: Get user by ID
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     responses:
 *       200:
 *         description: User retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/User'
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Access denied
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get(
  "/:id",
  authenticateToken,
  requireAdminOrOwner,
  validateObjectId,
  async (req, res) => {
    try {
      const userId = req.params.id;

      // 1️⃣ Fetch user
      const user = await User.findById(userId).select("-password");
      if (!user) {
        return errorResponse(res, 404, "User not found");
      }

      // 2️⃣ Fetch user's bookings
      const bookings = await Booking.find({ userId })
        .select("routeName travelDate status") // Only required fields
        .sort({ travelDate: -1 })
        .lean();

      // 3️⃣ Map bookings to match frontend expectation
      const bookingHistory = bookings.map((b) => ({
        route: b.routeName,
        date: new Date(b.travelDate).toLocaleDateString(),
        status:
          b.status === "Confirmed" || b.status === "Completed"
            ? "Completed"
            : b.status === "Pending"
            ? "Pending"
            : "Cancelled",
      }));

      // 4️⃣ Send response
      successResponse(res, 200, "User retrieved successfully", {
        ...user.toObject(),
        bookingHistory,
      });
    } catch (error) {
      console.error("Get user error:", error);
      errorResponse(res, 500, "Failed to retrieve user", error.message);
    }
  }
);

/*
 * @swagger
 * /api/users:
 *   post:
 *     summary: Create new user (Admin only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - mobile
 *               - password
 *             properties:
 *               name:
 *                 type: string
 *                 example: "John Doe"
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "john@example.com"
 *               mobile:
 *                 type: string
 *                 example: "+919876543210"
 *               password:
 *                 type: string
 *                 minLength: 6
 *                 example: "password123"
 *               userType:
 *                 type: string
 *                 enum: [Normal, Buyer, Admin]
 *                 default: Normal
 *                 example: "Normal"
 *               isActive:
 *                 type: boolean
 *                 default: true
 *     responses:
 *       201:
 *         description: User created successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/User'
 *       400:
 *         description: Validation error or user already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Admin access required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  "/",
  authenticateToken,
  requireAdmin,
  validateUser,
  async (req, res) => {
    try {
      const { name, email, mobile, password, userType = "Normal" } = req.body;

      // Check if user already exists
      const existingUser = await User.findOne({
        $or: [{ email }, { mobile }],
      });

      if (existingUser) {
        return errorResponse(
          res,
          400,
          "User already exists with this email or mobile"
        );
      }

      const user = new User({
        name,
        email,
        mobile,
        password,
        userType,
      });

      await user.save();

      successResponse(res, 201, "User created successfully", user.toJSON());
    } catch (error) {
      console.error("Create user error:", error);
      errorResponse(res, 500, "Failed to create user", error.message);
    }
  }
);

/*
 * @swagger
 * /api/users/{id}:
 *   put:
 *     summary: Update user
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: "John Doe"
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "john@example.com"
 *               mobile:
 *                 type: string
 *                 example: "+919876543210"
 *               userType:
 *                 type: string
 *                 enum: [Normal, Buyer, Admin]
 *                 example: "Normal"
 *               isActive:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       200:
 *         description: User updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/User'
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Access denied
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.put(
  "/:id",
  authenticateToken,
  requireAdminOrOwner,
  validateObjectId,
  async (req, res) => {
    try {
      const { name, email, mobile, userType, isActive } = req.body;
      const userId = req.params.id;

      const updateData = {};
      if (name) updateData.name = name;
      if (email) updateData.email = email;
      if (mobile) updateData.mobile = mobile;
      if (userType && req.user.userType === "Admin")
        updateData.userType = userType;
      if (typeof isActive === "boolean" && req.user.userType === "Admin")
        updateData.isActive = isActive;

      const user = await User.findByIdAndUpdate(userId, updateData, {
        new: true,
        runValidators: true,
      }).select("-password");

      if (!user) {
        return errorResponse(res, 404, "User not found");
      }

      successResponse(res, 200, "User updated successfully", user);
    } catch (error) {
      console.error("Update user error:", error);
      errorResponse(res, 500, "Failed to update user", error.message);
    }
  }
);

/*
 * @swagger
 * /api/users/{id}:
 *   delete:
 *     summary: Delete user (Admin only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     responses:
 *       200:
 *         description: User deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Admin access required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.delete(
  "/:id",
  authenticateToken,
  requireAdmin,
  validateObjectId,
  async (req, res) => {
    try {
      const user = await User.findByIdAndDelete(req.params.id);

      if (!user) {
        return errorResponse(res, 404, "User not found");
      }

      successResponse(res, 200, "User deleted successfully");
    } catch (error) {
      console.error("Delete user error:", error);
      errorResponse(res, 500, "Failed to delete user", error.message);
    }
  }
);

/*
 * @swagger
 * /api/users/{id}/bookings:
 *   get:
 *     summary: Get user's booking history
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of bookings per page
 *     responses:
 *       200:
 *         description: User bookings retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Booking'
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         page:
 *                           type: integer
 *                         limit:
 *                           type: integer
 *                         total:
 *                           type: integer
 *                         pages:
 *                           type: integer
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Access denied
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get(
  "/:id/bookings",
  authenticateToken,
  requireAdminOrOwner,
  validateObjectId,
  async (req, res) => {
    try {
      const user = await User.findById(req.params.id).populate({
        path: "bookingHistory",
        populate: {
          path: "scheduleId",
          populate: [
            { path: "busId", select: "busName busNumber" },
            { path: "routeId", select: "name startPoint" },
          ],
        },
      });

      if (!user) {
        return errorResponse(res, 404, "User not found");
      }

      successResponse(
        res,
        200,
        "User bookings retrieved successfully",
        user.bookingHistory
      );
    } catch (error) {
      console.error("Get user bookings error:", error);
      errorResponse(
        res,
        500,
        "Failed to retrieve user bookings",
        error.message
      );
    }
  }
);

/*
 * @swagger
 * /api/users/stats/overview:
 *   get:
 *     summary: Get user statistics (Admin only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User statistics retrieved successfully
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
 *                         activeUsers:
 *                           type: integer
 *                         newUsersToday:
 *                           type: integer
 *                         newUsersThisWeek:
 *                           type: integer
 *                         newUsersThisMonth:
 *                           type: integer
 *                         userTypeStats:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               _id:
 *                                 type: string
 *                               count:
 *                                 type: integer
 *                         registrationTrends:
 *                           type: array
 *                           items:
 *                             type: object
 *                         topUsers:
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
router.get(
  "/stats/overview",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const totalUsers = await User.countDocuments();
      const activeUsers = await User.countDocuments({ isActive: true });
      const newUsersThisMonth = await User.countDocuments({
        createdAt: {
          $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        },
      });

      const userTypes = await User.aggregate([
        {
          $group: {
            _id: "$userType",
            count: { $sum: 1 },
          },
        },
      ]);

      successResponse(res, 200, "User statistics retrieved successfully", {
        totalUsers,
        activeUsers,
        newUsersThisMonth,
        userTypes,
      });
    } catch (error) {
      console.error("Get user stats error:", error);
      errorResponse(
        res,
        500,
        "Failed to retrieve user statistics",
        error.message
      );
    }
  }
);

module.exports = router;
