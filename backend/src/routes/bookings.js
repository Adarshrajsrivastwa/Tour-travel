const express = require("express");
const Booking = require("../models/Booking");
const OnboardSchedule = require("../models/OnboardSchedule");
const Bus = require("../models/Bus");
const Route = require("../models/Route");
const User = require("../models/User");
const BusinessInfo = require("../models/BusinessInfo");
const Rating = require("../models/Rating");
const {
  successResponse,
  errorResponse,
  paginatedResponse,
} = require("../utils/response");
const {
  authenticateToken,
  requireAdmin,
  requireAdminOrOwner,
  optionalAuth,
} = require("../middleware/auth");
const {
  validateTicketBooking,
  validateObjectId,
  validatePagination,
} = require("../middleware/validation");
const { calculateFare } = require("../utils/fareCalculator");

const router = express.Router();

// Helper function to get driver ID for driver/conductor users
async function getDriverIdForUser(user) {
  // If user is not a driver/conductor, return null
  if (!user?.accountDetails?.isDriverOrConductor) {
    return null;
  }

  // Find the Driver record by email or mobile
  const Driver = require("../models/Driver");
  const driverRecord = await Driver.findOne({
    $or: [{ email: user.email }, { mobile: user.mobile }],
  });

  return driverRecord ? driverRecord._id : null;
}

// Helper function to build booking filter for driver/conductor users
// Returns null if user should see all bookings (full admin), or a filter object
async function buildBookingFilter(user) {
  // If user is full admin (not driver/conductor), return null (no filter needed)
  if (!user?.accountDetails?.isDriverOrConductor) {
    return null;
  }

  // Get the driver ID for this user
  const driverId = await getDriverIdForUser(user);
  if (!driverId) {
    // If user is marked as driver/conductor but no Driver record found, return filter that matches nothing
    return { _id: null };
  }

  // Find all schedules where this driver/conductor is assigned
  const OnboardSchedule = require("../models/OnboardSchedule");
  const schedules = await OnboardSchedule.find({
    "assignedTeam.id": driverId,
  }).select("_id");

  const scheduleIds = schedules.map((s) => s._id);

  // If no schedules found, return filter that matches nothing
  if (scheduleIds.length === 0) {
    return { _id: null };
  }

  // Return filter to only show bookings for schedules where this driver/conductor is assigned
  return { scheduleId: { $in: scheduleIds } };
}

// Seat layout helper utilities (same as onboard.js and buses.js)
const seatArchitectureColumnMap = {
  "2+2": 4,
  "2+1": 3,
  "1+1": 2,
  "3+2": 5,
};

function generateSeatLabel(row, column) {
  return `${String.fromCharCode(65 + row)}${column + 1}`;
}

function buildLayoutFromMapOrSeats(layout = {}) {
  const hasMap = Array.isArray(layout.map) && layout.map.length > 0;
  const hasSeats = Array.isArray(layout.seats) && layout.seats.length > 0;

  if (!hasMap && !hasSeats) {
    return null;
  }

  const inferredRows =
    layout.rows ||
    (hasMap
      ? layout.map.length
      : hasSeats
      ? Math.max(...layout.seats.map((s) => s.row || 0)) + 1
      : 0);
  const inferredCols =
    layout.columns ||
    (hasMap
      ? Math.max(
          ...layout.map.map((row) => (Array.isArray(row) ? row.length : 0)),
          0
        )
      : hasSeats
      ? Math.max(...layout.seats.map((s) => s.column || 0)) + 1
      : 0);

  const rows = inferredRows || 0;
  const columns = inferredCols || 0;
  if (!rows || !columns) {
    return null;
  }

  const map = [];

  for (let rowIndex = 0; rowIndex < rows; rowIndex++) {
    const rowData = [];
    for (let colIndex = 0; colIndex < columns; colIndex++) {
      let seatData = null;
      if (
        hasMap &&
        layout.map[rowIndex] &&
        typeof layout.map[rowIndex][colIndex] !== "undefined"
      ) {
        seatData = layout.map[rowIndex][colIndex];
      } else if (hasSeats) {
        seatData = layout.seats.find(
          (seat) => seat.row === rowIndex && seat.column === colIndex
        );
      }

      const customLabel = seatData?.seatLabel
        ? seatData.seatLabel.toString().toUpperCase().trim()
        : "";
      // Seat is enabled ONLY if it has a seatLabel (seat number assigned)
      const enabled = customLabel.length > 0;
      const mapSeatLabel = customLabel || "";

      rowData.push({
        enabled,
        seatLabel: mapSeatLabel,
      });
    }
    map.push(rowData);
  }

  // Calculate total enabled seats from map
  const totalSeats = map.reduce((count, row) => {
    return count + row.filter((seat) => seat.enabled).length;
  }, 0);

  return {
    rows,
    columns,
    map,
    totalSeats,
  };
}

function buildDefaultSeatLayout(bus = {}) {
  if (!bus || !bus.seatCapacity) {
    return null;
  }

  const columns = seatArchitectureColumnMap[bus.seatArchitecture] || 4;
  const rows = Math.max(1, Math.ceil(bus.seatCapacity / columns));
  const map = [];

  // All seats start as disabled by default
  for (let rowIndex = 0; rowIndex < rows; rowIndex++) {
    const rowData = [];
    for (let colIndex = 0; colIndex < columns; colIndex++) {
      const enabled = false;
      const mapSeatLabel = "";

      rowData.push({
        enabled,
        seatLabel: mapSeatLabel,
      });
    }
    map.push(rowData);
  }

  return {
    rows,
    columns,
    map,
    totalSeats: 0,
  };
}

function normalizeSeatLayout(busDoc) {
  if (!busDoc) {
    return null;
  }

  const bus =
    typeof busDoc.toObject === "function" ? busDoc.toObject() : busDoc;
  const normalizedFromStored = bus.seatLayout
    ? buildLayoutFromMapOrSeats(bus.seatLayout)
    : null;

  if (normalizedFromStored) {
    return normalizedFromStored;
  }

  return buildDefaultSeatLayout(bus);
}

// Helper function to get all valid seat labels from a seat layout
function getValidSeatLabels(seatLayout) {
  if (!seatLayout || !seatLayout.map) {
    return [];
  }

  const validSeats = [];
  seatLayout.map.forEach((row) => {
    row.forEach((seat) => {
      if (seat.enabled && seat.seatLabel && seat.seatLabel.trim().length > 0) {
        validSeats.push(seat.seatLabel.toUpperCase().trim());
      }
    });
  });

  return validSeats;
}

/*
 * @swagger
 * /api/bookings:
 *   get:
 *     summary: Get all bookings
 *     tags: [Bookings]
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
 *         description: Number of bookings per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term for customer name, mobile, email, bus, or route
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [all, Confirmed, Pending, Cancelled, Completed, No-Show]
 *           default: all
 *         description: Filter by booking status
 *       - in: query
 *         name: dateFrom
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter bookings from this date
 *       - in: query
 *         name: dateTo
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter bookings to this date
 *     responses:
 *       200:
 *         description: Bookings retrieved successfully
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
 */
