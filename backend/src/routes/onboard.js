const express = require("express");
const OnboardSchedule = require("../models/OnboardSchedule");
const Bus = require("../models/Bus");
const Route = require("../models/Route");
const Driver = require("../models/Driver");
const Booking = require("../models/Booking");
const {
  successResponse,
  errorResponse,
  paginatedResponse,
} = require("../utils/response");
const { authenticateToken, requireAdmin } = require("../middleware/auth");
const {
  validateObjectId,
  validatePagination,
} = require("../middleware/validation");

const router = express.Router();

// Helper function to get booked seats for a schedule and travel date
async function getBookedSeats(scheduleId, travelDate) {
  try {
    // Normalize travel date to start of day
    const date = new Date(travelDate);
    date.setHours(0, 0, 0, 0);
    const nextDay = new Date(date);
    nextDay.setDate(nextDay.getDate() + 1);

    // Find all active bookings for this schedule and date
    const bookings = await Booking.find({
      scheduleId: scheduleId,
      travelDate: {
        $gte: date,
        $lt: nextDay,
      },
      status: { $in: ["Active", "Confirmed", "Pending"] },
    }).select("seats");

    // Extract all booked seat numbers
    const bookedSeats = bookings.flatMap((booking) => booking.seats || []);
    return bookedSeats;
  } catch (error) {
    console.error("Error getting booked seats:", error);
    return []; // Return empty array on error
  }
}

