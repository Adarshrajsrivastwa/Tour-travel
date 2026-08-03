const express = require("express");
const Rating = require("../models/Rating");
const Booking = require("../models/Booking");
const OnboardSchedule = require("../models/OnboardSchedule");
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
  validateRating,
  validateObjectId,
  validatePagination,
} = require("../middleware/validation");

const router = express.Router();

/*
 * @swagger
 * /api/ratings:
 *   get:
 *     summary: Get all ratings with filters and pagination (Admin only)
 *     description: Retrieve a paginated list of ratings with optional filters
 *     tags: [Ratings]
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
 *         description: Number of ratings per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term for customer name, email, mobile, bus name, route name, or comments
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [Pending, Approved, Rejected, Hidden]
 *         description: Filter by status
 *       - in: query
 *         name: rating
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 5
 *         description: Filter by rating value
 *       - in: query
 *         name: dateFrom
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter ratings from this date (YYYY-MM-DD)
 *       - in: query
 *         name: dateTo
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter ratings until this date (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: Ratings retrieved successfully
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
 *                         $ref: '#/components/schemas/Rating'
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
      const status = (req.query.status || "").trim();
      const rating = req.query.rating ? parseInt(req.query.rating, 10) : null;
      const dateFrom = req.query.dateFrom ? new Date(req.query.dateFrom) : null;
      const dateTo = req.query.dateTo ? new Date(req.query.dateTo) : null;

      // Build search query
      const searchQuery = search
        ? {
            $or: [
              { customerName: { $regex: search, $options: "i" } },
              { customerEmail: { $regex: search, $options: "i" } },
              { customerMobile: { $regex: search, $options: "i" } },
              { busName: { $regex: search, $options: "i" } },
              { routeName: { $regex: search, $options: "i" } },
              { comments: { $regex: search, $options: "i" } },
            ],
          }
        : {};

      // Build status filter
      const statusFilter = status && status !== "all"
        ? { status: { $regex: `^${sanitizeRegex(status)}$`, $options: "i" } }
        : {};

      // Build rating filter
      const ratingFilter = rating ? { rating } : {};

      // Build date filter
      const dateFilter = {};
      if (dateFrom || dateTo) {
        dateFilter.createdAt = {};
        if (dateFrom) {
          const fromDate = new Date(dateFrom);
          fromDate.setHours(0, 0, 0, 0);
          dateFilter.createdAt.$gte = fromDate;
        }
        if (dateTo) {
          const toDate = new Date(dateTo);
          toDate.setHours(23, 59, 59, 999);
          dateFilter.createdAt.$lte = toDate;
        }
      }

      // Combine all filters
      const query = {};
      const filters = [searchQuery, statusFilter, ratingFilter, dateFilter].filter(
        (f) => Object.keys(f).length > 0
      );

      if (filters.length > 0) {
        query.$and = filters;
      }

      // Get total count
      const total = await Rating.countDocuments(query);

      // Fetch ratings with pagination
      const ratings = await Rating.find(query)
        .populate("userId", "name email mobile")
        .populate("scheduleId")
        .populate("busId", "busName busNumber")
        .populate("routeId", "name startPoint")
        .populate("bookingId", "bookingReference")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();

      paginatedResponse(res, 200, "Ratings retrieved successfully", ratings, {
        page,
        limit,
        total,
      });
    } catch (error) {
      console.error("Get ratings error:", error);
      errorResponse(res, 500, "Failed to retrieve ratings", error.message);
    }
  }
);

/**
 * @swagger
 * /api/ratings:
 *   post:
 *     summary: Create new rating for a schedule
 *     description: User can rate a schedule. Rating is automatically assigned to all assigned team members (drivers/conductors) and the bus.
 *     tags: [Ratings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - scheduleId
 *               - rating
 *               - comments
 *             properties:
 *               scheduleId:
 *                 type: string
 *                 example: "60d0fe4f5311236168a109cf"
 *               rating:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 5
 *                 description: Rating value (1-5) - applies to all aspects
 *                 example: 4
 *               comments:
 *                 type: string
 *                 example: "Great experience"
 *     responses:
 *       201:
 *         description: Rating created successfully and auto-assigned to staff and bus
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Rating'
 *       400:
 *         description: Validation error or booking already rated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: User can only rate their own bookings
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Booking not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post("/", authenticateToken, validateRating, async (req, res) => {
  try {
    const ratingData = req.body;
    const userId = req.user._id;

    // Get schedule details
    const schedule = await OnboardSchedule.findById(ratingData.scheduleId)
      .populate("busId")
      .populate("routeId");

    if (!schedule) {
      return errorResponse(res, 404, "Schedule not found");
    }

    // Check if user has already rated this schedule
    const existingRating = await Rating.findOne({
      userId,
      scheduleId: ratingData.scheduleId,
      status: "Pending",
    });
    if (existingRating) {
      return errorResponse(res, 400, "You have already rated this schedule");
    }

    // Get user details
    const user = await User.findById(userId);

    // Create single rating document for the schedule
    // This rating applies to the service, driver, conductor, and bus
    const rating = new Rating({
      userId,
      customerName: user.name,
      customerMobile: user.mobile,
      customerEmail: user.email,
      scheduleId: ratingData.scheduleId,
      busId: schedule.busId._id,
      busName: schedule.busName,
      routeId: schedule.routeId._id,
      routeName: schedule.routeName,
      bookingId: null,
      travelDate: schedule.date,
      rating: ratingData.rating,
      serviceRating: ratingData.rating,
      driverRating: ratingData.rating,
      busRating: ratingData.rating,
      punctualityRating: ratingData.rating,
      comments: ratingData.comments,
      status: "Pending",
    });

    await rating.save();

    // Populate the response
    const populatedRating = await Rating.findById(rating._id)
      .populate("userId", "name email mobile")
      .populate("scheduleId")
      .populate("busId", "busName busNumber")
      .populate("routeId", "name startPoint")
      .populate("bookingId", "bookingReference");

    successResponse(
      res,
      201,
      "Rating submitted successfully and assigned to staff and bus",
      populatedRating
    );
  } catch (error) {
    console.error("Create rating error:", error);
    errorResponse(res, 500, "Failed to submit rating", error.message);
  }
});

/**
 * @swagger
 * /api/ratings/{id}:
 *   get:
 *     summary: Get rating by ID
 *     description: Retrieve a single rating/review by its ID. Users can only view their own ratings, while admins can view any rating. Returns complete rating details including user information, schedule, bus, route, and booking details.
 *     tags: [Ratings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Rating ID
 *     responses:
 *       200:
 *         description: Rating retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Rating'
 *       404:
 *         description: Rating not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Access denied - Users can only view their own ratings
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get(
  "/:id",
  authenticateToken,
  validateObjectId,
  async (req, res) => {
    try {
      const ratingId = req.params.id;
      const userId = req.user._id;
      const isAdmin = req.user.userType === "Admin";

      const rating = await Rating.findById(ratingId)
        .populate("userId", "name email mobile")
        .populate("scheduleId")
        .populate("busId", "busName busNumber")
        .populate("routeId", "name startPoint")
        .populate("bookingId", "bookingReference");

      if (!rating) {
        return errorResponse(res, 404, "Rating not found");
      }

      // Check if user is admin or owns the rating
      const isOwner = rating.userId && 
        rating.userId._id && 
        rating.userId._id.toString() === userId.toString();
      
      if (!isAdmin && !isOwner) {
        return errorResponse(
          res,
          403,
          "Access denied - You can only view your own ratings"
        );
      }

      successResponse(res, 200, "Rating retrieved successfully", rating);
    } catch (error) {
      console.error("Get rating error:", error);
      errorResponse(res, 500, "Failed to retrieve rating", error.message);
    }
  }
);

/**
 * @swagger
 * /api/ratings/{id}:
 *   put:
 *     summary: Update rating/review
 *     description: Update an existing rating/review. Users can only update their own ratings, while admins can update any rating. Accepts the same fields as the create rating API - rating (applies to all aspects) and comments. If individual ratings (serviceRating, driverRating, busRating, punctualityRating) are provided, they will override the overall rating for those specific aspects.
 *     tags: [Ratings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Rating ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - rating
 *               - comments
 *             properties:
 *               rating:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 5
 *                 description: Overall rating value (1-5) - applies to all aspects (serviceRating, driverRating, busRating, punctualityRating) unless individual ratings are provided
 *                 example: 4
 *               comments:
 *                 type: string
 *                 description: Review comments
 *                 example: "Updated: Great experience!"
 *               serviceRating:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 5
 *                 description: Service quality rating (1-5) - optional, overrides overall rating for this aspect
 *                 example: 5
 *               driverRating:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 5
 *                 description: Driver performance rating (1-5) - optional, overrides overall rating for this aspect
 *                 example: 5
 *               busRating:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 5
 *                 description: Bus condition and comfort rating (1-5) - optional, overrides overall rating for this aspect
 *                 example: 5
 *               punctualityRating:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 5
 *                 description: Punctuality rating (1-5) - optional, overrides overall rating for this aspect
 *                 example: 4
 *               wouldRecommend:
 *                 type: boolean
 *                 description: Whether the user would recommend this service
 *                 example: true
 *     responses:
 *       200:
 *         description: Rating updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Rating'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Rating not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Access denied - Users can only update their own ratings
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.put(
  "/:id",
  authenticateToken,
  validateObjectId,
  async (req, res) => {
    try {
      const ratingId = req.params.id;
      const userId = req.user._id;
      const isAdmin = req.user.userType === "Admin";

      // First, check if rating exists and verify ownership
      const existingRating = await Rating.findById(ratingId);
      
      if (!existingRating) {
        return errorResponse(res, 404, "Rating not found");
      }

      // Check if user is admin or owns the rating
      const isOwner = existingRating.userId && 
        existingRating.userId.toString() === userId.toString();
      
      if (!isAdmin && !isOwner) {
        return errorResponse(
          res,
          403,
          "Access denied - You can only update your own ratings"
        );
      }

      // Validate required fields (matching POST API)
      const { rating: ratingValue, comments } = req.body;

      if (ratingValue === undefined || ratingValue === null) {
        return errorResponse(res, 400, "Rating is required");
      }

      if (typeof ratingValue !== 'number' || ratingValue < 1 || ratingValue > 5) {
        return errorResponse(res, 400, "Rating must be a number between 1 and 5");
      }

      if (comments === undefined || comments === null || comments.trim() === '') {
        return errorResponse(res, 400, "Comments are required");
      }

      if (typeof comments !== 'string' || comments.trim().length === 0) {
        return errorResponse(res, 400, "Comments must be a non-empty string");
      }

      if (comments.length > 1000) {
        return errorResponse(res, 400, "Comments cannot exceed 1000 characters");
      }

      // Validate optional individual ratings if provided
      const { serviceRating, driverRating, busRating, punctualityRating } = req.body;
      
      if (serviceRating !== undefined && (typeof serviceRating !== 'number' || serviceRating < 1 || serviceRating > 5)) {
        return errorResponse(res, 400, "Service rating must be a number between 1 and 5");
      }

      if (driverRating !== undefined && (typeof driverRating !== 'number' || driverRating < 1 || driverRating > 5)) {
        return errorResponse(res, 400, "Driver rating must be a number between 1 and 5");
      }

      if (busRating !== undefined && (typeof busRating !== 'number' || busRating < 1 || busRating > 5)) {
        return errorResponse(res, 400, "Bus rating must be a number between 1 and 5");
      }

      if (punctualityRating !== undefined && (typeof punctualityRating !== 'number' || punctualityRating < 1 || punctualityRating > 5)) {
        return errorResponse(res, 400, "Punctuality rating must be a number between 1 and 5");
      }

      const updateData = req.body;

      // Remove fields that shouldn't be updated directly
      delete updateData._id;
      delete updateData.createdAt;
      delete updateData.updatedAt;
      delete updateData.userId; // Prevent changing ownership
      delete updateData.scheduleId; // Prevent changing schedule
      delete updateData.busId; // Prevent changing bus
      delete updateData.routeId; // Prevent changing route
      delete updateData.customerName; // Prevent changing customer name
      delete updateData.customerEmail; // Prevent changing customer email
      delete updateData.customerMobile; // Prevent changing customer mobile
      delete updateData.busName; // Prevent changing bus name
      delete updateData.routeName; // Prevent changing route name
      delete updateData.travelDate; // Prevent changing travel date

      // Handle rating field - if provided, apply to all rating aspects (like POST API)
      // unless individual ratings are explicitly provided
      if (updateData.rating !== undefined) {
        const overallRating = updateData.rating;
        
        // Only apply overall rating to aspects that don't have individual values
        if (updateData.serviceRating === undefined) {
          updateData.serviceRating = overallRating;
        }
        if (updateData.driverRating === undefined) {
          updateData.driverRating = overallRating;
        }
        if (updateData.busRating === undefined) {
          updateData.busRating = overallRating;
        }
        if (updateData.punctualityRating === undefined) {
          updateData.punctualityRating = overallRating;
        }
      }

      const updatedRating = await Rating.findByIdAndUpdate(ratingId, updateData, {
        new: true,
        runValidators: true,
      })
        .populate("userId", "name email mobile")
        .populate("scheduleId")
        .populate("busId", "busName busNumber")
        .populate("routeId", "name startPoint")
        .populate("bookingId", "bookingReference");

      if (!updatedRating) {
        return errorResponse(res, 404, "Rating not found");
      }

      successResponse(res, 200, "Rating updated successfully", updatedRating);
    } catch (error) {
      console.error("Update rating error:", error);
      errorResponse(res, 500, "Failed to update rating", error.message);
    }
  }
);

/*
 * @swagger
 * /api/ratings/{id}:
 *   delete:
 *     summary: Delete rating
 *     tags: [Ratings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Rating ID
 *     responses:
 *       200:
 *         description: Rating deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       404:
 *         description: Rating not found
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
router.delete(
  "/:id",
  authenticateToken,
  requireAdminOrOwner,
  validateObjectId,
  async (req, res) => {
    try {
      const rating = await Rating.findByIdAndDelete(req.params.id);

      if (!rating) {
        return errorResponse(res, 404, "Rating not found");
      }

      successResponse(res, 200, "Rating deleted successfully");
    } catch (error) {
      console.error("Delete rating error:", error);
      errorResponse(res, 500, "Failed to delete rating", error.message);
    }
  }
);

/*
 * @swagger
 * /api/ratings/{id}/status:
 *   put:
 *     summary: Update rating status (Admin only)
 *     tags: [Ratings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Rating ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [Pending, Approved, Rejected, Hidden]
 *                 example: "Approved"
 *               reason:
 *                 type: string
 *                 example: "Rating approved after review"
 *     responses:
 *       200:
 *         description: Rating status updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Rating'
 *       404:
 *         description: Rating not found
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
router.put(
  "/:id/status",
  authenticateToken,
  requireAdmin,
  validateObjectId,
  async (req, res) => {
    try {
      const { status, adminResponse } = req.body;

      if (!["Pending", "Approved", "Rejected", "Hidden"].includes(status)) {
        return errorResponse(res, 400, "Invalid status");
      }

      const updateData = { status };
      if (adminResponse) {
        updateData.adminResponse = adminResponse;
        updateData.responseDate = new Date();
      }

      const rating = await Rating.findByIdAndUpdate(req.params.id, updateData, {
        new: true,
      })
        .populate("userId", "name email mobile")
        .populate("scheduleId")
        .populate("busId", "busName busNumber")
        .populate("routeId", "name startPoint")
        .populate("bookingId", "bookingReference");

      if (!rating) {
        return errorResponse(res, 404, "Rating not found");
      }

      successResponse(res, 200, "Rating status updated successfully", rating);
    } catch (error) {
      console.error("Update rating status error:", error);
      errorResponse(res, 500, "Failed to update rating status", error.message);
    }
  }
);

/*
 * @swagger
 * /api/ratings/stats/overview:
 *   get:
 *     summary: Get rating statistics (Admin only)
 *     tags: [Ratings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Rating statistics retrieved successfully
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
 *                         totalRatings:
 *                           type: integer
 *                         pendingRatings:
 *                           type: integer
 *                         approvedRatings:
 *                           type: integer
 *                         rejectedRatings:
 *                           type: integer
 *                         hiddenRatings:
 *                           type: integer
 *                         ratingStats:
 *                           type: object
 *                           properties:
 *                             avgRating:
 *                               type: number
 *                             avgServiceRating:
 *                               type: number
 *                             avgDriverRating:
 *                               type: number
 *                             avgBusRating:
 *                               type: number
 *                             avgPunctualityRating:
 *                               type: number
 *                             totalHelpfulVotes:
 *                               type: integer
 *                             totalReports:
 *                               type: integer
 *                         ratingDistribution:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               rating:
 *                                 type: integer
 *                               count:
 *                                 type: integer
 *                         topRatedRoutes:
 *                           type: array
 *                           items:
 *                             type: object
 *                         topRatedBuses:
 *                           type: array
 *                           items:
 *                             type: object
 *                         recentRatings:
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
      const totalRatings = await Rating.countDocuments();
      const approvedRatings = await Rating.countDocuments({
        status: "Approved",
      });
      const pendingRatings = await Rating.countDocuments({ status: "Pending" });
      const rejectedRatings = await Rating.countDocuments({
        status: "Rejected",
      });

      const averageRating = await Rating.aggregate([
        { $match: { status: "Approved" } },
        { $group: { _id: null, avg: { $avg: "$rating" } } },
      ]);

      const ratingDistribution = await Rating.aggregate([
        { $match: { status: "Approved" } },
        {
          $group: {
            _id: "$rating",
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]);

      const statusStats = await Rating.aggregate([
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
          },
        },
      ]);

      const monthlyRatings = await Rating.aggregate([
        {
          $group: {
            _id: {
              year: { $year: "$createdAt" },
              month: { $month: "$createdAt" },
            },
            count: { $sum: 1 },
            avgRating: { $avg: "$rating" },
          },
        },
        { $sort: { "_id.year": -1, "_id.month": -1 } },
        { $limit: 12 },
      ]);

      const topRatedBuses = await Rating.aggregate([
        { $match: { status: "Approved" } },
        {
          $group: {
            _id: "$busId",
            busName: { $first: "$busName" },
            avgRating: { $avg: "$rating" },
            count: { $sum: 1 },
          },
        },
        { $sort: { avgRating: -1 } },
        { $limit: 10 },
      ]);

      successResponse(res, 200, "Rating statistics retrieved successfully", {
        totalRatings,
        approvedRatings,
        pendingRatings,
        rejectedRatings,
        averageRating: averageRating[0]?.avg || 0,
        ratingDistribution,
        statusStats,
        monthlyRatings,
        topRatedBuses,
      });
    } catch (error) {
      console.error("Get rating stats error:", error);
      errorResponse(
        res,
        500,
        "Failed to retrieve rating statistics",
        error.message
      );
    }
  }
);

module.exports = router;