router.get("/", authenticateToken, validatePagination, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const { sanitizeSearchQuery } = require("../utils/sanitize");
    const rawSearch = req.query.search || "";
    const search = sanitizeSearchQuery(rawSearch);
    const status = req.query.status || "all";
    const dateFrom = req.query.dateFrom;
    const dateTo = req.query.dateTo;

    // Build search query - sanitized
    let searchQuery = {};

    if (search) {
      const searchConditions = [
        { userName: { $regex: search, $options: "i" } },
        { userMobile: { $regex: search, $options: "i" } },
        { userEmail: { $regex: search, $options: "i" } },
        { busName: { $regex: search, $options: "i" } },
        { routeName: { $regex: search, $options: "i" } },
      ];

      // Check if search contains booking reference pattern
      // Booking reference format: BB + last 8 hex chars of ObjectId (e.g., BB7DD510A3)
      // Supports partial matching: BB7DD, BB7DD510, BB7DD510A3, etc.
      const upperSearch = search.toUpperCase();

      if (upperSearch.startsWith("BB")) {
        // Extract hex part after "BB"
        const hexPart = upperSearch.substring(2);
        if (hexPart.length > 0) {
          // Search for bookings where the _id contains the hexPart in the last part
          // Allow partial matching anywhere in the ObjectId string
          searchConditions.push({
            $expr: {
              $regexMatch: {
                input: { $toString: "$_id" },
                regex: hexPart,
                options: "i",
              },
            },
          });
        }
      } else if (/^[0-9a-fA-F]{1,}$/i.test(search)) {
        // If it's just hex characters (without BB prefix), also search by ObjectId
        // This handles searches like "7DD510A3" or "7DD5" directly
        searchConditions.push({
          $expr: {
            $regexMatch: {
              input: { $toString: "$_id" },
              regex: search.toUpperCase(),
              options: "i",
            },
          },
        });
      }

      searchQuery.$or = searchConditions;
    }

    if (status !== "all") {
      searchQuery.status = status;
    }

    if (dateFrom || dateTo) {
      searchQuery.travelDate = {};
      if (dateFrom) searchQuery.travelDate.$gte = new Date(dateFrom);
      if (dateTo) searchQuery.travelDate.$lte = new Date(dateTo);
    }

    // Apply driver/conductor filter if user is driver/conductor
    const driverFilter = await buildBookingFilter(req.user);
    if (driverFilter !== null) {
      // Merge driver filter with existing search query
      searchQuery = { ...searchQuery, ...driverFilter };
    }

    // Get bookings with pagination
    const bookings = await Booking.find(searchQuery)
      .populate("userId", "name email mobile")
      .populate({
        path: "scheduleId",
        populate: {
          path: "assignedTeam.id",
          model: "Driver",
          select: "fullName mobile"
        }
      })
      .populate("busId", "busName busNumber")
      .populate("routeId", "name startPoint")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Add driver details to each booking
    const bookingsWithDriverDetails = bookings.map((booking) => {
      const bookingObj = booking;
      
      // Extract driver and conductor details from schedule
      let driverName = booking.driverName || "Not assigned";
      let driverNumber = null;
      let conductorName = booking.conductorName || "Not assigned";
      let conductorNumber = null;

      if (booking.scheduleId && booking.scheduleId.assignedTeam && Array.isArray(booking.scheduleId.assignedTeam)) {
        const driver = booking.scheduleId.assignedTeam.find(
          (member) => member.role === "Driver"
        );
        const conductor = booking.scheduleId.assignedTeam.find(
          (member) => member.role === "Conductor"
        );

        if (driver) {
          driverName = driver.name || driver.id?.fullName || driverName;
          driverNumber = driver.id?.mobile || null;
        }

        if (conductor) {
          conductorName = conductor.name || conductor.id?.fullName || conductorName;
          conductorNumber = conductor.id?.mobile || null;
        }
      }

      return {
        ...bookingObj,
        driverDetails: {
          driverName: driverName,
          driverNumber: driverNumber,
          conductorName: conductorName,
          conductorNumber: conductorNumber,
        },
      };
    });

    const total = await Booking.countDocuments(searchQuery);

    paginatedResponse(res, 200, "Bookings retrieved successfully", bookingsWithDriverDetails, {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    });
  } catch (error) {
    const logger = require("../utils/logger");
    logger.error("Get bookings error:", error);
    errorResponse(res, 500, "Failed to retrieve bookings", error.message);
  }
});