// Seat layout helper utilities
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
      // This ensures seats are disabled by default and only enabled when assigned a number
      const enabled = customLabel.length > 0;

      // Use custom label if provided, otherwise empty string (matches admin preview)
      // This allows the UI to show "+" icon for seats without custom labels
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
  // They will only be enabled when a seat number is assigned (has seatLabel)
  for (let rowIndex = 0; rowIndex < rows; rowIndex++) {
    const rowData = [];
    for (let colIndex = 0; colIndex < columns; colIndex++) {
      // All seats disabled by default - no seatLabel means not enabled
      const enabled = false;
      const mapSeatLabel = ""; // No seat number assigned yet

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
    totalSeats: 0, // No seats enabled by default - all need seat numbers assigned
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

  // Return stored layout if it exists (even if totalSeats is 0)
  // Only fall back to default if no stored layout exists
  if (normalizedFromStored) {
    return normalizedFromStored;
  }

  return buildDefaultSeatLayout(bus);
}

/*
 * @swagger
 * /api/onboard:
 *   get:
 *     summary: Get all onboard schedules
 *     tags: [Onboard Schedules]
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
 *         description: Number of schedules per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term for bus name or route name
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [all, Scheduled, In Progress, Completed, Cancelled, Delayed]
 *           default: all
 *         description: Filter by schedule status
 *       - in: query
 *         name: dateFrom
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter schedules from this date
 *       - in: query
 *         name: dateTo
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter schedules to this date
 *     responses:
 *       200:
 *         description: Onboard schedules retrieved successfully
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
 *                         $ref: '#/components/schemas/OnboardSchedule'
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
    const search = req.query.search || "";
    const status = req.query.status || "all";
    const dateFrom = req.query.dateFrom;
    const dateTo = req.query.dateTo;

    // Build search query
    const searchQuery = {};

    if (search) {
      searchQuery.$or = [
        { busName: { $regex: search, $options: "i" } },
        { routeName: { $regex: search, $options: "i" } },
      ];
    }

    if (status !== "all") {
      searchQuery.status = status;
    }

    if (dateFrom || dateTo) {
      searchQuery.date = {};
      if (dateFrom) searchQuery.date.$gte = new Date(dateFrom);
      if (dateTo) searchQuery.date.$lte = new Date(dateTo);
    }

    // Get schedules with pagination
    const schedules = await OnboardSchedule.find(searchQuery)
      .populate(
        "busId",
        "busName busNumber seatCapacity busImages.front acType"
      )
      .populate("routeId", "name startPoint totalDistance estimatedTravelTime")
      .sort({ date: 1, time: 1 })
      .skip(skip)
      .limit(limit);

    const total = await OnboardSchedule.countDocuments(searchQuery);

    paginatedResponse(
      res,
      200,
      "Onboard schedules retrieved successfully",
      schedules,
      {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      }
    );
  } catch (error) {
    console.error("Get onboard schedules error:", error);
    errorResponse(
      res,
      500,
      "Failed to retrieve onboard schedules",
      error.message
    );
  }
});

/**
 * @swagger
 * /api/onboard/upcoming:
 *   get:
 *     summary: Get list of upcoming onboard buses
 *     description: Get a list of onboarded buses that are scheduled for today or future dates, excluding past dates and buses that have already started (In Progress or Completed status). For today's buses, only includes those whose departure time hasn't passed yet.
 *     tags: [Onboard Schedules]
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
 *         description: Number of schedules per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term for bus name or route name
 *     responses:
 *       200:
 *         description: Upcoming onboard buses retrieved successfully
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
 *                           _id:
 *                             type: string
 *                             description: Schedule ID
 *                           date:
 *                             type: string
 *                             format: date-time
 *                             description: Travel date
 *                           time:
 *                             type: string
 *                             description: Departure time (HH:MM format)
 *                           pricing:
 *                             type: object
 *                             properties:
 *                               baseAmount:
 *                                 type: number
 *                               perKmRate:
 *                                 type: number
 *                               totalFare:
 *                                 type: number
 *                           bus:
 *                             type: object
 *                             properties:
 *                               _id:
 *                                 type: string
 *                               busName:
 *                                 type: string
 *                               busNumber:
 *                                 type: string
 *                               seatCapacity:
 *                                 type: number
 *                               seatArchitecture:
 *                                 type: string
 *                                 enum: ['2+2', '2+1', '1+1', '3+2']
 *                               acType:
 *                                 type: string
 *                                 enum: ['AC', 'Non-AC']
 *                               frontImage:
 *                                 type: string
 *                                 nullable: true
 *                           route:
 *                             type: object
 *                             properties:
 *                               _id:
 *                                 type: string
 *                               name:
 *                                 type: string
 *                               startPoint:
 *                                 type: string
 *                               finalDestination:
 *                                 type: string
 *                                 nullable: true
 *                                 description: The route's final destination stop
 *                               originalDepartureTime:
 *                                 type: string
 *                                 description: Original departure time from the route's start point (HH:MM format)
 *                               totalDistance:
 *                                 type: number
 *                               estimatedTravelTime:
 *                                 type: number
 *                               stops:
 *                                 type: array
 *                                 items:
 *                                   type: object
 *                                   properties:
 *                                     name:
 *                                       type: string
 *                                     distanceFromPrev:
 *                                       type: number
 *                                     durationFromPrev:
 *                                       type: number
 *                                     arrivalTime:
 *                                       type: string
 *                                       description: Calculated arrival time at this stop (HH:MM format)
 *                                     distanceFromStart:
 *                                       type: number
 *                                       description: Cumulative distance from start point to this stop
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
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get(
  "/upcoming",
  authenticateToken,
  validatePagination,
  async (req, res) => {
    try {
      const Rating = require("../models/Rating");

      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const skip = (page - 1) * limit;
      const search = req.query.search || "";

      console.log(
        "🚌 [UPCOMING BUSES] Starting upcoming buses listing with ratings..."
      );

      // Get current date and time
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const currentHours = now.getHours();
      const currentMinutes = now.getMinutes();

      // Build search query
      const searchQuery = {
        isActive: true,
        // Exclude past dates - only today and future dates
        date: { $gte: today },
        // Exclude buses that have already started or completed
        status: { $nin: ["In Progress", "Completed", "Cancelled"] },
      };

      // Add search filter if provided
      if (search) {
        searchQuery.$or = [
          { busName: { $regex: search, $options: "i" } },
          { routeName: { $regex: search, $options: "i" } },
        ];
      }

      // Get all schedules matching the date and status filters
      const allSchedules = await OnboardSchedule.find(searchQuery)
        .populate(
          "busId",
          "busName busNumber seatCapacity seatArchitecture busImages.front acType"
        )
        .populate(
          "routeId",
          "name startPoint totalDistance estimatedTravelTime stops"
        )
        .sort({ date: 1, time: 1 });

      // Filter out today's buses whose departure time has already passed
      const validSchedules = allSchedules.filter((schedule) => {
        const scheduleDate = new Date(schedule.date);
        const scheduleDateOnly = new Date(
          scheduleDate.getFullYear(),
          scheduleDate.getMonth(),
          scheduleDate.getDate()
        );

        // If it's today's date, check if departure time has passed
        if (scheduleDateOnly.getTime() === today.getTime()) {
          if (!schedule.time) return false;

          // Parse the departure time
          const [hours, minutes] = schedule.time.split(":").map(Number);

          // Check if the departure time has passed
          if (hours < currentHours) {
            return false; // Past hour
          } else if (hours === currentHours && minutes <= currentMinutes) {
            return false; // Same hour but minutes have passed
          }
        }

        return true;
      });

      console.log(
        `📋 [UPCOMING BUSES] Found ${validSchedules.length} valid upcoming buses`
      );

      // Get all bus ratings
      const allBusRatings = await Rating.find({
        isActive: true,
      }).lean();

      console.log(`⭐ [UPCOMING BUSES] Found ${allBusRatings.length} ratings`);

      // Create bus rating map
      const busRatingMap = {};
      allBusRatings.forEach((rating) => {
        const busId = rating.busId.toString();
        if (!busRatingMap[busId]) {
          busRatingMap[busId] = [];
        }
        busRatingMap[busId].push(rating.rating);
      });

      console.log(
        `🗺️  [UPCOMING BUSES] Created bus rating map with ${
          Object.keys(busRatingMap).length
        } buses`
      );

      // Helper function to calculate arrival time at a stop
      const calculateArrivalTimeAtStop = (departureTime, route, stopIndex) => {
        if (!departureTime || !route) return null;

        const timeParts = departureTime.split(":");
        if (timeParts.length !== 2) return null;

        let hours = parseInt(timeParts[0], 10);
        let minutes = parseInt(timeParts[1], 10);

        if (isNaN(hours) || isNaN(minutes)) return null;

        // Calculate cumulative duration from start point to this stop
        let totalMinutes = 0;

        // Add duration from start point to first stop
        if (
          stopIndex >= 0 &&
          route.stops &&
          route.stops.length > 0 &&
          route.stops[0]
        ) {
          // Add all durations up to and including this stop index
          for (let i = 0; i <= stopIndex && i < route.stops.length; i++) {
            if (route.stops[i].durationFromPrev) {
              totalMinutes += route.stops[i].durationFromPrev;
            }
          }
        }

        // Add total minutes to departure time
        const totalMinutesFromStart = hours * 60 + minutes + totalMinutes;
        const arrivalHours = Math.floor(totalMinutesFromStart / 60) % 24;
        const arrivalMins = totalMinutesFromStart % 60;

        return { hours: arrivalHours, minutes: arrivalMins };
      };

      // Map to return only basic details with route information like search API
      const formattedSchedules = validSchedules.map((schedule) => {
        const bus = schedule.busId || {};
        const route = schedule.routeId || {};

        // Format stops with arrival time and distance from start
        let formattedStops = [];
        if (route.stops && route.stops.length > 0) {
          formattedStops = route.stops.map((stop, index) => {
            const stopObj = stop.toObject ? stop.toObject() : { ...stop };
            const arrivalAtStop = calculateArrivalTimeAtStop(
              schedule.time,
              route,
              index
            );
            if (arrivalAtStop) {
              stopObj.arrivalTime = `${arrivalAtStop.hours
                .toString()
                .padStart(2, "0")}:${arrivalAtStop.minutes
                .toString()
                .padStart(2, "0")}`;
            } else {
              // Fallback: use departure time for first stop
              if (index === 0) {
                stopObj.arrivalTime = schedule.time;
              }
            }

            // Calculate cumulative distance from start point
            let cumulativeDistance = 0;
            for (let i = 0; i <= index && i < route.stops.length; i++) {
              if (route.stops[i].distanceFromPrev) {
                cumulativeDistance += route.stops[i].distanceFromPrev;
              }
            }
            stopObj.distanceFromStart = cumulativeDistance;

            return stopObj;
          });
        }

        return {
          _id: schedule._id,
          date: schedule.date,
          time: schedule.time,
          pricing: schedule.pricing,
          bus: {
            _id: bus._id,
            busName: bus.busName || schedule.busName,
            busNumber: bus.busNumber,
            seatCapacity: bus.seatCapacity,
            seatArchitecture: bus.seatArchitecture,
            acType: bus.acType,
            frontImage: bus.busImages?.front || null,
            averageRating:
              busRatingMap[bus._id.toString()]?.length > 0
                ? busRatingMap[bus._id.toString()].reduce((a, b) => a + b, 0) /
                  busRatingMap[bus._id.toString()].length
                : 0,
            totalRatings: busRatingMap[bus._id.toString()]?.length || 0,
          },
          route: {
            _id: route._id,
            name: route.name || schedule.routeName,
            startPoint: route.startPoint,
            finalDestination:
              route.stops && route.stops.length > 0
                ? route.stops[route.stops.length - 1].name
                : null,
            originalDepartureTime: schedule.time,
            totalDistance: route.totalDistance,
            estimatedTravelTime: route.estimatedTravelTime,
            stops: formattedStops,
          },
        };
      });

      // Apply pagination
      const schedules = formattedSchedules.slice(skip, skip + limit);
      const total = formattedSchedules.length;

      console.log(
        `✅ [UPCOMING BUSES] Returning ${schedules.length} buses with ratings`
      );

      paginatedResponse(
        res,
        200,
        "Upcoming onboard buses retrieved successfully",
        schedules,
        {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        }
      );
    } catch (error) {
      console.error("Get upcoming onboard buses error:", error);
      errorResponse(
        res,
        500,
        "Failed to retrieve upcoming onboard buses",
        error.message
      );
    }
  }
);

/**
 * @swagger
 * /api/onboard/search:
 *   get:
 *     summary: Search buses by origin, destination, and date
 *     description: Search for onboarded buses available for a specific route on a specific date. Supports searching between any stops in the forward direction along a route. Only returns buses that are scheduled and available (not cancelled or completed).
 *     tags: [Onboard Schedules]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: origin
 *         required: true
 *         schema:
 *           type: string
 *         description: Origin point - can be the route's starting point or any stop along the route
 *         example: "Mumbai"
 *       - in: query
 *         name: destination
 *         required: true
 *         schema:
 *           type: string
 *         description: Destination point - must be a stop that comes AFTER the origin in the route (forward direction only)
 *         example: "Juhu"
 *       - in: query
 *         name: date
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: Travel date (YYYY-MM-DD)
 *         example: "2024-03-15"
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
 *         description: Number of results per page
 *     responses:
 *       200:
 *         description: Buses retrieved successfully
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
 *                         allOf:
 *                           - $ref: '#/components/schemas/OnboardSchedule'
 *                           - type: object
 *                             properties:
 *                               searchOrigin:
 *                                 type: string
 *                                 description: The matched origin stop for this search
 *                                 example: "Juhu"
 *                               searchDestination:
 *                                 type: string
 *                                 description: The matched destination stop for this search
 *                                 example: "Muradabad"
 *                               arrivalTime:
 *                                 type: string
 *                                 description: Time when bus arrives at the origin stop (for boarding). For start point, same as departure time. For middle stops, calculated arrival time. (HH:MM format)
 *                                 example: "10:30"
 *                               arrivalTimeAtDestination:
 *                                 type: string
 *                                 description: Time when bus arrives at the destination stop (HH:MM format)
 *                                 example: "14:12"
 *                               originalDepartureTime:
 *                                 type: string
 *                                 description: Original departure time from the route's start point (HH:MM format)
 *                                 example: "10:00"
 *                               finalDestination:
 *                                 type: string
 *                                 description: The route's final destination stop
 *                                 example: "Noida"
 *                               bookedSeats:
 *                                 type: array
 *                                 items:
 *                                   type: string
 *                                 description: Array of already booked seat numbers for this schedule on the specified date
 *                                 example: ["A1", "A2", "B3"]
 *                               availableSeats:
 *                                 type: integer
 *                                 description: Number of available seats remaining (total capacity minus booked seats)
 *                                 example: 37
 *                               busId:
 *                                 type: object
 *                                 properties:
 *                                   seatLayout:
 *                                     type: object
 *                                     description: Seat layout configuration for Android rendering
 *                                     properties:
 *                                       rows:
 *                                         type: integer
 *                                       columns:
 *                                         type: integer
 *                                       map:
 *                                         type: array
 *                                         description: 2D array representation of seat layout. Each cell is an object with properties `enabled` (boolean) and `seatLabel` (string)
 *                                       totalSeats:
 *                                         type: integer
 *                                         description: Total number of enabled seats
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
 *       400:
 *         description: Validation error - origin, destination, and date are required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: No buses found for the given criteria
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get(
  "/search",
  authenticateToken,
  validatePagination,
  async (req, res) => {
    try {
      const Rating = require("../models/Rating");

      const { origin, destination, date } = req.query;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const skip = (page - 1) * limit;

      console.log("🚌 [SEARCH BUSES] Starting bus search with ratings...");

      // Validate required parameters
      if (!origin || !destination || !date) {
        return errorResponse(
          res,
          400,
          "Origin, destination, and date are required parameters"
        );
      }

      // Parse the date - use Y,M,D constructor for LOCAL midnight consistency
      // (same pattern as the "upcoming buses" endpoint at line 488)
      const dateParts = date.split("-").map(Number);
      if (
        dateParts.length !== 3 ||
        dateParts.some((n) => isNaN(n)) ||
        dateParts[0] < 1000 ||
        dateParts[1] < 1 ||
        dateParts[1] > 12 ||
        dateParts[2] < 1 ||
        dateParts[2] > 31
      ) {
        return errorResponse(
          res,
          400,
          "Invalid date format. Please use YYYY-MM-DD format"
        );
      }
      const [y, m, d] = dateParts;
      const travelDate = new Date(y, m - 1, d); // LOCAL midnight
      if (isNaN(travelDate.getTime())) {
        return errorResponse(
          res,
          400,
          "Invalid date format. Please use YYYY-MM-DD format"
        );
      }

      // Get today's date at start of LOCAL day (consistent pattern)
      const nowRaw = new Date();
      const today = new Date(nowRaw.getFullYear(), nowRaw.getMonth(), nowRaw.getDate());

      // Reject past dates
      if (travelDate.getTime() < today.getTime()) {
        return errorResponse(
          res,
          400,
          "Cannot search for past dates. Please select today or a future date"
        );
      }

      const nextDay = new Date(y, m - 1, d + 1); // LOCAL midnight next day

      // Normalize origin / destination early (before any use)
      const originTrimmed = origin.trim();
      const destinationTrimmed = destination.trim();

      // Helper: build an array of matchers (exact first, then contains fallback)
      const buildMatchers = (term) => {
        const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        return [
          { regex: new RegExp(`^${escaped}$`, "i"), type: "exact" },
          { regex: new RegExp(escaped, "i"), type: "contains" },
        ];
      };

      // Helper: test if a name matches any matcher in a list.
      // Returns the matched name or null.
      const testMatchers = (name, matchers) => {
        if (!name) return null;
        for (const m of matchers) {
          if (m.regex.test(name)) return name;
        }
        return null;
      };

      // Helper: Levenshtein edit distance between two strings (case-insensitive).
      // Uses RELAXED character groups so common Indian transliteration typos
      // (k↔kh, g↔gh, c↔ch, j↔jh, t↔th, d↔dh, p↔ph, b↔bh, s↔sh, n↔ñ, m↔ṃ, a↔aa, i↔ee, u↔oo, e↔ai, o↔au)
      // cost only 1 instead of 2 (swap + insert). Also treats h-at-end-of-vicinity as optional.
      const levenshtein = (a, b) => {
        if (!a) return b ? b.length : 0;
        if (!b) return a.length;
        const s1 = a.toLowerCase();
        const s2 = b.toLowerCase();
        if (s1 === s2) return 0;

        // Map of common relaxed pairs (cost=0.5) — rounded to integers later by ceil or scaled.
        // Since we use integer distances, handle by making the cost=1 for these instead of 2.
        const isRelaxedPair = (x, y) => {
          if (x === y) return true;
          const key = x < y ? x + "|" + y : y + "|" + x;
          // Treat both: (a) simple single ↔ double letters; (b) "k/kh" style h-insertion pairs
          // as ZERO cost substitutions (so Lakhnow ↔ Lucknow becomes only a 1-char change overall)
          const pairs = [
            "k|kh", "g|gh", "c|ch", "j|jh",
            "t|th", "d|dh", "p|ph", "b|bh",
            "s|sh", "s|ss", "n|nn", "m|mm",
            "a|aa", "i|ee", "u|oo", "e|ai", "o|au",
            "l|ll", "r|rr", "v|w", "y|i",
            "a|e", "a|i", "a|u", "i|y", "n|m",
          ];
          return pairs.includes(key);
        };

        // Build token tables: split into relaxed-aware tokens (a single char, or a 2-char digraph)
        const tokenize = (s) => {
          const out = [];
          let i = 0;
          while (i < s.length) {
            // try 2-char digraph first for known h-pairs and double letters
            if (
              i + 1 < s.length &&
              isRelaxedPair(s[i], s[i] + s[i + 1])
            ) {
              out.push(s[i] + s[i + 1]);
              i += 2;
            } else {
              out.push(s[i]);
              i += 1;
            }
          }
          return out;
        };

        const t1 = tokenize(s1);
        const t2 = tokenize(s2);

        const costSub = (tx, ty) => {
          if (tx === ty) return 0;
          // relaxed pair substitutions = ZERO cost (treat these spellings as effectively equivalent)
          if (isRelaxedPair(tx, ty)) return 0;
          // other single-token length diffs = 1
          if (Math.abs(tx.length - ty.length) >= 1) return 1;
          return 2;
        };

        // Levenshtein DP over tokens with custom cost
        const n1 = t1.length;
        const n2 = t2.length;
        const dp = Array.from({ length: n1 + 1 }, () => new Array(n2 + 1).fill(0));
        for (let i = 0; i <= n1; i++) dp[i][0] = i; // insert = 1 per token
        for (let j = 0; j <= n2; j++) dp[0][j] = j;
        for (let i = 1; i <= n1; i++) {
          for (let j = 1; j <= n2; j++) {
            const c = costSub(t1[i - 1], t2[j - 1]);
            dp[i][j] = Math.min(
              dp[i - 1][j] + 1,        // deletion (token)
              dp[i][j - 1] + 1,        // insertion (token)
              dp[i - 1][j - 1] + c     // substitution with custom cost
            );
          }
        }
        return dp[n1][n2];
      };

      // Helper: find the best fuzzy match of `searchTerm` inside the candidates list.
      // Prefers: exact match (via matchers) → exact word match (tokenized) →
      //          contains match on any token → Levenshtein distance within threshold.
      // Returns { name, distance } or null.
      const findBestFuzzyMatch = (searchTerm, candidates, matchers) => {
        const term = (searchTerm || "").trim();
        if (!term) return null;
        const termLower = term.toLowerCase();
        const termTokens = termLower.split(/\s+/).filter(Boolean);

        // Minimum length threshold — fuzzy needs at least 4 chars to avoid false positives
        const FUZZY_MIN_LEN = 4;
        // DYNAMIC threshold (more forgiving for longer words)
        //    len <  4  → 0 (no fuzzy)
        //    len 4-6   → 1
        //    len 7-9   → 4  (Lakhnow↔Lucknow & Azamgarh↔Azamghar style)
        //    len ≥ 10  → 5
        const distThreshold =
          term.length >= 10 ? 5 : term.length >= 7 ? 4 : term.length >= FUZZY_MIN_LEN ? 1 : 0;

        let best = null;
        const consider = (candidateName, distance, via) => {
          if (distance < 0) distance = 0;
          if (!best || distance < best.distance) {
            best = { name: candidateName, distance, via };
          }
        };

        for (const raw of candidates) {
          if (!raw) continue;
          const name = typeof raw === "string" ? raw : raw.name;
          if (!name) continue;

          // 1) Exact / contains matchers first (distance = 0)
          if (testMatchers(name, matchers)) {
            consider(name, 0, "regex");
            continue; // best possible, skip rest for this candidate
          }

          const nameLower = name.toLowerCase();
          const nameTokens = nameLower.split(/\s+/).filter(Boolean);

          // 2) Exact token equality (bi-directional) — e.g. search="Lucknow", name="Lucknow Charbagh"
          let tokenEqual = false;
          for (const tt of termTokens) {
            for (const nt of nameTokens) {
              if (tt === nt) { tokenEqual = true; break; }
            }
            if (tokenEqual) break;
          }
          if (tokenEqual) {
            consider(name, 0, "token-eq");
            continue;
          }

          // 3) Token-wise contains — any search token is substring of any name token, or vice versa
          let tokenContains = false;
          for (const tt of termTokens) {
            if (tt.length < FUZZY_MIN_LEN) continue;
            for (const nt of nameTokens) {
              if (nt.length < FUZZY_MIN_LEN) continue;
              if (nt.includes(tt) || tt.includes(nt)) { tokenContains = true; break; }
            }
            if (tokenContains) break;
          }
          if (tokenContains) {
            consider(name, 1, "token-contains");
            continue;
          }

          // 4) Full-name contains (very short/long names that don't split well)
          if (
            termLower.length >= FUZZY_MIN_LEN &&
            nameLower.length >= FUZZY_MIN_LEN &&
            (nameLower.includes(termLower) || termLower.includes(nameLower))
          ) {
            consider(name, 1, "full-contains");
            continue;
          }

          // 5) Levenshtein on entire strings (if threshold allows)
          if (distThreshold > 0 && term.length >= FUZZY_MIN_LEN && name.length >= FUZZY_MIN_LEN) {
            const dFull = levenshtein(termLower, nameLower);
            if (dFull <= distThreshold) {
              consider(name, dFull, `lev-full-${dFull}`);
              continue;
            }

            // 6) Levenshtein on token pairs — best pairwise alignment
            let bestPair = Infinity;
            for (const tt of termTokens) {
              if (tt.length < FUZZY_MIN_LEN) continue;
              for (const nt of nameTokens) {
                if (nt.length < FUZZY_MIN_LEN) continue;
                const d = levenshtein(tt, nt);
                if (d <= distThreshold && d < bestPair) bestPair = d;
              }
            }
            if (isFinite(bestPair)) {
              consider(name, bestPair, `lev-pair-${bestPair}`);
            }
          }
        }

        // Return best only if within threshold
        if (!best) return null;
        const allowed = distThreshold > 0 ? distThreshold : 0;
        if (best.distance > allowed) return null;
        return best;
      };

      // Given a route (with startPoint + stops[]), find origin index & matched name using fuzzy pipeline.
      // Origin index: -1 = startPoint, 0..n = stops index, null = not found.
      const findOriginInRoute = (route, matchers) => {
        // Try regex matchers FIRST on startPoint + stops (traditional behavior)
        const startMatch = testMatchers(route.startPoint, matchers);
        if (startMatch) return { index: -1, matchedName: startMatch, via: "regex-start" };
        for (let i = 0; i < (route.stops || []).length; i++) {
          const sMatch = testMatchers(route.stops[i].name, matchers);
          if (sMatch) return { index: i, matchedName: sMatch, via: `regex-stop-${i}` };
        }
        // Fallback: fuzzy match across all stop names + startPoint
        const candidates = [
          { kind: "start", name: route.startPoint, idx: -1 },
          ...((route.stops || []).map((s, i) => ({ kind: "stop", name: s.name, idx: i }))),
        ];
        const fuzzy = findBestFuzzyMatch(originTrimmed, candidates, matchers);
        if (!fuzzy) return null;
        const found = candidates.find(c => c.name === fuzzy.name);
        if (!found) return null;
        return { index: found.idx, matchedName: fuzzy.name, via: `fuzzy-${fuzzy.via}` };
      };

      // Given a route and origin index, find destination at any higher index than origin.
      const findDestinationInRoute = (route, originIdx, destMatchers) => {
        const stops = route.stops || [];
        // Candidate destinations: every stop whose index is STRICTLY AFTER originIdx.
        // (If originIdx = -1, that means startPoint, so all stops[0..n] are valid destinations.)
        const destCandidates = [];
        for (let i = 0; i < stops.length; i++) {
          if (i > originIdx) destCandidates.push({ name: stops[i].name, idx: i });
        }
        if (destCandidates.length === 0) return null;

        // 1) Try regex matchers FIRST (exact / contains)
        for (const c of destCandidates) {
          if (testMatchers(c.name, destMatchers)) {
            return { index: c.idx, matchedName: c.name, via: "regex-dest" };
          }
        }
        // 2) Fuzzy fallback among the valid forward stops only
        const fuzzy = findBestFuzzyMatch(destinationTrimmed, destCandidates, destMatchers);
        if (!fuzzy) return null;
        const found = destCandidates.find(c => c.name === fuzzy.name);
        if (!found) return null;
        return { index: found.idx, matchedName: fuzzy.name, via: `fuzzy-dest-${fuzzy.via}` };
      };

      const originMatchers = buildMatchers(originTrimmed);
      const destMatchers = buildMatchers(destinationTrimmed);

      // Helper: extract YYYY-MM-DD in LOCAL timezone for robust date comparison
      const toLocalYmd = (dt) => {
        const x = new Date(dt);
        const yy = x.getFullYear();
        const mm = String(x.getMonth() + 1).padStart(2, "0");
        const dd = String(x.getDate()).padStart(2, "0");
        return `${yy}-${mm}-${dd}`;
      };
      const searchYmd = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

      console.log(
        `🔎 [SEARCH BUSES] Origin="${originTrimmed}" Destination="${destinationTrimmed}" SearchYMD="${searchYmd}" TravelDateISO="${travelDate.toISOString()}" NextDayISO="${nextDay.toISOString()}"`
      );

      // Find routes matching origin and destination
      // Origin can be startPoint or any stop in the route (forward direction only)
      // Destination can be any stop that comes AFTER the origin in the route
      // Get all active routes and filter in JavaScript to check stop positions
      const allActiveRoutes = await Route.find({
        status: "Active",
        isActive: true,
      }).select("_id name startPoint stops");

      console.log(
        `🗺️ [SEARCH BUSES] Total active routes: ${allActiveRoutes.length}`
      );

      const matchingRoutes = [];

      for (const route of allActiveRoutes) {
        // Use unified fuzzy-aware helper to find origin
        const originHit = findOriginInRoute(route, originMatchers);
        if (!originHit) continue;
        const originIndex = originHit.index;
        const originMatchedName = originHit.matchedName;

        // Use unified fuzzy-aware helper to find destination after origin
        const destHit = findDestinationInRoute(route, originIndex, destMatchers);
        if (!destHit) continue;
        const destMatchedName = destHit.matchedName;

        matchingRoutes.push(route);
        console.log(
          `✅ [SEARCH BUSES] Route match: "${route.name}" (id=${route._id}) | startPoint="${route.startPoint}" | originIdx=${originIndex} origin="${originMatchedName}" (via=${originHit.via}) | dest="${destMatchedName}" (via=${destHit.via}) | stops=${route.stops.length}`
        );
      }

      console.log(
        `📍 [SEARCH BUSES] Matching routes count: ${matchingRoutes.length} / ${allActiveRoutes.length}`
      );

      if (matchingRoutes.length === 0) {
        // Log a few route summaries to help debug why no matches
        if (allActiveRoutes.length > 0) {
          console.log(
            `🚧 [SEARCH BUSES] No matching routes. Sample active routes for debugging:`
          );
          for (let i = 0; i < Math.min(5, allActiveRoutes.length); i++) {
            const r = allActiveRoutes[i];
            const stopNames = r.stops.map((s) => s.name).join(" | ");
            console.log(
              `   Route[${i}] name="${r.name}" startPoint="${r.startPoint}" stops=[${stopNames}]`
            );
          }
        }
        return paginatedResponse(
          res,
          200,
          "No buses found for the given route",
          [],
          {
            page,
            limit,
            total: 0,
            pages: 0,
          }
        );
      }

      const routeIds = matchingRoutes.map((route) => route._id);

      // Find onboard schedules for these routes on the specified date.
      // Allow "Scheduled", "In Progress", and "Delayed" — delayed buses should still be bookable.
      // Use a slightly wider date window (±1 day in Mongo) then filter in-memory by local YMD
      // so timezone mismatches (UTC vs IST) never drop valid records.
      const windowPrev = new Date(y, m - 1, d - 1);
      const windowNext = new Date(y, m - 1, d + 2);
      const searchQuery = {
        routeId: { $in: routeIds },
        date: {
          $gte: windowPrev,
          $lt: windowNext,
        },
        status: { $in: ["Scheduled", "In Progress", "Delayed"] },
        isActive: true,
      };

      console.log(
        `🕒 [SEARCH BUSES] Sched search date window: ${windowPrev.toISOString()} <= date < ${windowNext.toISOString()} | status=Scheduled/InProgress/Delayed | routeIds=${routeIds.length}`
      );

      // Get schedules with a date window, we'll filter to exact YMD in memory
      const allSchedulesRaw = await OnboardSchedule.find(searchQuery)
        .populate(
          "busId",
          "busName busNumber seatCapacity seatArchitecture seatLayout busImages.front busImages.rear status acType"
        )
        .populate(
          "routeId",
          "name startPoint stops totalDistance estimatedTravelTime"
        )
        .sort({ date: 1, time: 1 });

      // Filter to schedules whose local date matches search YMD (handles timezone shifts)
      const allSchedules = allSchedulesRaw.filter((s) => {
        const match = toLocalYmd(s.date) === searchYmd;
        if (!match) {
          console.log(
            `⏭️ [SEARCH BUSES] Schedule ${s._id} skipped: storedLocalYmd=${toLocalYmd(s.date)} != searchYmd=${searchYmd} (storedISO=${s.date.toISOString()})`
          );
        }
        return match;
      });

      console.log(
        `🚌 [SEARCH BUSES] Schedules after Mongo query: ${allSchedulesRaw.length}, after local-YMD filter: ${allSchedules.length}`
      );

      // Check if search date is today - if so, exclude past departure/arrival times
      const isToday = travelDate.getTime() === today.getTime();
      const currentTime = new Date();
      const currentHours = currentTime.getHours();
      const currentMinutes = currentTime.getMinutes();

      // Helper function to calculate arrival time at a stop
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

        // Calculate cumulative duration to reach this stop
        if (!route.stops || route.stops.length === 0) return null;

        let totalMinutes = 0;
        for (let i = 0; i <= stopIndex && i < route.stops.length; i++) {
          if (route.stops[i].durationFromPrev) {
            totalMinutes += route.stops[i].durationFromPrev;
          }
        }

        // Add total minutes to departure time
        let totalTimeInMinutes = hours * 60 + minutes + totalMinutes;
        let arrivalHours = Math.floor(totalTimeInMinutes / 60) % 24;
        let arrivalMinutes = totalTimeInMinutes % 60;

        return { hours: arrivalHours, minutes: arrivalMinutes };
      };

      // Filter out schedules that have already departed/arrived (only for today's searches)
      let validSchedules = allSchedules;
      if (isToday) {
        validSchedules = allSchedules.filter((schedule) => {
          if (!schedule.time || !schedule.routeId) return false;
          const route = schedule.routeId;

          // Find origin position via unified fuzzy helpers (consistent with route match)
          const originHit = findOriginInRoute(route, originMatchers);
          if (!originHit) return false;
          const originIndex = originHit.index;

          // Calculate arrival/departure time at origin stop
          const arrivalAtOrigin = calculateArrivalTimeAtStop(
            schedule.time,
            route,
            originIndex
          );
          if (!arrivalAtOrigin) return false;

          // Check if arrival time at origin is in the future
          if (arrivalAtOrigin.hours > currentHours) {
            return true; // Future hour today
          } else if (arrivalAtOrigin.hours === currentHours) {
            return arrivalAtOrigin.minutes > currentMinutes; // Same hour, check minutes
          } else {
            return false; // Past hour today
          }
        });
      }

      // Apply pagination after filtering
      const schedules = validSchedules.slice(skip, skip + limit);
      const total = validSchedules.length;

      console.log(
        `📋 [SEARCH BUSES] Found ${schedules.length} buses for search`
      );

      // Get all bus ratings
      const allBusRatings = await Rating.find({
        isActive: true,
      }).lean();

      console.log(`⭐ [SEARCH BUSES] Found ${allBusRatings.length} ratings`);

      // Create bus rating map
      const busRatingMap = {};
      allBusRatings.forEach((rating) => {
        const busId = rating.busId.toString();
        if (!busRatingMap[busId]) {
          busRatingMap[busId] = [];
        }
        busRatingMap[busId].push(rating.rating);
      });

      console.log(
        `🗺️  [SEARCH BUSES] Created bus rating map with ${
          Object.keys(busRatingMap).length
        } buses`
      );

      // Transform the data to include origin and destination information
      const transformedSchedules = await Promise.all(
        schedules.map(async (schedule) => {
          const scheduleObj = schedule.toObject();
          const seatLayout = normalizeSeatLayout(schedule.busId);
          if (seatLayout) {
            scheduleObj.busId = scheduleObj.busId || {};
            scheduleObj.busId.seatLayout = seatLayout;
            if (!scheduleObj.busId.seatCapacity && seatLayout.totalSeats) {
              scheduleObj.busId.seatCapacity = seatLayout.totalSeats;
            }
          }

          // Add bus ratings
          const busId = schedule.busId._id.toString();
          const ratings = busRatingMap[busId] || [];
          if (scheduleObj.busId) {
            scheduleObj.busId.averageRating =
              ratings.length > 0
                ? ratings.reduce((a, b) => a + b, 0) / ratings.length
                : 0;
            scheduleObj.busId.totalRatings = ratings.length;
          }

          // Find the matched origin and destination in the route for this schedule
          if (schedule.routeId) {
            const route = schedule.routeId;
            let foundOriginIndex = null;
            let foundDestinationIndex = null;

            // Find origin position via unified fuzzy helpers
            const originHit = findOriginInRoute(route, originMatchers);
            if (originHit) {
              foundOriginIndex = originHit.index;
              scheduleObj.searchOrigin = originHit.matchedName;

              if (foundOriginIndex === -1) {
                // For start point, arrival time is same as departure time
                scheduleObj.arrivalTime = schedule.time;
              } else {
                // Calculate arrival time at origin stop
                const arrivalAtOrigin = calculateArrivalTimeAtStop(
                  schedule.time,
                  route,
                  foundOriginIndex
                );
                if (arrivalAtOrigin) {
                  scheduleObj.arrivalTime = `${arrivalAtOrigin.hours
                    .toString()
                    .padStart(2, "0")}:${arrivalAtOrigin.minutes
                    .toString()
                    .padStart(2, "0")}`;
                } else {
                  scheduleObj.arrivalTime = schedule.time; // Fallback
                }
              }
            }

            // Find destination via unified fuzzy helpers (must be after origin)
            if (foundOriginIndex !== null) {
              const destHit = findDestinationInRoute(route, foundOriginIndex, destMatchers);
              if (destHit) {
                foundDestinationIndex = destHit.index;
                scheduleObj.searchDestination = destHit.matchedName;

                const arrivalAtDestination = calculateArrivalTimeAtStop(
                  schedule.time,
                  route,
                  foundDestinationIndex
                );
                if (arrivalAtDestination) {
                  scheduleObj.arrivalTimeAtDestination = `${arrivalAtDestination.hours
                    .toString()
                    .padStart(2, "0")}:${arrivalAtDestination.minutes
                    .toString()
                    .padStart(2, "0")}`;
                }
              }
            }

            // Also include the full route end point and original departure time for reference
            if (route.stops && route.stops.length > 0) {
              scheduleObj.finalDestination =
                route.stops[route.stops.length - 1].name;
            }
            scheduleObj.originalDepartureTime = schedule.time; // Original departure from start point

            // Calculate and add arrival time and cumulative distance for each stop in the route
            if (route.stops && route.stops.length > 0) {
              const stopsWithArrivalTime = route.stops.map((stop, index) => {
                const stopObj = stop.toObject ? stop.toObject() : { ...stop };
                const arrivalAtStop = calculateArrivalTimeAtStop(
                  schedule.time,
                  route,
                  index
                );
                if (arrivalAtStop) {
                  stopObj.arrivalTime = `${arrivalAtStop.hours
                    .toString()
                    .padStart(2, "0")}:${arrivalAtStop.minutes
                    .toString()
                    .padStart(2, "0")}`;
                } else {
                  // Fallback: if calculation fails, use departure time for first stop, or previous stop's arrival
                  if (index === 0) {
                    stopObj.arrivalTime = schedule.time;
                  }
                }

                // Calculate cumulative distance from start point
                let cumulativeDistance = 0;
                for (let i = 0; i <= index && i < route.stops.length; i++) {
                  if (route.stops[i].distanceFromPrev) {
                    cumulativeDistance += route.stops[i].distanceFromPrev;
                  }
                }
                stopObj.distanceFromStart = cumulativeDistance;

                return stopObj;
              });

              // Replace the stops array with stops that include arrival times and distances
              scheduleObj.routeId.stops = stopsWithArrivalTime;
            }

            // Get booked seats for this schedule and travel date
            const bookedSeats = await getBookedSeats(schedule._id, date);
            scheduleObj.bookedSeats = bookedSeats;

            // Calculate available seats using seatLayout.totalSeats (more accurate than seatCapacity)
            const totalSeats =
              seatLayout?.totalSeats || schedule.busId?.seatCapacity || 0;
            scheduleObj.availableSeats =
              totalSeats > 0 ? totalSeats - bookedSeats.length : 0;
          }

          return scheduleObj;
        })
      );

      console.log(
        `✅ [SEARCH BUSES] Returning ${transformedSchedules.length} buses with ratings`
      );

      paginatedResponse(
        res,
        200,
        "Buses retrieved successfully",
        transformedSchedules,
        {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        }
      );
    } catch (error) {
      console.error("Search buses error:", error);
      errorResponse(res, 500, "Failed to search buses", error.message);
    }
  }
);

/**
 * @swagger
 * /api/onboard/{id}:
 *   get:
 *     summary: Get onboard schedule by ID
 *     description: Retrieve detailed information about a specific onboard schedule with booked seats for that schedule's date.
 *     tags: [Onboard Schedules]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Schedule ID
 *     responses:
 *       200:
 *         description: Onboard schedule retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       allOf:
 *                         - $ref: '#/components/schemas/OnboardSchedule'
 *                         - type: object
 *                           properties:
 *                             bookedSeats:
 *                               type: array
 *                               items:
 *                                 type: string
 *                               description: Array of already booked seat numbers for this schedule on its travel date.
 *                               example: ["A1", "A2", "B3"]
 *                             availableSeats:
 *                               type: integer
 *                               description: Number of available seats remaining (total capacity minus booked seats).
 *                               example: 37
 *                             busId:
 *                               type: object
 *                               properties:
 *                                 seatLayout:
 *                                   type: object
 *                                   description: Seat layout configuration for Android rendering
 *                                   properties:
 *                                     rows:
 *                                       type: integer
 *                                       example: 10
 *                                     columns:
 *                                       type: integer
 *                                       example: 4
 *                                     map:
 *                                       type: array
 *                                       description: 2D array representation of seat layout. Each cell is an object with properties `enabled` (boolean) and `seatLabel` (string)
 *                                     totalSeats:
 *                                       type: integer
 *                                       description: Total number of enabled seats
 *                                       example: 45
 *       404:
 *         description: Schedule not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get("/:id", authenticateToken, validateObjectId, async (req, res) => {
  try {
    const Rating = require("../models/Rating");

    const schedule = await OnboardSchedule.findById(req.params.id)
      .populate(
        "busId",
        "busName busNumber seatCapacity seatArchitecture seatLayout acType"
      )
      .populate("routeId", "name startPoint totalDistance estimatedTravelTime")
      .populate("assignedTeam.id", "fullName mobile email");

    if (!schedule) {
      return errorResponse(res, 404, "Onboard schedule not found");
    }

    // Convert schedule to object to add booked seats
    const scheduleObj = schedule.toObject();

    const seatLayout = normalizeSeatLayout(schedule.busId);
    if (seatLayout) {
      scheduleObj.busId = scheduleObj.busId || {};
      scheduleObj.busId.seatLayout = seatLayout;
      if (!scheduleObj.busId.seatCapacity && seatLayout.totalSeats) {
        scheduleObj.busId.seatCapacity = seatLayout.totalSeats;
      }
    }

    // Get bus ratings
    const allBusRatings = await Rating.find({
      isActive: true,
    }).lean();

    // Create bus rating map
    const busRatingMap = {};
    allBusRatings.forEach((rating) => {
      const busId = rating.busId.toString();
      if (!busRatingMap[busId]) {
        busRatingMap[busId] = [];
      }
      busRatingMap[busId].push(rating.rating);
    });

    // Add bus ratings to the response
    if (scheduleObj.busId && schedule.busId) {
      const busId = schedule.busId._id.toString();
      const ratings = busRatingMap[busId] || [];
      scheduleObj.busId.averageRating =
        ratings.length > 0
          ? ratings.reduce((a, b) => a + b, 0) / ratings.length
          : 0;
      scheduleObj.busId.totalRatings = ratings.length;
    }

    // Always return booked seats and availability for the schedule's actual date.
    // When fetching by schedule ID, ignore any `travelDate`/`date` query param
    // and use the schedule's own `date` field to compute bookings and availability.
    const scheduleDate = schedule.date ? new Date(schedule.date) : null;
    if (scheduleDate) {
      // normalize to start of day so getBookedSeats date range matches storage
      scheduleDate.setHours(0, 0, 0, 0);
      const bookedSeats = await getBookedSeats(schedule._id, scheduleDate);
      scheduleObj.bookedSeats = bookedSeats;

      // Calculate available seats using seatLayout.totalSeats (more accurate than seatCapacity)
      const totalSeats =
        seatLayout?.totalSeats || schedule.busId?.seatCapacity || 0;
      scheduleObj.availableSeats =
        totalSeats > 0 ? totalSeats - bookedSeats.length : 0;
    } else {
      // If schedule has no date, fall back to empty booked seats and full availability
      scheduleObj.bookedSeats = [];
      const totalSeats =
        seatLayout?.totalSeats || schedule.busId?.seatCapacity || 0;
      scheduleObj.availableSeats = totalSeats;
    }

    successResponse(
      res,
      200,
      "Onboard schedule retrieved successfully",
      scheduleObj
    );
  } catch (error) {
    console.error("Get onboard schedule error:", error);
    errorResponse(
      res,
      500,
      "Failed to retrieve onboard schedule",
      error.message
    );
  }
});

/*
 * @swagger
 * /api/onboard:
 *   post:
 *     summary: Create new onboard schedule (Admin only)
 *     tags: [Onboard Schedules]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - busId
 *               - routeId
 *               - date
 *               - time
 *             properties:
 *               busId:
 *                 type: string
 *                 example: "60d0fe4f5311236168a109cc"
 *               routeId:
 *                 type: string
 *                 example: "60d0fe4f5311236168a109cd"
 *               date:
 *                 type: string
 *                 format: date
 *                 example: "2024-03-15"
 *               time:
 *                 type: string
 *                 example: "10:00 AM"
 *               assignedTeam:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     name:
 *                       type: string
 *                     role:
 *                       type: string
 *                       enum: [Driver, Conductor]
 *               pricing:
 *                 type: object
 *                 properties:
 *                   baseFare:
 *                     type: number
 *                     example: 1500
 *                   perKmCharge:
 *                     type: number
 *                     example: 5
 *                   totalFare:
 *                     type: number
 *                     example: 1800
 *               status:
 *                 type: string
 *                 enum: [Scheduled, In Progress, Completed, Cancelled, Delayed]
 *                 default: Scheduled
 *     responses:
 *       201:
 *         description: Onboard schedule created successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/OnboardSchedule'
 *       400:
 *         description: Validation error
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
router.post("/", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const scheduleData = req.body;

    // Validate required fields
    if (
      !scheduleData.busId ||
      !scheduleData.routeId ||
      !scheduleData.date ||
      !scheduleData.time
    ) {
      return errorResponse(
        res,
        400,
        "Bus ID, Route ID, date, and time are required"
      );
    }

    // Check if bus exists
    const bus = await Bus.findById(scheduleData.busId);
    if (!bus) {
      return errorResponse(res, 404, "Bus not found");
    }

    // Check if route exists
    const route = await Route.findById(scheduleData.routeId);
    if (!route) {
      return errorResponse(res, 404, "Route not found");
    }

    // Check if bus is available for the date
    const existingSchedule = await OnboardSchedule.findOne({
      busId: scheduleData.busId,
      date: new Date(scheduleData.date),
      status: { $in: ["Scheduled", "In Progress"] },
    });

    if (existingSchedule) {
      return errorResponse(res, 400, "Bus is already scheduled for this date");
    }

    // Validate assigned team
    if (scheduleData.assignedTeam && scheduleData.assignedTeam.length > 0) {
      for (const member of scheduleData.assignedTeam) {
        const driver = await Driver.findById(member.id);
        if (!driver) {
          return errorResponse(
            res,
            404,
            `Driver with ID ${member.id} not found`
          );
        }
      }
    }

    // Calculate pricing if not provided
    if (!scheduleData.pricing) {
      const defaultBaseAmount = 100;
      const defaultPerKmRate = 10;
      scheduleData.pricing = {
        baseAmount: defaultBaseAmount,
        perKmRate: defaultPerKmRate,
        totalFare: defaultBaseAmount + route.totalDistance * defaultPerKmRate,
      };
    }

    const schedule = new OnboardSchedule({
      ...scheduleData,
      busName: bus.busName,
      routeName: route.name,
    });

    await schedule.save();

    // Populate the response
    const populatedSchedule = await OnboardSchedule.findById(schedule._id)
      .populate("busId", "busName busNumber seatCapacity acType")
      .populate("routeId", "name startPoint totalDistance estimatedTravelTime")
      .populate("assignedTeam.id", "fullName mobile email");

    successResponse(
      res,
      201,
      "Onboard schedule created successfully",
      populatedSchedule
    );
  } catch (error) {
    console.error("Create onboard schedule error:", error);
    errorResponse(res, 500, "Failed to create onboard schedule", error.message);
  }
});

/*
 * @swagger
 * /api/onboard/{id}:
 *   put:
 *     summary: Update onboard schedule (Admin only)
 *     tags: [Onboard Schedules]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Schedule ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               busId:
 *                 type: string
 *                 example: "60d0fe4f5311236168a109cc"
 *               routeId:
 *                 type: string
 *                 example: "60d0fe4f5311236168a109cd"
 *               date:
 *                 type: string
 *                 format: date
 *                 example: "2024-03-15"
 *               time:
 *                 type: string
 *                 example: "10:00 AM"
 *               assignedTeam:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     name:
 *                       type: string
 *                     role:
 *                       type: string
 *                       enum: [Driver, Conductor]
 *               pricing:
 *                 type: object
 *                 properties:
 *                   baseFare:
 *                     type: number
 *                   perKmCharge:
 *                     type: number
 *                   totalFare:
 *                     type: number
 *               status:
 *                 type: string
 *                 enum: [Scheduled, In Progress, Completed, Cancelled, Delayed]
 *     responses:
 *       200:
 *         description: Onboard schedule updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/OnboardSchedule'
 *       404:
 *         description: Schedule not found
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
  "/:id",
  authenticateToken,
  requireAdmin,
  validateObjectId,
  async (req, res) => {
    try {
      const scheduleId = req.params.id;
      const updateData = req.body;

      // Remove fields that shouldn't be updated directly
      delete updateData._id;
      delete updateData.createdAt;
      delete updateData.updatedAt;

      // If busId is being updated, fetch and update busName
      if (updateData.busId) {
        const bus = await Bus.findById(updateData.busId);
        if (!bus) {
          return errorResponse(res, 404, "Bus not found");
        }
        updateData.busName = bus.busName;

        // Check if bus is available for the date (if date is also being updated)
        const checkDate =
          updateData.date || (await OnboardSchedule.findById(scheduleId))?.date;
        const existingSchedule = await OnboardSchedule.findOne({
          busId: updateData.busId,
          date: new Date(checkDate),
          status: { $in: ["Scheduled", "In Progress"] },
          _id: { $ne: scheduleId },
        });

        if (existingSchedule) {
          return errorResponse(
            res,
            400,
            "Bus is already scheduled for this date"
          );
        }
      }

      // If routeId is being updated, fetch and update routeName
      if (updateData.routeId) {
        const route = await Route.findById(updateData.routeId);
        if (!route) {
          return errorResponse(res, 404, "Route not found");
        }
        updateData.routeName = route.name;

        // Recalculate total fare if route changed and pricing exists
        if (
          updateData.pricing &&
          updateData.pricing.baseAmount &&
          updateData.pricing.perKmRate
        ) {
          updateData.pricing.totalFare =
            updateData.pricing.baseAmount +
            route.totalDistance * updateData.pricing.perKmRate;
        }
      }

      // If pricing is being updated but totalFare is not calculated, calculate it
      if (
        updateData.pricing &&
        updateData.pricing.baseAmount &&
        updateData.pricing.perKmRate
      ) {
        const currentSchedule = await OnboardSchedule.findById(scheduleId);
        if (currentSchedule) {
          const route = currentSchedule.routeId?.totalDistance
            ? currentSchedule.routeId
            : await Route.findById(
                currentSchedule.routeId || updateData.routeId
              );

          if (route && route.totalDistance) {
            if (!updateData.pricing.totalFare) {
              updateData.pricing.totalFare =
                updateData.pricing.baseAmount +
                route.totalDistance * updateData.pricing.perKmRate;
            }
          }
        }
      }

      // Validate assigned team if being updated
      if (updateData.assignedTeam && Array.isArray(updateData.assignedTeam)) {
        for (const member of updateData.assignedTeam) {
          const driver = await Driver.findById(member.id);
          if (!driver) {
            return errorResponse(
              res,
              404,
              `Driver with ID ${member.id} not found`
            );
          }
        }
      }

      const schedule = await OnboardSchedule.findByIdAndUpdate(
        scheduleId,
        updateData,
        { new: true, runValidators: true }
      )
        .populate("busId", "busName busNumber seatCapacity acType")
        .populate(
          "routeId",
          "name startPoint totalDistance estimatedTravelTime"
        )
        .populate("assignedTeam.id", "fullName mobile email");

      if (!schedule) {
        return errorResponse(res, 404, "Onboard schedule not found");
      }

      successResponse(
        res,
        200,
        "Onboard schedule updated successfully",
        schedule
      );
    } catch (error) {
      console.error("Update onboard schedule error:", error);
      errorResponse(
        res,
        500,
        "Failed to update onboard schedule",
        error.message
      );
    }
  }
);

/*
 * @swagger
 * /api/onboard/{id}:
 *   delete:
 *     summary: Delete onboard schedule (Admin only)
 *     tags: [Onboard Schedules]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Schedule ID
 *     responses:
 *       200:
 *         description: Onboard schedule deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       404:
 *         description: Schedule not found
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
      const schedule = await OnboardSchedule.findByIdAndDelete(req.params.id);

      if (!schedule) {
        return errorResponse(res, 404, "Onboard schedule not found");
      }

      successResponse(res, 200, "Onboard schedule deleted successfully");
    } catch (error) {
      console.error("Delete onboard schedule error:", error);
      errorResponse(
        res,
        500,
        "Failed to delete onboard schedule",
        error.message
      );
    }
  }
);

/*
 * @swagger
 * /api/onboard/{id}/status:
 *   put:
 *     summary: Update schedule status (Admin only)
 *     tags: [Onboard Schedules]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Schedule ID
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
 *                 enum: [Scheduled, In Progress, Completed, Cancelled, Delayed]
 *                 example: "In Progress"
 *               reason:
 *                 type: string
 *                 example: "Bus breakdown"
 *     responses:
 *       200:
 *         description: Schedule status updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/OnboardSchedule'
 *       404:
 *         description: Schedule not found
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
      const { status, actualDepartureTime, actualArrivalTime, delayReason } =
        req.body;

      if (
        ![
          "Scheduled",
          "In Progress",
          "Completed",
          "Cancelled",
          "Delayed",
        ].includes(status)
      ) {
        return errorResponse(res, 400, "Invalid status");
      }

      const updateData = { status };
      if (actualDepartureTime)
        updateData.actualDepartureTime = actualDepartureTime;
      if (actualArrivalTime) updateData.actualArrivalTime = actualArrivalTime;
      if (delayReason) updateData.delayReason = delayReason;

      const schedule = await OnboardSchedule.findByIdAndUpdate(
        req.params.id,
        updateData,
        { new: true }
      )
        .populate("busId", "busName busNumber seatCapacity acType")
        .populate(
          "routeId",
          "name startPoint totalDistance estimatedTravelTime"
        )
        .populate("assignedTeam.id", "fullName mobile email");

      if (!schedule) {
        return errorResponse(res, 404, "Onboard schedule not found");
      }

      successResponse(
        res,
        200,
        "Onboard schedule status updated successfully",
        schedule
      );
    } catch (error) {
      console.error("Update onboard schedule status error:", error);
      errorResponse(
        res,
        500,
        "Failed to update onboard schedule status",
        error.message
      );
    }
  }
);

/*
 * @swagger
 * /api/onboard/{id}/team:
 *   put:
 *     summary: Update assigned team (Admin only)
 *     tags: [Onboard Schedules]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Schedule ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - assignedTeam
 *             properties:
 *               assignedTeam:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       example: "60d0fe4f5311236168a109cb"
 *                     name:
 *                       type: string
 *                       example: "John Driver"
 *                     role:
 *                       type: string
 *                       enum: [Driver, Conductor]
 *                       example: "Driver"
 *     responses:
 *       200:
 *         description: Team updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/OnboardSchedule'
 *       404:
 *         description: Schedule not found
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
  "/:id/team",
  authenticateToken,
  requireAdmin,
  validateObjectId,
  async (req, res) => {
    try {
      const { assignedTeam } = req.body;

      if (!assignedTeam || !Array.isArray(assignedTeam)) {
        return errorResponse(res, 400, "Assigned team must be an array");
      }

      // Validate team members
      for (const member of assignedTeam) {
        const driver = await Driver.findById(member.id);
        if (!driver) {
          return errorResponse(
            res,
            404,
            `Driver with ID ${member.id} not found`
          );
        }
      }

      const schedule = await OnboardSchedule.findByIdAndUpdate(
        req.params.id,
        { assignedTeam },
        { new: true }
      )
        .populate("busId", "busName busNumber seatCapacity acType")
        .populate(
          "routeId",
          "name startPoint totalDistance estimatedTravelTime"
        )
        .populate("assignedTeam.id", "fullName mobile email");

      if (!schedule) {
        return errorResponse(res, 404, "Onboard schedule not found");
      }

      successResponse(res, 200, "Assigned team updated successfully", schedule);
    } catch (error) {
      console.error("Update assigned team error:", error);
      errorResponse(res, 500, "Failed to update assigned team", error.message);
    }
  }
);

/*
 * @swagger
 * /api/onboard/stats/overview:
 *   get:
 *     summary: Get schedule statistics (Admin only)
 *     tags: [Onboard Schedules]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Schedule statistics retrieved successfully
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
 *                         totalSchedules:
 *                           type: integer
 *                         scheduledSchedules:
 *                           type: integer
 *                         inProgressSchedules:
 *                           type: integer
 *                         completedSchedules:
 *                           type: integer
 *                         cancelledSchedules:
 *                           type: integer
 *                         delayedSchedules:
 *                           type: integer
 *                         scheduleStats:
 *                           type: object
 *                           properties:
 *                             totalRevenue:
 *                               type: number
 *                             avgFare:
 *                               type: number
 *                             totalBookings:
 *                               type: integer
 *                             avgBookingsPerSchedule:
 *                               type: number
 *                         routeStats:
 *                           type: array
 *                           items:
 *                             type: object
 *                         busStats:
 *                           type: array
 *                           items:
 *                             type: object
 *                         recentSchedules:
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
      const totalSchedules = await OnboardSchedule.countDocuments();
      const scheduledTrips = await OnboardSchedule.countDocuments({
        status: "Scheduled",
      });
      const inProgressTrips = await OnboardSchedule.countDocuments({
        status: "In Progress",
      });
      const completedTrips = await OnboardSchedule.countDocuments({
        status: "Completed",
      });

      const statusStats = await OnboardSchedule.aggregate([
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
          },
        },
      ]);

      const revenueStats = await OnboardSchedule.aggregate([
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: "$totalRevenue" },
            avgRevenue: { $avg: "$totalRevenue" },
          },
        },
      ]);

      const occupancyStats = await OnboardSchedule.aggregate([
        {
          $group: {
            _id: null,
            avgOccupancy: { $avg: "$occupancyRate" },
            maxOccupancy: { $max: "$occupancyRate" },
            minOccupancy: { $min: "$occupancyRate" },
          },
        },
      ]);

      const monthlyStats = await OnboardSchedule.aggregate([
        {
          $group: {
            _id: {
              year: { $year: "$date" },
              month: { $month: "$date" },
            },
            count: { $sum: 1 },
            revenue: { $sum: "$totalRevenue" },
          },
        },
        { $sort: { "_id.year": -1, "_id.month": -1 } },
        { $limit: 12 },
      ]);

      successResponse(
        res,
        200,
        "Onboard schedule statistics retrieved successfully",
        {
          totalSchedules,
          scheduledTrips,
          inProgressTrips,
          completedTrips,
          statusStats,
          revenueStats: revenueStats[0] || {},
          occupancyStats: occupancyStats[0] || {},
          monthlyStats,
        }
      );
    } catch (error) {
      console.error("Get onboard schedule stats error:", error);
      errorResponse(
        res,
        500,
        "Failed to retrieve onboard schedule statistics",
        error.message
      );
    }
  }
);

module.exports = router;
