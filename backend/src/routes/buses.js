const express = require("express");
const Bus = require("../models/Bus");
const {
  successResponse,
  errorResponse,
  paginatedResponse,
} = require("../utils/response");
const { authenticateToken, requireAdmin } = require("../middleware/auth");
const {
  validateBus,
  validateObjectId,
  validatePagination,
} = require("../middleware/validation");
const { uploadFields } = require("../middleware/upload");

const router = express.Router();

// Seat layout helper utilities (same as onboard.js)
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
 * /api/buses:
 *   get:
 *     summary: Get all buses
 *     tags: [Buses]
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
 *         description: Number of buses per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term for bus name or number
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [all, Active, Inactive, Maintenance, Retired]
 *           default: all
 *         description: Filter by status
 *       - in: query
 *         name: architecture
 *         schema:
 *           type: string
 *           enum: [all, 2+2, 2+1, 1+1, 3+2]
 *           default: all
 *         description: Filter by seat architecture
 *       - in: query
 *         name: acType
 *         schema:
 *           type: string
 *           enum: [all, AC, Non-AC]
 *           default: all
 *         description: Filter by AC type
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
 *                         $ref: '#/components/schemas/Bus'
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
    const Rating = require("../models/Rating");

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const search = req.query.search || "";
    const status = req.query.status || "all";
    const architecture = req.query.architecture || "all";
    const acType = req.query.acType || "all";

    console.log("🚌 [BUSES LIST] Starting bus listing with ratings...");

    // Build search query
    const searchQuery = {};

    if (search) {
      searchQuery.$or = [
        { busName: { $regex: search, $options: "i" } },
        { busNumber: { $regex: search, $options: "i" } },
      ];
    }

    if (status !== "all") {
      searchQuery.status = status;
    }

    if (architecture !== "all") {
      searchQuery.seatArchitecture = architecture;
    }

    if (acType !== "all") {
      searchQuery.acType = acType;
    }

    // Get buses with pagination
    const buses = await Bus.find(searchQuery)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    console.log(`📋 [BUSES LIST] Found ${buses.length} buses for page ${page}`);

    const total = await Bus.countDocuments(searchQuery);

    // Get all bus ratings
    const allBusRatings = await Rating.find({
      isActive: true,
    }).lean();

    console.log(`⭐ [BUSES LIST] Found ${allBusRatings.length} ratings`);

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
      `🗺️  [BUSES LIST] Created bus rating map with ${
        Object.keys(busRatingMap).length
      } buses`
    );

    // Normalize seat layout for each bus and add ratings
    const normalizedBuses = buses.map((bus) => {
      const busObj = bus.toObject();
      const seatLayout = normalizeSeatLayout(bus);
      if (seatLayout) {
        busObj.seatLayout = seatLayout;
      }

      // Add average rating
      const busId = bus._id.toString();
      const ratings = busRatingMap[busId] || [];
      busObj.averageRating =
        ratings.length > 0
          ? ratings.reduce((a, b) => a + b, 0) / ratings.length
          : 0;
      busObj.totalRatings = ratings.length;

      return busObj;
    });

    console.log(
      `✅ [BUSES LIST] Returning ${normalizedBuses.length} buses with ratings`
    );

    paginatedResponse(
      res,
      200,
      "Buses retrieved successfully",
      normalizedBuses,
      {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      }
    );
  } catch (error) {
    console.error("Get buses error:", error);
    errorResponse(res, 500, "Failed to retrieve buses", error.message);
  }
});