/**
 * @swagger
 * /api/bookings/history:
 *   get:
 *     summary: Get user ticket booking history
 *     description: Get ticket booking history for the authenticated user with source, destination, departure/arrival times, travel duration, date, price, and driver details (driver name, driver number, conductor name, conductor number)
 *     tags: [Bookings]
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
 *         description: Number of bookings per page
 *     responses:
 *       200:
 *         description: Ticket history retrieved successfully
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
 *                         type: object
 *                         properties:
 *                           bookingId:
 *                             type: string
 *                           bookingReference:
 *                             type: string
 *                           source:
 *                             type: string
 *                           destination:
 *                             type: string
 *                           departureTime:
 *                             type: string
 *                           arrivalTime:
 *                             type: string
 *                           travelDuration:
 *                             type: string
 *                           travelDate:
 *                             type: string
 *                           travelDateTime:
 *                             type: string
 *                           price:
 *                             type: number
 *                           status:
 *                             type: string
 *                           ratingId:
 *                             type: string
 *                             nullable: true
 *                             description: Rating ID if user has rated this schedule, null otherwise
 *                           driverDetails:
 *                             type: object
 *                             properties:
 *                               driverName:
 *                                 type: string
 *                               driverNumber:
 *                                 type: string
 *                                 nullable: true
 *                               conductorName:
 *                                 type: string
 *                               conductorNumber:
 *                                 type: string
 *                                 nullable: true
 *                     pagination:
 *                       type: object
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get(
  "/history",
  authenticateToken,
  validatePagination,
  async (req, res) => {
    try {
      const userId = req.user._id;
      const userEmail = req.user.email
        ? req.user.email.toLowerCase().trim()
        : null;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const skip = (page - 1) * limit;

      // Build query to match by userId OR email (case-insensitive for bookings created without login)
      const query = {
        $or: [{ userId: userId }],
      };

      // Add email match if user has email (case-insensitive)
      if (userEmail) {
        query.$or.push({
          userEmail: {
            $regex: new RegExp(
              `^${userEmail.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
              "i"
            ),
          },
        });
      }

      // Get user bookings with schedule and driver details
      const bookings = await Booking.find(query)
        .populate("routeId", "estimatedTravelTime startPoint")
        .populate({
          path: "scheduleId",
          populate: {
            path: "assignedTeam.id",
            model: "Driver",
            select: "fullName mobile"
          }
        })
        .sort({ travelDate: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();

      // Get all schedule IDs from bookings
      const scheduleIds = bookings
        .map(booking => {
          const schedule = booking.scheduleId;
          return schedule && typeof schedule === 'object' ? schedule._id : schedule;
        })
        .filter(id => id);

      // Find ratings for these schedules by this user
      const ratings = await Rating.find({
        userId: userId,
        scheduleId: { $in: scheduleIds }
      }).select("_id scheduleId").lean();

      // Create a map of scheduleId -> ratingId for quick lookup
      const ratingMap = new Map();
      ratings.forEach(rating => {
        const scheduleId = rating.scheduleId && typeof rating.scheduleId === 'object' 
          ? rating.scheduleId._id.toString() 
          : rating.scheduleId.toString();
        ratingMap.set(scheduleId, rating._id.toString());
      });

      // Calculate travel duration and format data
      const ticketHistory = bookings.map((booking) => {
        // Calculate travel duration in hours and minutes
        let travelDuration = null;
        if (booking.departureTime && booking.arrivalTime) {
          const [depHours, depMins] = booking.departureTime
            .split(":")
            .map(Number);
          const [arrHours, arrMins] = booking.arrivalTime
            .split(":")
            .map(Number);

          let depTotalMins = depHours * 60 + depMins;
          let arrTotalMins = arrHours * 60 + arrMins;

          // Handle next day arrival (if arrival time is earlier than departure)
          if (arrTotalMins < depTotalMins) {
            arrTotalMins += 24 * 60; // Add 24 hours
          }

          const durationMins = arrTotalMins - depTotalMins;
          const hours = Math.floor(durationMins / 60);
          const minutes = durationMins % 60;
          travelDuration = `${hours}h ${minutes}m`;
        } else if (booking.routeId?.estimatedTravelTime) {
          // Fallback to route estimated travel time
          const hours = Math.floor(booking.routeId.estimatedTravelTime / 60);
          const minutes = booking.routeId.estimatedTravelTime % 60;
          travelDuration = `${hours}h ${minutes}m`;
        }

        // Format travel date and time
        const travelDate = new Date(booking.travelDate);
        const travelDateTime = `${travelDate.toLocaleDateString()} ${
          booking.departureTime || ""
        }`;

        // Extract driver and conductor details from schedule
        let driverName = booking.driverName || "Not assigned";
        let driverNumber = null;
        let conductorName = booking.conductorName || "Not assigned";
        let conductorNumber = null;

        // Check if scheduleId is populated (object) or just an ObjectId
        const schedule = booking.scheduleId;
        let scheduleIdString = null;
        
        if (schedule && typeof schedule === 'object') {
          scheduleIdString = schedule._id ? schedule._id.toString() : null;
          
          if (schedule.assignedTeam && Array.isArray(schedule.assignedTeam)) {
            const driver = schedule.assignedTeam.find(
              (member) => member && member.role === "Driver"
            );
            const conductor = schedule.assignedTeam.find(
              (member) => member && member.role === "Conductor"
            );

            if (driver) {
              // Check if driver.id is populated (object with fullName/mobile) or just ObjectId
              if (driver.id && typeof driver.id === 'object') {
                driverName = driver.name || driver.id.fullName || driverName;
                driverNumber = driver.id.mobile || null;
              } else {
                // If driver.id is just an ObjectId, use driver.name
                driverName = driver.name || driverName;
              }
            }

            if (conductor) {
              // Check if conductor.id is populated (object with fullName/mobile) or just ObjectId
              if (conductor.id && typeof conductor.id === 'object') {
                conductorName = conductor.name || conductor.id.fullName || conductorName;
                conductorNumber = conductor.id.mobile || null;
              } else {
                // If conductor.id is just an ObjectId, use conductor.name
                conductorName = conductor.name || conductorName;
              }
            }
          }
        } else if (schedule) {
          scheduleIdString = schedule.toString();
        }

        // Get rating ID for this schedule if user has rated it
        const ratingId = scheduleIdString ? ratingMap.get(scheduleIdString) || null : null;

        return {
          bookingId: booking._id.toString(),
          bookingReference: `BB${booking._id
            .toString()
            .slice(-8)
            .toUpperCase()}`,
          source: booking.source || booking.routeId?.startPoint || "N/A",
          destination: booking.destination || "N/A",
          departureTime: booking.departureTime || "N/A",
          arrivalTime: booking.arrivalTime || "N/A",
          travelDuration: travelDuration || "N/A",
          travelDate: travelDate.toLocaleDateString(),
          travelDateTime: travelDateTime.trim(),
          price: booking.fare,
          status: booking.status,
          gstNumber: booking.gstNumber || null,
          ratingId: ratingId,
          driverDetails: {
            driverName: driverName,
            driverNumber: driverNumber,
            conductorName: conductorName,
            conductorNumber: conductorNumber,
          },
        };
      });

      // Build count query (same as above)
      const countQuery = {
        $or: [{ userId: userId }],
      };

      if (userEmail) {
        countQuery.$or.push({
          userEmail: {
            $regex: new RegExp(
              `^${userEmail.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
              "i"
            ),
          },
        });
      }

      const total = await Booking.countDocuments(countQuery);

      paginatedResponse(
        res,
        200,
        "Ticket history retrieved successfully",
        ticketHistory,
        {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        }
      );
    } catch (error) {
      const logger = require("../utils/logger");
      logger.error("Get ticket history error:", error);
      errorResponse(
        res,
        500,
        "Failed to retrieve ticket history",
        error.message
      );
    }
  }
);

/*
 * @swagger
 * /api/bookings/{id}:
 *   get:
 *     summary: Get booking by ID
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Booking ID
 *     responses:
 *       200:
 *         description: Booking retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Booking'
 *       404:
 *         description: Booking not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get("/:id", authenticateToken, validateObjectId, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate("userId", "name email mobile")
      .populate({
        path: "scheduleId",
        populate: {
          path: "assignedTeam.id",
          model: "Driver",
          select: "fullName mobile"
        }
      })
      .populate("busId", "busName busNumber")
      .populate("routeId", "name startPoint stops");

    if (!booking) {
      return errorResponse(res, 404, "Booking not found");
    }

    // Check if user is driver/conductor and has access to this booking
    if (req.user?.accountDetails?.isDriverOrConductor) {
      const driverId = await getDriverIdForUser(req.user);
      if (driverId) {
        // Check if the booking's schedule has this driver/conductor in assignedTeam
        const schedule = booking.scheduleId;
        if (schedule && schedule.assignedTeam) {
          const isAssigned = schedule.assignedTeam.some(
            (member) => member.id && member.id.toString() === driverId.toString()
          );
          if (!isAssigned) {
            return errorResponse(
              res,
              403,
              "Access denied. You can only view bookings for schedules you are assigned to."
            );
          }
        } else {
          return errorResponse(
            res,
            403,
            "Access denied. You can only view bookings for schedules you are assigned to."
          );
        }
      } else {
        return errorResponse(
          res,
          403,
          "Access denied. Driver/Conductor record not found."
        );
      }
    }

    // Helper function to convert 24-hour format to 12-hour format with AM/PM
    const formatTime12Hour = (time24) => {
      if (!time24 || typeof time24 !== "string") return time24;
      const [hours, minutes] = time24.split(":").map(Number);
      if (isNaN(hours) || isNaN(minutes)) return time24;

      let hour12 = hours % 12;
      if (hour12 === 0) hour12 = 12; // 0 or 12 both become 12
      const ampm = hours < 12 ? "AM" : "PM";
      return `${hour12}:${minutes.toString().padStart(2, "0")} ${ampm}`;
    };

    // Helper function to check if arrival is next day
    const isNextDay = (departureTime, arrivalTime) => {
      if (!departureTime || !arrivalTime) return false;
      const [depHours, depMins] = departureTime.split(":").map(Number);
      const [arrHours, arrMins] = arrivalTime.split(":").map(Number);
      if (
        isNaN(depHours) ||
        isNaN(depMins) ||
        isNaN(arrHours) ||
        isNaN(arrMins)
      )
        return false;

      const depTotalMins = depHours * 60 + depMins;
      const arrTotalMins = arrHours * 60 + arrMins;

      // If arrival time is earlier than departure (e.g., 00:22 < 23:42), it's next day
      return arrTotalMins < depTotalMins;
    };

    // Convert booking to object and format times
    const bookingResponse = booking.toObject();
    const departureTimeReadable = formatTime12Hour(booking.departureTime);
    const arrivalTimeReadable = formatTime12Hour(booking.arrivalTime);
    const arrivalIsNextDay = isNextDay(
      booking.departureTime,
      booking.arrivalTime
    );

    // Replace with readable format
    bookingResponse.departureTime =
      departureTimeReadable || booking.departureTime;
    if (arrivalIsNextDay && arrivalTimeReadable) {
      bookingResponse.arrivalTime = `${arrivalTimeReadable} (Next Day)`;
    } else {
      bookingResponse.arrivalTime = arrivalTimeReadable || booking.arrivalTime;
    }

    // Extract driver and conductor details from schedule
    let driverName = booking.driverName || "Not assigned";
    let driverNumber = null;
    let conductorName = booking.conductorName || "Not assigned";
    let conductorNumber = null;

    if (booking.scheduleId && booking.scheduleId.assignedTeam && Array.isArray(booking.scheduleId.assignedTeam)) {
      const driver = booking.scheduleId.assignedTeam.find(
        (member) => member.role === "Driver"
      );
      const conductor = booking.scheduleId.assignedTeam.find(
        (member) => member.role === "Conductor"
      );

      if (driver) {
        driverName = driver.name || driver.id?.fullName || driverName;
        driverNumber = driver.id?.mobile || null;
      }

      if (conductor) {
        conductorName = conductor.name || conductor.id?.fullName || conductorName;
        conductorNumber = conductor.id?.mobile || null;
      }
    }

    // Add driver details to response
    bookingResponse.driverDetails = {
      driverName: driverName,
      driverNumber: driverNumber,
      conductorName: conductorName,
      conductorNumber: conductorNumber,
    };

    successResponse(
      res,
      200,
      "Booking retrieved successfully",
      bookingResponse
    );
  } catch (error) {
    console.error("Get booking error:", error);
    errorResponse(res, 500, "Failed to retrieve booking", error.message);
  }
});

/**
 * @swagger
 * /api/bookings/ticket/{id}:
 *   get:
 *     summary: Get ticket details by booking ID
 *     description: Retrieve detailed ticket information for a specific booking including passenger details, route information, seat numbers, fare, and travel times. This endpoint provides ticket-specific formatting suitable for display or printing.
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Booking ID
 *     responses:
 *       200:
 *         description: Ticket details retrieved successfully
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
 *                         bookingId:
 *                           type: string
 *                         bookingReference:
 *                           type: string
 *                         passengerName:
 *                           type: string
 *                         age:
 *                           type: number
 *                         gender:
 *                           type: string
 *                         contactNumber:
 *                           type: string
 *                         email:
 *                           type: string
 *                         busName:
 *                           type: string
 *                         busNumber:
 *                           type: string
 *                         routeName:
 *                           type: string
 *                         source:
 *                           type: string
 *                         destination:
 *                           type: string
 *                         seats:
 *                           type: array
 *                           items:
 *                             type: string
 *                         fare:
 *                           type: number
 *                         travelDate:
 *                           type: string
 *                         departureTime:
 *                           type: string
 *                         arrivalTime:
 *                           type: string
 *                         status:
 *                           type: string
 *                         crewDetails:
 *                           type: object
 *                           properties:
 *                             driverName:
 *                               type: string
 *                             driverNumber:
 *                               type: string
 *                             conductorName:
 *                               type: string
 *                             conductorNumber:
 *                               type: string
 *       404:
 *         description: Booking not found
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
 */
router.get(
  "/ticket/:id",
  authenticateToken,
  validateObjectId,
  async (req, res) => {
    try {
      const bookingId = req.params.id;

      // Get booking with all related data
      const booking = await Booking.findById(bookingId)
        .populate("userId", "name email mobile")
        .populate({
          path: "scheduleId",
          populate: {
            path: "assignedTeam.id",
            model: "Driver",
            select: "fullName mobile"
          }
        })
        .populate("busId", "busName busNumber seatCapacity acType")
        .populate(
          "routeId",
          "name startPoint stops totalDistance estimatedTravelTime"
        );

      if (!booking) {
        return errorResponse(res, 404, "Booking not found");
      }

      // Check if user is driver/conductor and has access to this booking
      if (req.user?.accountDetails?.isDriverOrConductor) {
        const driverId = await getDriverIdForUser(req.user);
        if (driverId) {
          // Check if the booking's schedule has this driver/conductor in assignedTeam
          const schedule = booking.scheduleId;
          if (schedule && schedule.assignedTeam) {
            const isAssigned = schedule.assignedTeam.some(
              (member) => member.id && member.id.toString() === driverId.toString()
            );
            if (!isAssigned) {
              return errorResponse(
                res,
                403,
                "Access denied. You can only view bookings for schedules you are assigned to."
              );
            }
          } else {
            return errorResponse(
              res,
              403,
              "Access denied. You can only view bookings for schedules you are assigned to."
            );
          }
        } else {
          return errorResponse(
            res,
            403,
            "Access denied. Driver/Conductor record not found."
          );
        }
      }

      // Get scheduleId from booking - it should be stored when booking is created
      let scheduleId = null;
      if (booking.scheduleId) {
        // If scheduleId is populated as object (from populate), get its _id
        scheduleId = booking.scheduleId._id
          ? booking.scheduleId._id.toString()
          : booking.scheduleId.toString();
      }

      // Helper function to convert 24-hour format to 12-hour format with AM/PM
      const formatTime12Hour = (time24) => {
        if (!time24 || typeof time24 !== "string") return time24;
        const [hours, minutes] = time24.split(":").map(Number);
        if (isNaN(hours) || isNaN(minutes)) return time24;

        let hour12 = hours % 12;
        if (hour12 === 0) hour12 = 12; // 0 or 12 both become 12
        const ampm = hours < 12 ? "AM" : "PM";
        return `${hour12}:${minutes.toString().padStart(2, "0")} ${ampm}`;
      };

      // Helper function to check if arrival is next day
      const isNextDay = (departureTime, arrivalTime) => {
        if (!departureTime || !arrivalTime) return false;
        const [depHours, depMins] = departureTime.split(":").map(Number);
        const [arrHours, arrMins] = arrivalTime.split(":").map(Number);
        if (
          isNaN(depHours) ||
          isNaN(depMins) ||
          isNaN(arrHours) ||
          isNaN(arrMins)
        )
          return false;

        const depTotalMins = depHours * 60 + depMins;
        const arrTotalMins = arrHours * 60 + arrMins;

        // If arrival time is earlier than departure (e.g., 00:22 < 23:42), it's next day
        return arrTotalMins < depTotalMins;
      };

      // Format travel date
      const travelDate = new Date(booking.travelDate);
      const formattedDate = travelDate.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });

      // Format times
      const departureTimeReadable = formatTime12Hour(booking.departureTime);
      const arrivalTimeReadable = formatTime12Hour(booking.arrivalTime);
      const arrivalIsNextDay = isNextDay(
        booking.departureTime,
        booking.arrivalTime
      );

      // Extract staff information from schedule's assignedTeam
      const schedule = booking.scheduleId;
      let driverName = booking.driverName || "Not assigned";
      let driverNumber = null;
      let conductorName = booking.conductorName || "Not assigned";
      let conductorNumber = null;

      if (schedule && schedule.assignedTeam && Array.isArray(schedule.assignedTeam)) {
        const driver = schedule.assignedTeam.find(
          (member) => member.role === "Driver"
        );
        const conductor = schedule.assignedTeam.find(
          (member) => member.role === "Conductor"
        );

        if (driver) {
          driverName = driver.name || driver.id?.fullName || driverName;
          driverNumber = driver.id?.mobile || null;
        }

        if (conductor) {
          conductorName = conductor.name || conductor.id?.fullName || conductorName;
          conductorNumber = conductor.id?.mobile || null;
        }
      }

      // Build ticket details response
      const ticketDetails = {
        bookingId: booking._id.toString(),
        scheduleId: scheduleId,
        bookingReference: `BB${booking._id.toString().slice(-8).toUpperCase()}`,
        passengerDetails: {
          name: booking.passengerName || booking.userName,
          age: booking.age || null,
          gender: booking.gender || null,
          contactNumber: booking.userMobile,
          altContactNumber: booking.altContactNumber || null,
          email: booking.userEmail,
          city: booking.city || null,
          state: booking.state || null,
        },
        travelDetails: {
          routeName: booking.routeName,
          source: booking.source || booking.routeId?.startPoint || "N/A",
          destination: booking.destination || "N/A",
          travelDate: formattedDate,
          travelDateRaw: booking.travelDate,
          departureTime: departureTimeReadable || booking.departureTime,
          departureTime24: booking.departureTime,
          arrivalTime:
            arrivalIsNextDay && arrivalTimeReadable
              ? `${arrivalTimeReadable} (Next Day)`
              : arrivalTimeReadable || booking.arrivalTime,
          arrivalTime24: booking.arrivalTime,
          isNextDay: arrivalIsNextDay,
        },
        busDetails: {
          busName: booking.busName,
          busNumber: booking.busNumber,
          seatCapacity: booking.busId?.seatCapacity || null,
          acType: booking.busId?.acType || null,
        },
        bookingDetails: {
          seats: booking.seats,
          numberOfSeats: booking.seats.length,
          fare: booking.fare,
          farePerSeat:
            booking.seats.length > 0
              ? (booking.fare / booking.seats.length).toFixed(2)
              : booking.fare,
          status: booking.status,
          bookingDate: booking.createdAt,
          specialRequests: booking.specialRequests || null,
        },
        crewDetails: {
          driverName: driverName,
          driverNumber: driverNumber,
          conductorName: conductorName,
          conductorNumber: conductorNumber,
        },
        routeInfo: {
          totalDistance: booking.routeId?.totalDistance || null,
          estimatedTravelTime: booking.routeId?.estimatedTravelTime || null,
          totalStops: booking.routeId?.stops?.length || 0,
        },
        gstNumber: booking.gstNumber || null,
      };

      successResponse(
        res,
        200,
        "Ticket details retrieved successfully",
        ticketDetails
      );
    } catch (error) {
      const logger = require("../utils/logger");
      logger.error("Get ticket details error:", error);
      errorResponse(
        res,
        500,
        "Failed to retrieve ticket details",
        error.message
      );
    }
  }
);