/*
 * @swagger
 * /api/buses/{id}:
 *   get:
 *     summary: Get bus by ID
 *     tags: [Buses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Bus ID
 *     responses:
 *       200:
 *         description: Bus retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Bus'
 *       404:
 *         description: Bus not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get("/:id", authenticateToken, validateObjectId, async (req, res) => {
  try {
    const Rating = require("../models/Rating");

    const bus = await Bus.findById(req.params.id);

    if (!bus) {
      return errorResponse(res, 404, "Bus not found");
    }

    console.log(`🚌 [BUS DETAIL] Fetching details for bus ${req.params.id}`);

    // Get all bus ratings
    const allBusRatings = await Rating.find({
      isActive: true,
    }).lean();

    console.log(`⭐ [BUS DETAIL] Found ${allBusRatings.length} ratings`);

    // Filter ratings for this specific bus
    const busRatings = allBusRatings.filter(
      (r) => r.busId.toString() === req.params.id
    );

    // Normalize seat layout (remove seats array, keep only map)
    const busObj = bus.toObject();
    const seatLayout = normalizeSeatLayout(bus);
    if (seatLayout) {
      busObj.seatLayout = seatLayout;
    }

    // Add average rating
    const ratings = busRatings.map((r) => r.rating);
    busObj.averageRating =
      ratings.length > 0
        ? ratings.reduce((a, b) => a + b, 0) / ratings.length
        : 0;
    busObj.totalRatings = ratings.length;

    console.log(
      `✅ [BUS DETAIL] Bus has ${
        busObj.totalRatings
      } ratings with average ${busObj.averageRating.toFixed(2)}`
    );

    successResponse(res, 200, "Bus retrieved successfully", busObj);
  } catch (error) {
    console.error("Get bus error:", error);
    errorResponse(res, 500, "Failed to retrieve bus", error.message);
  }
});

/*
 * @swagger
 * /api/buses:
 *   post:
 *     summary: Create new bus (Admin only)
 *     tags: [Buses]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - busName
 *               - busNumber
 *               - seatArchitecture
 *               - seatCapacity
 *               - insuranceNumber
 *             properties:
 *               busName:
 *                 type: string
 *                 example: "Volvo AC Sleeper"
 *               busNumber:
 *                 type: string
 *                 example: "KA01AB1234"
 *               seatArchitecture:
 *                 type: string
 *                 enum: [2+2, 2+1, 1+1, 3+2]
 *                 example: "2+2"
 *               seatCapacity:
 *                 type: number
 *                 example: 40
 *               insuranceNumber:
 *                 type: string
 *                 example: "INS123456789"
 *               rcDocument:
 *                 type: string
 *                 format: binary
 *                 description: RC document
 *               pollutionCertificate:
 *                 type: string
 *                 format: binary
 *                 description: Pollution certificate
 *               insuranceCertificate:
 *                 type: string
 *                 format: binary
 *                 description: Insurance certificate
 *               frontImage:
 *                 type: string
 *                 format: binary
 *                 description: Front view image
 *               rearImage:
 *                 type: string
 *                 format: binary
 *                 description: Rear view image
 *               leftImage:
 *                 type: string
 *                 format: binary
 *                 description: Left side image
 *               rightImage:
 *                 type: string
 *                 format: binary
 *                 description: Right side image
 *     responses:
 *       201:
 *         description: Bus created successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Bus'
 *       400:
 *         description: Validation error or bus already exists
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
  uploadFields([
    { name: "rcDocument", maxCount: 1 },
    { name: "pollutionCertificate", maxCount: 1 },
    { name: "insuranceCertificate", maxCount: 1 },
    { name: "frontImage", maxCount: 1 },
    { name: "rearImage", maxCount: 1 },
    { name: "leftImage", maxCount: 1 },
    { name: "rightImage", maxCount: 1 },
  ]),
  validateBus,
  async (req, res) => {
    console.log("\n🚌 ===== STARTING BUS CREATION =====");
    try {
      console.log("📥 Step 1: Received request body:", JSON.stringify(req.body, null, 2));
      const busData = req.body;

      console.log("📥 Step 2: Checking files...");
      // Validate required documents for new bus creation
      if (!req.files || !req.files.rcDocument) {
        console.log("❌ Error: RC Document is missing");
        return errorResponse(res, 400, "RC Document is required");
      }
      if (!req.files.pollutionCertificate) {
        console.log("❌ Error: Pollution Certificate is missing");
        return errorResponse(res, 400, "Pollution Certificate is required");
      }
      if (!req.files.insuranceCertificate) {
        console.log("❌ Error: Insurance Certificate is missing");
        return errorResponse(res, 400, "Insurance Certificate is required");
      }

      console.log("📥 Step 3: Processing uploaded files...");
      // Handle file uploads
      if (req.files) {
        if (req.files.rcDocument) {
          busData.rcDocument = '/uploads/' + req.files.rcDocument[0].filename;
          console.log("  ✅ RC Document path set:", busData.rcDocument);
        }
        if (req.files.pollutionCertificate) {
          busData.pollutionCertificate = '/uploads/' + req.files.pollutionCertificate[0].filename;
          console.log("  ✅ Pollution Certificate path set:", busData.pollutionCertificate);
        }
        if (req.files.insuranceCertificate) {
          busData.insuranceCertificate = '/uploads/' + req.files.insuranceCertificate[0].filename;
          console.log("  ✅ Insurance Certificate path set:", busData.insuranceCertificate);
        }

        // Handle bus images
        const busImages = {};
        if (req.files.frontImage) {
          busImages.front = '/uploads/' + req.files.frontImage[0].filename;
        }
        if (req.files.rearImage) {
          busImages.rear = '/uploads/' + req.files.rearImage[0].filename;
        }
        if (req.files.leftImage) {
          busImages.left = '/uploads/' + req.files.leftImage[0].filename;
        }
        if (req.files.rightImage) {
          busImages.right = '/uploads/' + req.files.rightImage[0].filename;
        }

        if (Object.keys(busImages).length > 0) {
          busData.busImages = busImages;
          console.log("  ✅ Bus images processed:", busImages);
        }
      }

      console.log("📥 Step 4: Processing seatLayout...");
      // Parse seatLayout if provided as JSON string
      if (busData.seatLayout && typeof busData.seatLayout === "string") {
        try {
          busData.seatLayout = JSON.parse(busData.seatLayout);
          console.log("  ✅ seatLayout parsed successfully.");
        } catch (error) {
          console.log("❌ Error: Failed to parse seatLayout string", error.message);
          return errorResponse(
            res,
            400,
            "Invalid seatLayout format. Must be valid JSON."
          );
        }
      }

      console.log("📥 Step 5: Validating seatLayout data...");
      // Validate seatLayout if provided
      if (busData.seatLayout) {
        if (!busData.seatLayout.rows || !busData.seatLayout.columns) {
          console.log("❌ Error: seatLayout missing rows or columns");
          return errorResponse(
            res,
            400,
            "Seat layout must have rows and columns"
          );
        }
        if (busData.seatLayout.totalSeats) {
          busData.seatCapacity = busData.seatLayout.totalSeats;
          console.log("  ✅ seatCapacity updated to:", busData.seatCapacity);
        }
      }

      console.log("📥 Step 6: Checking for duplicate bus...");
      // Check if bus already exists
      const existingBus = await Bus.findOne({
        $or: [
          { busNumber: busData.busNumber },
          { insuranceNumber: busData.insuranceNumber },
        ],
      });

      if (existingBus) {
        console.log("❌ Error: Bus already exists with this number or insurance");
        return errorResponse(
          res,
          400,
          "Bus already exists with this number or insurance"
        );
      }

      console.log("📥 Step 7: Creating new Bus document...");
      const bus = new Bus(busData);
      
      console.log("📥 Step 8: Saving bus to database...");
      await bus.save();

      console.log("✅ Bus successfully created! ID:", bus._id);
      successResponse(res, 201, "Bus created successfully", bus);
    } catch (error) {
      console.error("\n❌ ===== FATAL ERROR IN BUS CREATION =====");
      console.error("Error details:", error);
      console.error("Stack trace:", error.stack);
      errorResponse(res, 500, "Failed to create bus", error.message);
    }
  }
);

/*
 * @swagger
 * /api/buses/{id}:
 *   put:
 *     summary: Update bus (Admin only)
 *     tags: [Buses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Bus ID
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               busName:
 *                 type: string
 *               busNumber:
 *                 type: string
 *               seatArchitecture:
 *                 type: string
 *                 enum: [2+2, 2+1, 1+1, 3+2]
 *               seatCapacity:
 *                 type: number
 *               insuranceNumber:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [Active, Inactive, Maintenance, Retired]
 *               rcDocument:
 *                 type: string
 *                 format: binary
 *                 description: RC document
 *               pollutionCertificate:
 *                 type: string
 *                 format: binary
 *                 description: Pollution certificate
 *               insuranceCertificate:
 *                 type: string
 *                 format: binary
 *                 description: Insurance certificate
 *               frontImage:
 *                 type: string
 *                 format: binary
 *                 description: Front view image
 *               rearImage:
 *                 type: string
 *                 format: binary
 *                 description: Rear view image
 *               leftImage:
 *                 type: string
 *                 format: binary
 *                 description: Left side image
 *               rightImage:
 *                 type: string
 *                 format: binary
 *                 description: Right side image
 *     responses:
 *       200:
 *         description: Bus updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Bus'
 *       404:
 *         description: Bus not found
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
  uploadFields([
    { name: "rcDocument", maxCount: 1 },
    { name: "pollutionCertificate", maxCount: 1 },
    { name: "insuranceCertificate", maxCount: 1 },
    { name: "frontImage", maxCount: 1 },
    { name: "rearImage", maxCount: 1 },
    { name: "leftImage", maxCount: 1 },
    { name: "rightImage", maxCount: 1 },
  ]),
  validateObjectId,
  async (req, res) => {
    try {
      const busId = req.params.id;
      const updateData = req.body;

      const existingBus = await Bus.findById(busId).lean();
      if (!existingBus) {
        return errorResponse(res, 404, "Bus not found");
      }

      // Remove fields that shouldn't be updated directly
      const fieldsToExclude = [
        "_id",
        "id",
        "createdAt",
        "updatedAt",
        "__v",
        "assignedTrips",
        "maintenanceHistory",
        "documentStatus", // Virtual field, shouldn't be updated
        "lastMaintenanceDate",
        "nextMaintenanceDate",
      ];

      fieldsToExclude.forEach((field) => delete updateData[field]);

      // Parse seatLayout if provided as JSON string
      if (updateData.seatLayout && typeof updateData.seatLayout === "string") {
        try {
          updateData.seatLayout = JSON.parse(updateData.seatLayout);
        } catch (error) {
          return errorResponse(
            res,
            400,
            "Invalid seatLayout format. Must be valid JSON."
          );
        }
      }

      // Validate and update seatLayout if provided
      if (updateData.seatLayout) {
        if (!updateData.seatLayout.rows || !updateData.seatLayout.columns) {
          return errorResponse(
            res,
            400,
            "Seat layout must have rows and columns"
          );
        }
        if (updateData.seatLayout.totalSeats) {
          updateData.seatCapacity = updateData.seatLayout.totalSeats;
        }
      }

      // Handle file uploads and document clearing
      if (req.files) {
        if (req.files.rcDocument) {
          updateData.rcDocument = '/uploads/' + req.files.rcDocument[0].filename;
        }
        if (req.files.pollutionCertificate) {
          updateData.pollutionCertificate = '/uploads/' + req.files.pollutionCertificate[0].filename;
        }
        if (req.files.insuranceCertificate) {
          updateData.insuranceCertificate = '/uploads/' + req.files.insuranceCertificate[0].filename;
        }

        // Handle bus images - only update images that are being uploaded
        // This preserves existing images for fields where no new file is uploaded
        if (
          req.files.frontImage ||
          req.files.rearImage ||
          req.files.leftImage ||
          req.files.rightImage
        ) {
          // Get existing bus to preserve images that aren't being updated
          const busImages = existingBus?.busImages || {};

          // Update only the images that are being uploaded
          if (req.files.frontImage) {
            busImages.front = '/uploads/' + req.files.frontImage[0].filename;
          }
          if (req.files.rearImage) {
            busImages.rear = '/uploads/' + req.files.rearImage[0].filename;
          }
          if (req.files.leftImage) {
            busImages.left = '/uploads/' + req.files.leftImage[0].filename;
          }
          if (req.files.rightImage) {
            busImages.right = '/uploads/' + req.files.rightImage[0].filename;
          }

          updateData.busImages = busImages;
        }
      }

      // Handle document clearing (empty strings from form data)
      // Get existing bus to check current document status

      // Check if any required documents are being cleared without replacement
      if (
        updateData.rcDocument === "" &&
        existingBus.rcDocument &&
        !req.files?.rcDocument
      ) {
        return errorResponse(
          res,
          400,
          "RC Document cannot be removed without replacement"
        );
      }
      if (
        updateData.pollutionCertificate === "" &&
        existingBus.pollutionCertificate &&
        !req.files?.pollutionCertificate
      ) {
        return errorResponse(
          res,
          400,
          "Pollution Certificate cannot be removed without replacement"
        );
      }
      if (
        updateData.insuranceCertificate === "" &&
        existingBus.insuranceCertificate &&
        !req.files?.insuranceCertificate
      ) {
        return errorResponse(
          res,
          400,
          "Insurance Certificate cannot be removed without replacement"
        );
      }

      // Clear documents if requested
      if (updateData.rcDocument === "") {
        updateData.rcDocument = null;
      }
      if (updateData.pollutionCertificate === "") {
        updateData.pollutionCertificate = null;
      }
      if (updateData.insuranceCertificate === "") {
        updateData.insuranceCertificate = null;
      }

      // Handle bus image clearing (empty strings from form data)
      const needsImageUpdate =
        updateData.frontImage === "" ||
        updateData.rearImage === "" ||
        updateData.leftImage === "" ||
        updateData.rightImage === "";

      if (needsImageUpdate) {
        // Use already updated busImages if present, otherwise existing ones
        const busImages = updateData.busImages || existingBus?.busImages || {};

        if (updateData.frontImage === "") {
          busImages.front = null;
        }
        if (updateData.rearImage === "") {
          busImages.rear = null;
        }
        if (updateData.leftImage === "") {
          busImages.left = null;
        }
        if (updateData.rightImage === "") {
          busImages.right = null;
        }

        updateData.busImages = busImages;
      }

      // Remove individual image fields from updateData as they're handled above
      delete updateData.frontImage;
      delete updateData.rearImage;
      delete updateData.leftImage;
      delete updateData.rightImage;

      // Remove busImages from updateData if it was sent as form data string (not from file uploads)
      // This prevents accidental overwrites from form data
      if (updateData.busImages && typeof updateData.busImages === "string") {
        delete updateData.busImages;
      }

      const bus = await Bus.findByIdAndUpdate(busId, updateData, {
        new: true,
        runValidators: true,
      });

      if (!bus) {
        return errorResponse(res, 404, "Bus not found");
      }

      successResponse(res, 200, "Bus updated successfully", bus);
    } catch (error) {
      console.error("Update bus error:", error);
      errorResponse(res, 500, "Failed to update bus", error.message);
    }
  }
);

/*
 * @swagger
 * /api/buses/{id}:
 *   delete:
 *     summary: Delete bus (Admin only)
 *     tags: [Buses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Bus ID
 *     responses:
 *       200:
 *         description: Bus deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       404:
 *         description: Bus not found
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
      const bus = await Bus.findByIdAndDelete(req.params.id);

      if (!bus) {
        return errorResponse(res, 404, "Bus not found");
      }

      successResponse(res, 200, "Bus deleted successfully");
    } catch (error) {
      console.error("Delete bus error:", error);
      errorResponse(res, 500, "Failed to delete bus", error.message);
    }
  }
);

/*
 * @swagger
 * /api/buses/{id}/trips:
 *   get:
 *     summary: Get bus assigned trips
 *     tags: [Buses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Bus ID
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
 *         description: Number of trips per page
 *     responses:
 *       200:
 *         description: Bus trips retrieved successfully
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
 *       404:
 *         description: Bus not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get(
  "/:id/trips",
  authenticateToken,
  validateObjectId,
  async (req, res) => {
    try {
      const bus = await Bus.findById(req.params.id).populate({
        path: "assignedTrips",
        populate: [{ path: "routeId", select: "name startPoint" }],
      });

      if (!bus) {
        return errorResponse(res, 404, "Bus not found");
      }

      successResponse(
        res,
        200,
        "Bus trips retrieved successfully",
        bus.assignedTrips
      );
    } catch (error) {
      console.error("Get bus trips error:", error);
      errorResponse(res, 500, "Failed to retrieve bus trips", error.message);
    }
  }
);

/*
 * @swagger
 * /api/buses/{id}/status:
 *   put:
 *     summary: Update bus status (Admin only)
 *     tags: [Buses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Bus ID
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
 *                 enum: [Active, Inactive, Maintenance, Retired]
 *                 example: "Active"
 *     responses:
 *       200:
 *         description: Bus status updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Bus'
 *       404:
 *         description: Bus not found
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

      if (!["Active", "Inactive", "Maintenance", "Retired"].includes(status)) {
        return errorResponse(res, 400, "Invalid status");
      }

      const bus = await Bus.findByIdAndUpdate(
        req.params.id,
        { status },
        { new: true }
      );

      if (!bus) {
        return errorResponse(res, 404, "Bus not found");
      }

      successResponse(res, 200, "Bus status updated successfully", bus);
    } catch (error) {
      console.error("Update bus status error:", error);
      errorResponse(res, 500, "Failed to update bus status", error.message);
    }
  }
);

/*
 * @swagger
 * /api/buses/{id}/maintenance:
 *   post:
 *     summary: Add maintenance record (Admin only)
 *     tags: [Buses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Bus ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - type
 *               - description
 *               - cost
 *             properties:
 *               type:
 *                 type: string
 *                 example: "Regular Service"
 *               description:
 *                 type: string
 *                 example: "Oil change and filter replacement"
 *               cost:
 *                 type: number
 *                 example: 5000
 *               date:
 *                 type: string
 *                 format: date
 *                 example: "2024-03-15"
 *               nextServiceDate:
 *                 type: string
 *                 format: date
 *                 example: "2024-06-15"
 *               notes:
 *                 type: string
 *                 example: "All systems functioning properly"
 *     responses:
 *       201:
 *         description: Maintenance record added successfully
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
 *                         maintenance:
 *                           type: object
 *                         bus:
 *                           $ref: '#/components/schemas/Bus'
 *       404:
 *         description: Bus not found
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
  "/:id/maintenance",
  authenticateToken,
  requireAdmin,
  validateObjectId,
  async (req, res) => {
    try {
      const { description, cost, nextMaintenanceDate } = req.body;

      if (!description) {
        return errorResponse(res, 400, "Maintenance description is required");
      }

      const maintenanceRecord = {
        date: new Date(),
        description,
        cost: cost || 0,
        nextMaintenanceDate: nextMaintenanceDate
          ? new Date(nextMaintenanceDate)
          : null,
      };

      const bus = await Bus.findByIdAndUpdate(
        req.params.id,
        {
          $push: { maintenanceHistory: maintenanceRecord },
          lastMaintenanceDate: maintenanceRecord.date,
          nextMaintenanceDate: maintenanceRecord.nextMaintenanceDate,
        },
        { new: true }
      );

      if (!bus) {
        return errorResponse(res, 404, "Bus not found");
      }

      successResponse(res, 200, "Maintenance record added successfully", bus);
    } catch (error) {
      console.error("Add maintenance error:", error);
      errorResponse(
        res,
        500,
        "Failed to add maintenance record",
        error.message
      );
    }
  }
);

/*
 * @swagger
 * /api/buses/stats/overview:
 *   get:
 *     summary: Get bus statistics (Admin only)
 *     tags: [Buses]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Bus statistics retrieved successfully
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
 *                         busArchitectureStats:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               _id:
 *                                 type: string
 *                               count:
 *                                 type: integer
 *                         capacityStats:
 *                           type: object
 *                           properties:
 *                             totalCapacity:
 *                               type: integer
 *                             avgCapacity:
 *                               type: number
 *                             maxCapacity:
 *                               type: integer
 *                             minCapacity:
 *                               type: integer
 *                         maintenanceStats:
 *                           type: object
 *                           properties:
 *                             totalMaintenance:
 *                               type: integer
 *                             avgMaintenanceCost:
 *                               type: number
 *                             pendingMaintenance:
 *                               type: integer
 *                         topBuses:
 *                           type: array
 *                           items:
 *                             type: object
 *                         recentBuses:
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
      const totalBuses = await Bus.countDocuments();
      const activeBuses = await Bus.countDocuments({ status: "Active" });
      const maintenanceBuses = await Bus.countDocuments({
        status: "Maintenance",
      });

      const architectureStats = await Bus.aggregate([
        {
          $group: {
            _id: "$seatArchitecture",
            count: { $sum: 1 },
            avgCapacity: { $avg: "$seatCapacity" },
          },
        },
      ]);

      const statusStats = await Bus.aggregate([
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
          },
        },
      ]);

      const capacityStats = await Bus.aggregate([
        {
          $group: {
            _id: null,
            totalCapacity: { $sum: "$seatCapacity" },
            avgCapacity: { $avg: "$seatCapacity" },
            maxCapacity: { $max: "$seatCapacity" },
            minCapacity: { $min: "$seatCapacity" },
          },
        },
      ]);

      successResponse(res, 200, "Bus statistics retrieved successfully", {
        totalBuses,
        activeBuses,
        maintenanceBuses,
        architectureStats,
        statusStats,
        capacityStats: capacityStats[0] || {},
      });
    } catch (error) {
      console.error("Get bus stats error:", error);
      errorResponse(
        res,
        500,
        "Failed to retrieve bus statistics",
        error.message
      );
    }
  }
);

module.exports = router;