/**
 * @swagger
 * /api/bookings/ticket:
 *   post:
 *     summary: Create ticket booking with passenger details
 *     description: Create a new ticket booking with passenger information including name, age, contact, gender, email, city, state, and seat details. This endpoint requires authentication.
 *     tags: [Bookings]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - passengerName
 *               - age
 *               - contactNumber
 *               - gender
 *               - email
 *               - city
 *               - state
 *               - scheduleId
 *               - source
 *               - destination
 *               - seats
 *               - travelDate
 *             properties:
 *               passengerName:
 *                 type: string
 *                 example: "John Doe"
 *               age:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 120
 *                 example: 30
 *               contactNumber:
 *                 type: string
 *                 example: "+919876543210"
 *               altContactNumber:
 *                 type: string
 *                 example: "+919876543211"
 *               gender:
 *                 type: string
 *                 enum: [Male, Female, Other, Prefer not to say]
 *                 example: "Male"
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "john.doe@example.com"
 *               city:
 *                 type: string
 *                 example: "Mumbai"
 *               state:
 *                 type: string
 *                 example: "Maharashtra"
 *               scheduleId:
 *                 type: string
 *                 example: "60d0fe4f5311236168a109cf"
 *               source:
 *                 type: string
 *                 example: "Mumbai"
 *               destination:
 *                 type: string
 *                 example: "Delhi"
 *               seats:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["A1", "A2"]
 *               travelDate:
 *                 type: string
 *                 format: date
 *                 example: "2024-03-15"
 *     responses:
 *       201:
 *         description: Ticket booking created successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Booking'
 *       400:
 *         description: Validation error or schedule not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Schedule not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  "/ticket",
  authenticateToken,
  validateTicketBooking,
  async (req, res) => {
    try {
      const bookingData = req.body;

      // Get schedule details
      const schedule = await OnboardSchedule.findById(bookingData.scheduleId)
        .populate("busId")
        .populate("routeId");

      if (!schedule) {
        return errorResponse(res, 404, "Schedule not found");
      }

      // Check if schedule is active
      if (schedule.status !== "Scheduled") {
        return errorResponse(res, 400, "Schedule is not available for booking");
      }

      // Check if travel date is valid (today or future)
      const travelDate = new Date(bookingData.travelDate);
      travelDate.setHours(0, 0, 0, 0); // Normalize to start of day
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (travelDate < today) {
        return errorResponse(res, 400, "Cannot book for past dates");
      }

      // Validate that requested seats exist in the bus's seat layout
      const busSeatLayout = normalizeSeatLayout(schedule.busId);
      if (!busSeatLayout || !busSeatLayout.map) {
        return errorResponse(
          res,
          400,
          "Bus seat layout is not configured. Please configure the seat layout before booking."
        );
      }

      // Get all valid seat labels from the bus layout
      const validSeatLabels = getValidSeatLabels(busSeatLayout);

      if (validSeatLabels.length === 0) {
        return errorResponse(
          res,
          400,
          "No seats are configured for this bus. Please configure seat numbers in the bus layout."
        );
      }

      // Validate that all requested seats exist in the bus layout
      const requestedSeats = bookingData.seats.map((seat) =>
        seat.toUpperCase().trim()
      );
      const invalidSeats = requestedSeats.filter(
        (seat) => !validSeatLabels.includes(seat)
      );

      if (invalidSeats.length > 0) {
        return errorResponse(
          res,
          400,
          `The following seats do not exist in this bus: ${invalidSeats.join(
            ", "
          )}. Available seats: ${validSeatLabels.slice(0, 20).join(", ")}${
            validSeatLabels.length > 20 ? "..." : ""
          }`
        );
      }

      // Check if seats are already booked for the same schedule and travel date
      // Normalize dates to start of day for accurate comparison
      const nextDay = new Date(travelDate);
      nextDay.setDate(nextDay.getDate() + 1);

      const existingBookings = await Booking.find({
        scheduleId: bookingData.scheduleId,
        travelDate: {
          $gte: travelDate,
          $lt: nextDay,
        },
        status: { $in: ["Active", "Confirmed", "Pending"] },
        seats: { $in: bookingData.seats },
      });

      if (existingBookings.length > 0) {
        const bookedSeats = existingBookings.flatMap(
          (booking) => booking.seats
        );
        const conflictingSeats = bookingData.seats.filter((seat) =>
          bookedSeats.includes(seat)
        );
        return errorResponse(
          res,
          400,
          `Seats ${conflictingSeats.join(", ")} are already booked`
        );
      }

      // Get userId from authenticated user token
      const userId = req.user._id;

      if (!userId) {
        return errorResponse(res, 401, "User authentication required");
      }

      // Helper function to convert 24-hour format to 12-hour format with AM/PM
      const formatTime12Hour = (time24) => {
        if (!time24 || typeof time24 !== "string") return null;
        const [hours, minutes] = time24.split(":").map(Number);
        if (isNaN(hours) || isNaN(minutes)) return null;

        let hour12 = hours % 12;
        if (hour12 === 0) hour12 = 12; // 0 or 12 both become 12
        const ampm = hours < 12 ? "AM" : "PM";
        return `${hour12}:${minutes.toString().padStart(2, "0")} ${ampm}`;
      };

      // Helper function to check if arrival is next day
      const isNextDay = (departureTime, arrivalTime) => {
        if (!departureTime || !arrivalTime) return false;
        const [depHours, depMins] = departureTime.split(":").map(Number);
        const [arrHours, arrMins] = arrivalTime.split(":").map(Number);
        if (
          isNaN(depHours) ||
          isNaN(depMins) ||
          isNaN(arrHours) ||
          isNaN(arrMins)
        )
          return false;

        const depTotalMins = depHours * 60 + depMins;
        const arrTotalMins = arrHours * 60 + arrMins;

        // If arrival time is earlier than departure (e.g., 00:22 < 23:42), it's next day
        return arrTotalMins < depTotalMins;
      };

      // Helper function to calculate arrival time at a stop
      // stopIndex: -1 for start point, 0+ for stops array index
      const calculateArrivalTimeAtStop = (departureTime, route, stopIndex) => {
        if (!departureTime || !route) return null;

        const timeParts = departureTime.split(":");
        if (timeParts.length !== 2) return null;

        let hours = parseInt(timeParts[0], 10);
        let minutes = parseInt(timeParts[1], 10);

        if (isNaN(hours) || isNaN(minutes)) return null;

        // If stopIndex is -1, it's the start point, return departure time as is
        if (stopIndex === -1) {
          return { hours, minutes };
        }

        // Calculate cumulative duration to reach this stop from start point
        if (!route.stops || route.stops.length === 0) return null;

        let totalMinutes = 0;
        // Sum all durations from start point (index 0) up to and including the target stop
        for (let i = 0; i <= stopIndex && i < route.stops.length; i++) {
          if (route.stops[i].durationFromPrev) {
            totalMinutes += route.stops[i].durationFromPrev;
          }
        }

        // Add total minutes to departure time
        let totalTimeInMinutes = hours * 60 + minutes + totalMinutes;
        // Handle next day (if time exceeds 24 hours)
        let arrivalHours = Math.floor(totalTimeInMinutes / 60) % 24;
        let arrivalMinutes = totalTimeInMinutes % 60;

        return { hours: arrivalHours, minutes: arrivalMinutes };
      };

      // Helper function to calculate duration between two stops
      // fromStopIndex: -1 for start point, 0+ for stops array index
      // toStopIndex: -1 for start point, 0+ for stops array index
      const calculateDurationBetweenStops = (
        route,
        fromStopIndex,
        toStopIndex
      ) => {
        if (!route.stops || route.stops.length === 0) return 0;

        // If both are start point, duration is 0
        if (fromStopIndex === -1 && toStopIndex === -1) return 0;

        // If from is start point, calculate from start to toStop
        if (fromStopIndex === -1) {
          let totalMinutes = 0;
          for (let i = 0; i <= toStopIndex && i < route.stops.length; i++) {
            if (route.stops[i].durationFromPrev) {
              totalMinutes += route.stops[i].durationFromPrev;
            }
          }
          return totalMinutes;
        }

        // If to is start point, invalid (can't go backwards)
        if (toStopIndex === -1) return null;

        // Both are stops, calculate duration from fromStop to toStop
        if (fromStopIndex >= toStopIndex) return null; // Invalid order

        let totalMinutes = 0;
        // Sum durations from the stop after fromStopIndex to toStopIndex
        for (
          let i = fromStopIndex + 1;
          i <= toStopIndex && i < route.stops.length;
          i++
        ) {
          if (route.stops[i].durationFromPrev) {
            totalMinutes += route.stops[i].durationFromPrev;
          }
        }
        return totalMinutes;
      };

      // Determine source and destination
      const source = bookingData.source || schedule.routeId.startPoint;
      const destination =
        bookingData.destination ||
        (schedule.routeId.stops && schedule.routeId.stops.length > 0
          ? schedule.routeId.stops[schedule.routeId.stops.length - 1].name
          : null);

      // Validate source is in the route
      let sourceStopIndex = -1;
      let isSourceValid = false;

      // Check if source matches start point
      if (source.toLowerCase() === schedule.routeId.startPoint.toLowerCase()) {
        isSourceValid = true;
        sourceStopIndex = -1; // -1 indicates start point
      } else {
        // Check if source matches any stop in the route
        if (schedule.routeId.stops && Array.isArray(schedule.routeId.stops)) {
          sourceStopIndex = schedule.routeId.stops.findIndex(
            (stop) => stop.name.toLowerCase() === source.toLowerCase()
          );
          if (sourceStopIndex >= 0) {
            isSourceValid = true;
          }
        }
      }

      if (!isSourceValid) {
        const allStops = [
          schedule.routeId.startPoint,
          ...(schedule.routeId.stops || []).map((stop) => stop.name),
        ].filter(
          (stop, index, self) =>
            stop && stop.trim() && self.indexOf(stop) === index
        ); // Remove duplicates and empty values

        const availableStopsList =
          allStops.length > 0 ? allStops.join(", ") : "No stops available";

        return errorResponse(
          res,
          400,
          `The source location "${source}" is not available on this route. Please select from: ${availableStopsList}`
        );
      }

      // Validate destination is in the route
      // Destination must be a stop (not the start point, as that would mean going backwards)
      let destinationStopIndex = -1;
      let isDestinationValid = false;

      // Check if destination matches start point - this is invalid
      if (
        destination.toLowerCase() === schedule.routeId.startPoint.toLowerCase()
      ) {
        const availableStops = (schedule.routeId.stops || [])
          .map((stop) => stop.name)
          .filter(
            (stop, index, self) =>
              stop && stop.trim() && self.indexOf(stop) === index
          );

        const stopsList =
          availableStops.length > 0
            ? availableStops.join(", ")
            : "No stops available";

        return errorResponse(
          res,
          400,
          `The destination cannot be the starting point "${schedule.routeId.startPoint}". Please select a destination from: ${stopsList}`
        );
      }

      // Check if destination matches any stop in the route
      if (schedule.routeId.stops && Array.isArray(schedule.routeId.stops)) {
        destinationStopIndex = schedule.routeId.stops.findIndex(
          (stop) => stop.name.toLowerCase() === destination.toLowerCase()
        );
        if (destinationStopIndex >= 0) {
          isDestinationValid = true;
        }
      }

      if (!isDestinationValid) {
        const availableStops = (schedule.routeId.stops || [])
          .map((stop) => stop.name)
          .filter(
            (stop, index, self) =>
              stop && stop.trim() && self.indexOf(stop) === index
          ); // Remove duplicates and empty values

        const stopsList =
          availableStops.length > 0
            ? availableStops.join(", ")
            : "No stops available";

        return errorResponse(
          res,
          400,
          `The destination "${destination}" is not available on this route. Please select from: ${stopsList}`
        );
      }

      // Validate that destination comes after source in the route
      if (sourceStopIndex === -1) {
        // Source is start point, destination is a stop - always valid (destination comes after start)
        // No additional validation needed
      } else if (sourceStopIndex >= 0) {
        // Both source and destination are stops
        if (destinationStopIndex <= sourceStopIndex) {
          const routeOrder = [
            schedule.routeId.startPoint,
            ...(schedule.routeId.stops || []).map((stop) => stop.name),
          ].filter(
            (stop, index, self) =>
              stop && stop.trim() && self.indexOf(stop) === index
          );

          return errorResponse(
            res,
            400,
            `The destination must come after the source location in the route. Route order: ${routeOrder.join(
              " → "
            )}`
          );
        }
      }

      // Additional check: source and destination cannot be the same
      if (source.toLowerCase() === destination.toLowerCase()) {
        return errorResponse(
          res,
          400,
          "Source and destination cannot be the same"
        );
      }

      // Calculate departure time at source
      // Ensure schedule.time is a valid string in HH:MM format
      if (
        !schedule.time ||
        typeof schedule.time !== "string" ||
        !/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(schedule.time)
      ) {
        return errorResponse(res, 400, "Invalid schedule time format");
      }

      let departureTimeAtSource = schedule.time.trim();
      if (sourceStopIndex >= 0) {
        // Source is a stop, calculate when bus arrives at this stop
        const sourceArrival = calculateArrivalTimeAtStop(
          schedule.time.trim(),
          schedule.routeId,
          sourceStopIndex
        );
        if (sourceArrival) {
          departureTimeAtSource = `${sourceArrival.hours
            .toString()
            .padStart(2, "0")}:${sourceArrival.minutes
            .toString()
            .padStart(2, "0")}`;
        }
      }
      // If sourceStopIndex === -1, source is start point, so departure time is schedule.time (already set)

      // Calculate arrival time at destination
      // After validation, destinationStopIndex is always >= 0 (a valid stop)
      let arrivalTimeAtDestination = null;

      // Calculate duration from source to destination
      const durationFromSourceToDest = calculateDurationBetweenStops(
        schedule.routeId,
        sourceStopIndex,
        destinationStopIndex
      );

      if (
        durationFromSourceToDest !== null &&
        durationFromSourceToDest !== undefined
      ) {
        // Parse departure time at source
        const [depHours, depMins] = departureTimeAtSource
          .split(":")
          .map(Number);
        if (isNaN(depHours) || isNaN(depMins)) {
          return errorResponse(res, 400, "Invalid departure time format");
        }

        let totalTimeInMinutes =
          depHours * 60 + depMins + durationFromSourceToDest;

        // Handle next day (if time exceeds 24 hours)
        const arrivalHours = Math.floor(totalTimeInMinutes / 60) % 24;
        const arrivalMins = totalTimeInMinutes % 60;
        arrivalTimeAtDestination = `${arrivalHours
          .toString()
          .padStart(2, "0")}:${arrivalMins.toString().padStart(2, "0")}`;
      } else {
        // Fallback: calculate from start point to destination
        const destArrival = calculateArrivalTimeAtStop(
          schedule.time.trim(),
          schedule.routeId,
          destinationStopIndex
        );
        if (destArrival) {
          arrivalTimeAtDestination = `${destArrival.hours
            .toString()
            .padStart(2, "0")}:${destArrival.minutes
            .toString()
            .padStart(2, "0")}`;
        } else {
          return errorResponse(
            res,
            400,
            "Failed to calculate arrival time at destination"
          );
        }
      }

      // Format times for readability (12-hour format)
      const departureTimeReadable = formatTime12Hour(departureTimeAtSource);
      const arrivalTimeReadable = formatTime12Hour(arrivalTimeAtDestination);
      const arrivalIsNextDay = isNextDay(
        departureTimeAtSource,
        arrivalTimeAtDestination
      );

      // Calculate fare internally based on source, destination, schedule pricing, and number of seats
      let calculatedFare;
      try {
        calculatedFare = calculateFare(
          schedule.routeId,
          schedule,
          source,
          destination,
          bookingData.seats.length
        );
      } catch (fareError) {
        return errorResponse(
          res,
          400,
          `Fare calculation error: ${fareError.message}`
        );
      }

      // Get business info for GST number to save with booking
      const businessInfo = await BusinessInfo.getBusinessInfo();

      // Create booking with passenger details
      const booking = new Booking({
        userId: userId,
        userName: bookingData.passengerName,
        userMobile: bookingData.contactNumber,
        userEmail: bookingData.email,
        passengerName: bookingData.passengerName,
        age: bookingData.age,
        gender: bookingData.gender,
        city: bookingData.city,
        state: bookingData.state,
        altContactNumber: bookingData.altContactNumber || null,
        scheduleId: bookingData.scheduleId,
        busId: schedule.busId._id,
        busName: schedule.busName,
        busNumber: schedule.busId.busNumber,
        routeId: schedule.routeId._id,
        routeName: schedule.routeName,
        source: source,
        destination: destination,
        seats: bookingData.seats,
        fare: calculatedFare,
        travelDate: bookingData.travelDate,
        departureTime: departureTimeAtSource,
        arrivalTime: arrivalTimeAtDestination,
        driverName:
          schedule.assignedTeam?.find((member) => member.role === "Driver")
            ?.name || null,
        conductorName:
          schedule.assignedTeam?.find((member) => member.role === "Conductor")
            ?.name || null,
        status: "Active",
        gstNumber: businessInfo?.gstNumber || null,
      });

      await booking.save();

      // Check if this is the user's first booking and update userType from 'Normal' to 'Buyer'
      const user = await User.findById(userId);
      if (user && user.userType === "Normal") {
        // Check if this is the first booking for this user
        const bookingCount = await Booking.countDocuments({ userId: userId });
        if (bookingCount === 1) {
          // This is the first booking, update userType to 'Buyer'
          user.userType = "Buyer";
          await user.save();
        }
      }

      // Update schedule booking count
      await OnboardSchedule.findByIdAndUpdate(bookingData.scheduleId, {
        $inc: { totalBookings: 1, totalRevenue: calculatedFare },
      });

      // Convert booking to object and replace time fields with readable format
      const bookingResponse = booking.toObject();
      bookingResponse.departureTime =
        departureTimeReadable || departureTimeAtSource;
      bookingResponse.arrivalTime =
        arrivalTimeReadable || arrivalTimeAtDestination;

      // Add next day indicator if applicable
      if (arrivalIsNextDay && arrivalTimeReadable) {
        bookingResponse.arrivalTime = `${arrivalTimeReadable} (Next Day)`;
      }

      successResponse(
        res,
        201,
        "Ticket booking created successfully",
        bookingResponse
      );
    } catch (error) {
      const logger = require("../utils/logger");
      logger.error("Create ticket booking error:", error);
      errorResponse(res, 500, "Failed to create ticket booking", error.message);
    }
  }
);

/*
 * @swagger
 * /api/bookings/{id}:
 *   put:
 *     summary: Update booking
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Booking ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               seats:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["A1", "A2", "A3"]
 *               fare:
 *                 type: number
 *                 example: 2000
 *               travelDate:
 *                 type: string
 *                 format: date
 *                 example: "2024-03-20"
 *               specialRequests:
 *                 type: string
 *                 example: "Updated special requests"
 *     responses:
 *       200:
 *         description: Booking updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Booking'
 *       404:
 *         description: Booking not found
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
      const bookingId = req.params.id;
      const updateData = req.body;

      // Remove fields that shouldn't be updated directly
      delete updateData._id;
      delete updateData.createdAt;
      delete updateData.updatedAt;

      const booking = await Booking.findByIdAndUpdate(bookingId, updateData, {
        new: true,
        runValidators: true,
      })
        .populate("userId", "name email mobile")
        .populate("scheduleId")
        .populate("busId", "busName busNumber")
        .populate("routeId", "name startPoint");

      if (!booking) {
        return errorResponse(res, 404, "Booking not found");
      }

      successResponse(res, 200, "Booking updated successfully", booking);
    } catch (error) {
      console.error("Update booking error:", error);
      errorResponse(res, 500, "Failed to update booking", error.message);
    }
  }
);

/**
 * @swagger
 * /api/bookings/ticket/{id}/cancel:
 *   put:
 *     summary: Cancel bus ticket
 *     description: Cancel a bus ticket by booking ID. Requires a cancellation reason from the frontend and updates the ticket status to 'Cancelled'. Users can only cancel their own tickets, and cancellation must be done at least 30 minutes before departure time. Admins can cancel any ticket at any time.
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Booking ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - reason
 *             properties:
 *               reason:
 *                 type: string
 *                 description: Reason for cancellation
 *                 example: "Change in travel plans"
 *                 minLength: 5
 *                 maxLength: 500
 *     responses:
 *       200:
 *         description: Ticket cancelled successfully
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
 *                         bookingId:
 *                           type: string
 *                         bookingReference:
 *                           type: string
 *                         status:
 *                           type: string
 *                           example: "Cancelled"
 *                         cancellationReason:
 *                           type: string
 *                         cancellationDate:
 *                           type: string
 *                           format: date-time
 *       400:
 *         description: Bad request - Cannot cancel completed booking, invalid reason, or cancellation time limit exceeded (must be at least 30 minutes before departure)
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
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.put(
  "/ticket/:id/cancel",
  authenticateToken,
  validateObjectId,
  async (req, res) => {
    try {
      const bookingId = req.params.id;
      const { reason } = req.body;
      const userId = req.user._id;
      const isAdmin = req.user.userType === "Admin";

      // Validate reason is provided
      if (!reason || typeof reason !== "string" || reason.trim().length < 5) {
        return errorResponse(
          res,
          400,
          "Cancellation reason is required and must be at least 5 characters long"
        );
      }

      if (reason.trim().length > 500) {
        return errorResponse(
          res,
          400,
          "Cancellation reason cannot exceed 500 characters"
        );
      }

      // Find the booking
      const booking = await Booking.findById(bookingId).populate("scheduleId");

      if (!booking) {
        return errorResponse(res, 404, "Booking not found");
      }

      // Check if user is admin or the owner of the booking
      const isOwner =
        booking.userId && booking.userId.toString() === userId.toString();
      if (!isAdmin && !isOwner) {
        return errorResponse(
          res,
          403,
          "Access denied - You can only cancel your own tickets"
        );
      }

      // Check if booking is already cancelled
      if (booking.status === "Cancelled") {
        return errorResponse(res, 400, "Ticket is already cancelled");
      }

      // Check if booking can be cancelled
      if (booking.status === "Completed") {
        return errorResponse(res, 400, "Cannot cancel completed booking");
      }

      // Check cancellation time limit (30 minutes before departure)
      const cancellationTimeLimitMinutes = 30; // Can be made configurable
      const travelDate = new Date(booking.travelDate);
      const departureTime = booking.departureTime || booking.scheduleId?.time;

      if (departureTime) {
        const [hours, minutes] = departureTime.split(":").map(Number);
        travelDate.setHours(hours, minutes, 0, 0);

        const now = new Date();
        const timeUntilDeparture = travelDate - now;
        const minutesUntilDeparture = timeUntilDeparture / (1000 * 60);

        // Allow admins to cancel anytime, but regular users have time restrictions
        if (!isAdmin && minutesUntilDeparture < cancellationTimeLimitMinutes) {
          const remainingMinutes = Math.ceil(minutesUntilDeparture);
          if (remainingMinutes <= 0) {
            return errorResponse(
              res,
              400,
              "Cannot cancel ticket after departure time has passed"
            );
          }
          return errorResponse(
            res,
            400,
            `Tickets can only be cancelled at least ${cancellationTimeLimitMinutes} minutes before departure. Current time until departure: ${remainingMinutes} minute${
              remainingMinutes !== 1 ? "s" : ""
            }`
          );
        }

        // Cannot cancel if departure time has passed
        if (minutesUntilDeparture < 0) {
          return errorResponse(
            res,
            400,
            "Cannot cancel ticket after departure time has passed"
          );
        }
      }

      // Store previous status before updating
      const previousStatus = booking.status;

      // Update booking status to cancelled
      booking.status = "Cancelled";
      booking.cancellationDate = new Date();
      booking.cancellationReason = reason.trim();

      await booking.save();

      // Prepare response with booking details
      const responseData = {
        bookingId: booking._id.toString(),
        bookingReference: `BB${booking._id.toString().slice(-8).toUpperCase()}`,
        status: booking.status,
        previousStatus: previousStatus,
        cancellationReason: booking.cancellationReason,
        cancellationDate: booking.cancellationDate,
      };

      successResponse(res, 200, "Ticket cancelled successfully", responseData);
    } catch (error) {
      const logger = require("../utils/logger");
      logger.error("Cancel ticket error:", error);
      errorResponse(res, 500, "Failed to cancel ticket", error.message);
    }
  }
);

/*
 * @swagger
 * /api/bookings/{id}:
 *   delete:
 *     summary: Cancel booking
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Booking ID
 *     responses:
 *       200:
 *         description: Booking cancelled successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       404:
 *         description: Booking not found
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
      const booking = await Booking.findById(req.params.id);

      if (!booking) {
        return errorResponse(res, 404, "Booking not found");
      }

      // Check if booking can be cancelled
      if (booking.status === "Completed") {
        return errorResponse(res, 400, "Cannot cancel completed booking");
      }

      // Update booking status
      booking.status = "Cancelled";
      booking.cancellationDate = new Date();
      booking.cancellationReason = req.body.reason || "Cancelled by user";

      await booking.save();

      successResponse(res, 200, "Booking cancelled successfully");
    } catch (error) {
      console.error("Cancel booking error:", error);
      errorResponse(res, 500, "Failed to cancel booking", error.message);
    }
  }
);

/*
 * @swagger
 * /api/bookings/{id}/status:
 *   put:
 *     summary: Update booking status (Admin only)
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Booking ID
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
 *                 enum: [Confirmed, Pending, Cancelled, Completed, No-Show]
 *                 example: "Confirmed"
 *               reason:
 *                 type: string
 *                 example: "Customer requested cancellation"
 *     responses:
 *       200:
 *         description: Booking status updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Booking'
 *       404:
 *         description: Booking not found
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
      const { status } = req.body;

      if (
        !["Confirmed", "Pending", "Cancelled", "Completed", "No-Show"].includes(
          status
        )
      ) {
        return errorResponse(res, 400, "Invalid status");
      }

      const booking = await Booking.findByIdAndUpdate(
        req.params.id,
        { status },
        { new: true }
      )
        .populate("userId", "name email mobile")
        .populate("scheduleId")
        .populate("busId", "busName busNumber")
        .populate("routeId", "name startPoint");

      if (!booking) {
        return errorResponse(res, 404, "Booking not found");
      }

      successResponse(res, 200, "Booking status updated successfully", booking);
    } catch (error) {
      console.error("Update booking status error:", error);
      errorResponse(res, 500, "Failed to update booking status", error.message);
    }
  }
);

/*
 * @swagger
 * /api/bookings/stats/overview:
 *   get:
 *     summary: Get booking statistics (Admin only)
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Booking statistics retrieved successfully
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
 *                         noShowBookings:
 *                           type: integer
 *                         revenueStats:
 *                           type: object
 *                           properties:
 *                             totalRevenue:
 *                               type: number
 *                             avgBookingValue:
 *                               type: number
 *                             monthlyRevenue:
 *                               type: number
 *                             dailyRevenue:
 *                               type: number
 *                         paymentStats:
 *                           type: object
 *                           properties:
 *                             paidBookings:
 *                               type: integer
 *                             codBookings:
 *                               type: integer
 *                             pendingPayments:
 *                               type: integer
 *                             failedPayments:
 *                               type: integer
 *                             refundedPayments:
 *                               type: integer
 *                         bookingTrends:
 *                           type: array
 *                           items:
 *                             type: object
 *                         topRoutes:
 *                           type: array
 *                           items:
 *                             type: object
 *                         recentBookings:
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
/**
 * @swagger
 * /api/bookings/ticket/{id}/download-pdf:
 *   get:
 *     summary: Download ticket as PDF (Admin only)
 *     description: Generate and download a PDF ticket for a booking. Admin access required.
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Booking ID
 *     responses:
 *       200:
 *         description: PDF file download
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *       404:
 *         description: Booking not found
 *       403:
 *         description: Admin access required
 */
router.get(
  "/ticket/:id/download-pdf",
  authenticateToken,
  requireAdmin,
  validateObjectId,
  async (req, res) => {
    try {
      const bookingId = req.params.id;
      const PDFDocument = require("pdfkit");

      // Get booking with all related data
      const booking = await Booking.findById(bookingId)
        .populate("userId", "name email mobile")
        .populate({
          path: "scheduleId",
          populate: {
            path: "assignedTeam.id",
            model: "Driver",
            select: "fullName mobile"
          }
        })
        .populate("busId", "busName busNumber seatCapacity acType")
        .populate("routeId", "name startPoint stops totalDistance estimatedTravelTime");

      if (!booking) {
        return errorResponse(res, 404, "Booking not found");
      }

      // Helper function to convert 24-hour format to 12-hour format with AM/PM
      const formatTime12Hour = (time24) => {
        if (!time24 || typeof time24 !== "string") return time24;
        const [hours, minutes] = time24.split(":").map(Number);
        if (isNaN(hours) || isNaN(minutes)) return time24;

        let hour12 = hours % 12;
        if (hour12 === 0) hour12 = 12;
        const ampm = hours < 12 ? "AM" : "PM";
        return `${hour12}:${minutes.toString().padStart(2, "0")} ${ampm}`;
      };

      // Helper function to check if arrival is next day
      const isNextDay = (departureTime, arrivalTime) => {
        if (!departureTime || !arrivalTime) return false;
        const [depHours, depMins] = departureTime.split(":").map(Number);
        const [arrHours, arrMins] = arrivalTime.split(":").map(Number);
        if (isNaN(depHours) || isNaN(depMins) || isNaN(arrHours) || isNaN(arrMins))
          return false;
        const depTotalMins = depHours * 60 + depMins;
        const arrTotalMins = arrHours * 60 + arrMins;
        return arrTotalMins < depTotalMins;
      };

      // Format travel date
      const travelDate = new Date(booking.travelDate);
      const formattedDate = travelDate.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });

      // Format times
      const departureTimeReadable = formatTime12Hour(booking.departureTime);
      const arrivalTimeReadable = formatTime12Hour(booking.arrivalTime);
      const arrivalIsNextDay = isNextDay(booking.departureTime, booking.arrivalTime);

      // Extract staff information
      const schedule = booking.scheduleId;
      let driverName = booking.driverName || "Not assigned";
      let driverNumber = null;
      let conductorName = booking.conductorName || "Not assigned";
      let conductorNumber = null;

      if (schedule && schedule.assignedTeam && Array.isArray(schedule.assignedTeam)) {
        const driver = schedule.assignedTeam.find((member) => member.role === "Driver");
        const conductor = schedule.assignedTeam.find((member) => member.role === "Conductor");

        if (driver) {
          driverName = driver.name || driver.id?.fullName || driverName;
          driverNumber = driver.id?.mobile || null;
        }

        if (conductor) {
          conductorName = conductor.name || conductor.id?.fullName || conductorName;
          conductorNumber = conductor.id?.mobile || null;
        }
      }

      // Get business info for header
      const BusinessInfo = require("../models/BusinessInfo");
      const businessInfo = await BusinessInfo.getBusinessInfo();

      // Create PDF document
      const doc = new PDFDocument({ margin: 50, size: "A4" });

      // Set response headers
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="ticket_${booking._id.toString().slice(-8).toUpperCase()}.pdf"`
      );

      // Pipe PDF to response
      doc.pipe(res);

      // Header Section
      doc
        .fontSize(20)
        .fillColor("#1a202c")
        .text(businessInfo?.businessName || "Bus Booking System", { align: "center" })
        .moveDown(0.5);

      doc
        .fontSize(14)
        .fillColor("#4a5568")
        .text("E-TICKET", { align: "center", underline: true })
        .moveDown(1);

      // Booking Reference
      doc
        .fontSize(16)
        .fillColor("#667eea")
        .text(`Booking Reference: BB${booking._id.toString().slice(-8).toUpperCase()}`, {
          align: "center",
        })
        .moveDown(1);

      // Passenger Details Section
      doc
        .fontSize(14)
        .fillColor("#1a202c")
        .text("PASSENGER DETAILS", { underline: true })
        .moveDown(0.5);

      doc.fontSize(11).fillColor("#4a5568");
      doc.text(`Name: ${booking.passengerName || booking.userName || "N/A"}`);
      doc.text(`Age: ${booking.age || "N/A"}`);
      doc.text(`Gender: ${booking.gender || "N/A"}`);
      doc.text(`Contact: ${booking.userMobile || "N/A"}`);
      if (booking.altContactNumber) {
        doc.text(`Alternate Contact: ${booking.altContactNumber}`);
      }
      doc.text(`Email: ${booking.userEmail || "N/A"}`);
      if (booking.city) doc.text(`City: ${booking.city}`);
      if (booking.state) doc.text(`State: ${booking.state}`);
      doc.moveDown(1);

      // Travel Details Section
      doc.fontSize(14).fillColor("#1a202c").text("TRAVEL DETAILS", { underline: true }).moveDown(0.5);

      doc.fontSize(11).fillColor("#4a5568");
      doc.text(`Route: ${booking.routeName || "N/A"}`);
      doc.text(`Source: ${booking.source || booking.routeId?.startPoint || "N/A"}`);
      doc.text(`Destination: ${booking.destination || "N/A"}`);
      doc.text(`Travel Date: ${formattedDate}`);
      doc.text(`Departure Time: ${departureTimeReadable || booking.departureTime}`);
      doc.text(
        `Arrival Time: ${
          arrivalIsNextDay && arrivalTimeReadable
            ? `${arrivalTimeReadable} (Next Day)`
            : arrivalTimeReadable || booking.arrivalTime
        }`
      );
      doc.moveDown(1);

      // Bus Details Section
      doc.fontSize(14).fillColor("#1a202c").text("BUS DETAILS", { underline: true }).moveDown(0.5);

      doc.fontSize(11).fillColor("#4a5568");
      doc.text(`Bus Name: ${booking.busName || "N/A"}`);
      doc.text(`Bus Number: ${booking.busNumber || "N/A"}`);
      doc.text(`AC Type: ${booking.busId?.acType || "N/A"}`);
      doc.text(`Seat Capacity: ${booking.busId?.seatCapacity || "N/A"}`);
      doc.moveDown(1);

      // Booking Details Section
      doc.fontSize(14).fillColor("#1a202c").text("BOOKING DETAILS", { underline: true }).moveDown(0.5);

      doc.fontSize(11).fillColor("#4a5568");
      doc.text(`Seats: ${booking.seats.join(", ")}`);
      doc.text(`Number of Seats: ${booking.seats.length}`);
      doc.text(`Fare: ₹${booking.fare.toFixed(2)}`);
      doc.text(`Fare per Seat: ₹${(booking.fare / booking.seats.length).toFixed(2)}`);
      doc.text(`Status: ${booking.status}`);
      doc.text(`Booking Date: ${new Date(booking.createdAt).toLocaleString()}`);
      if (booking.specialRequests) {
        doc.text(`Special Requests: ${booking.specialRequests}`);
      }
      doc.moveDown(1);

      // Crew Details Section
      doc.fontSize(14).fillColor("#1a202c").text("CREW DETAILS", { underline: true }).moveDown(0.5);

      doc.fontSize(11).fillColor("#4a5568");
      doc.text(`Driver Name: ${driverName}`);
      if (driverNumber) doc.text(`Driver Contact: ${driverNumber}`);
      doc.text(`Conductor Name: ${conductorName}`);
      if (conductorNumber) doc.text(`Conductor Contact: ${conductorNumber}`);
      doc.moveDown(1);

      // GST Information
      if (booking.gstNumber) {
        doc.fontSize(11).fillColor("#4a5568").text(`GST Number: ${booking.gstNumber}`).moveDown(1);
      }

      // Footer
      doc
        .fontSize(10)
        .fillColor("#718096")
        .text("Thank you for choosing our service!", { align: "center" })
        .moveDown(0.5);

      if (businessInfo?.supportEmail) {
        doc.text(`For support, contact: ${businessInfo.supportEmail}`, { align: "center" });
      }

      if (businessInfo?.contactNumber) {
        doc.text(`Contact: ${businessInfo.contactNumber}`, { align: "center" });
      }

      doc.text(`Generated on: ${new Date().toLocaleString()}`, { align: "center" });

      // Finalize PDF
      doc.end();
    } catch (error) {
      logger.error("Download PDF ticket error:", error);
      if (!res.headersSent) {
        errorResponse(res, 500, "Failed to generate PDF ticket", error.message);
      }
    }
  }
);

router.get(
  "/stats/overview",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const totalBookings = await Booking.countDocuments();
      const confirmedBookings = await Booking.countDocuments({
        status: "Confirmed",
      });
      const pendingBookings = await Booking.countDocuments({
        status: "Pending",
      });
      const cancelledBookings = await Booking.countDocuments({
        status: "Cancelled",
      });

      const totalRevenue = await Booking.aggregate([
        { $group: { _id: null, total: { $sum: "$fare" } } },
      ]);

      const statusStats = await Booking.aggregate([
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
          },
        },
      ]);

      const monthlyBookings = await Booking.aggregate([
        {
          $group: {
            _id: {
              year: { $year: "$createdAt" },
              month: { $month: "$createdAt" },
            },
            count: { $sum: 1 },
            revenue: { $sum: "$fare" },
          },
        },
        { $sort: { "_id.year": -1, "_id.month": -1 } },
        { $limit: 12 },
      ]);

      successResponse(res, 200, "Booking statistics retrieved successfully", {
        totalBookings,
        confirmedBookings,
        pendingBookings,
        cancelledBookings,
        totalRevenue: totalRevenue[0]?.total || 0,
        statusStats,
        monthlyBookings,
      });
    } catch (error) {
      console.error("Get booking stats error:", error);
      errorResponse(
        res,
        500,
        "Failed to retrieve booking statistics",
        error.message
      );
    }
  }
);

module.exports = router;
