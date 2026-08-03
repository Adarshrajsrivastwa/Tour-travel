const express = require("express");
const Driver = require("../models/Driver");
const fs = require("fs");
const path = require("path");
const {
  successResponse,
  errorResponse,
  paginatedResponse,
} = require("../utils/response");
const { authenticateToken, requireAdmin } = require("../middleware/auth");
const {
  validateDriver,
  validateObjectId,
  validatePagination,
} = require("../middleware/validation");
const { uploadFields } = require("../middleware/upload");

const router = express.Router();

/**
 * @swagger
 * /api/drivers/public/list:
 *   get:
 *     summary: Get list of all drivers and conductors (name, role, experience)
 *     tags: [Drivers]
 *     description: Get a simplified list of all drivers and conductors for display in the app (requires authentication)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of drivers and conductors retrieved successfully
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
 *                           name:
 *                             type: string
 *                             example: "John Doe"
 *                           role:
 *                             type: string
 *                             enum: [Driver, Conductor]
 *                             example: "Driver"
 *                           experience:
 *                             type: number
 *                             example: 5
 *                           profileImage:
 *                             type: string
 *                             nullable: true
 *                             description: "Profile image URL or path"
 *                             example: "uploads/profileImage-1234567890.png"
 *       401:
 *         description: Unauthorized - Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get("/public/list", authenticateToken, async (req, res) => {
  try {
    const Rating = require("../models/Rating");
    const OnboardSchedule = require("../models/OnboardSchedule");

    console.log(
      "🔍 [DRIVERS PUBLIC LIST] Starting driver listing with ratings..."
    );

    // Get all active drivers and conductors with their average ratings
    const drivers = await Driver.find({ status: "Active", isActive: true })
      .select("_id fullName jobTitle yearsOfExperience profileImage")
      .sort({ fullName: 1 });

    console.log(
      `📋 [DRIVERS PUBLIC LIST] Found ${drivers.length} active drivers/conductors`
    );
    drivers.forEach((d) => {
      console.log(`   - ${d.fullName} (${d._id}) - ${d.jobTitle}`);
    });

    const driverIds = drivers.map((d) => d._id);

    // Alternative approach: Get all ratings and map to drivers
    const allRatings = await Rating.find({
      isActive: true,
    }).lean();

    console.log(`⭐ [DRIVERS PUBLIC LIST] Found ${allRatings.length} ratings`);
    allRatings.forEach((r) => {
      console.log(`   - Rating: ${r.rating}/5 for schedule ${r.scheduleId}`);
    });

    // Get schedule IDs from ratings
    const scheduleIds = allRatings.map((r) => r.scheduleId);
    console.log(
      `📅 [DRIVERS PUBLIC LIST] Schedule IDs from ratings: ${scheduleIds.length}`
    );

    // Get all schedules with their assigned teams
    const schedules = await OnboardSchedule.find({
      _id: { $in: scheduleIds },
    })
      .select("_id assignedTeam")
      .lean();

    console.log(`🚌 [DRIVERS PUBLIC LIST] Found ${schedules.length} schedules`);
    schedules.forEach((schedule) => {
      console.log(`   - Schedule ${schedule._id}:`);
      if (schedule.assignedTeam && schedule.assignedTeam.length > 0) {
        schedule.assignedTeam.forEach((member) => {
          console.log(
            `     • ${member.name} (ID: ${member.id}) - ${member.role}`
          );
        });
      } else {
        console.log(`     • No assigned team`);
      }
    });

    // Create a map of schedule to team members
    const scheduleTeamMap = {};
    schedules.forEach((schedule) => {
      scheduleTeamMap[schedule._id.toString()] = schedule.assignedTeam || [];
    });

    console.log(
      `🗺️  [DRIVERS PUBLIC LIST] Created schedule team map with ${
        Object.keys(scheduleTeamMap).length
      } schedules`
    );

    // Create driver rating map
    const ratingMap = {};
    allRatings.forEach((rating) => {
      const teamMembers = scheduleTeamMap[rating.scheduleId.toString()] || [];

      console.log(
        `   Processing rating for schedule ${rating.scheduleId}, found ${teamMembers.length} team members`
      );

      // Add this rating to each team member
      teamMembers.forEach((member) => {
        const driverId = member.id.toString();
        console.log(
          `     → Adding rating ${rating.rating} to ${member.name} (${driverId})`
        );

        if (!ratingMap[driverId]) {
          ratingMap[driverId] = {
            ratings: [],
            totalRatings: 0,
          };
        }
        ratingMap[driverId].ratings.push(rating.rating);
        ratingMap[driverId].totalRatings += 1;
      });
    });

    console.log(
      `📊 [DRIVERS PUBLIC LIST] Final rating map keys: ${
        Object.keys(ratingMap).length
      }`
    );
    Object.keys(ratingMap).forEach((driverId) => {
      console.log(
        `   - ${driverId}: ${
          ratingMap[driverId].ratings.length
        } ratings = [${ratingMap[driverId].ratings.join(", ")}]`
      );
    });

    // Calculate averages
    const finalRatingMap = {};
    Object.keys(ratingMap).forEach((driverId) => {
      const data = ratingMap[driverId];
      const avgRating =
        data.ratings.length > 0
          ? parseFloat(
              (
                data.ratings.reduce((a, b) => a + b, 0) / data.ratings.length
              ).toFixed(2)
            )
          : 0;
      finalRatingMap[driverId] = {
        avgRating,
        totalRatings: data.totalRatings,
      };
      console.log(
        `   - ${driverId}: Average = ${avgRating}, Total = ${data.totalRatings}`
      );
    });

    // Transform to match the requested format with ratings
    const formattedData = drivers.map((driver) => ({
      _id: driver._id,
      name: driver.fullName,
      role: driver.jobTitle,
      experience: driver.yearsOfExperience,
      profileImage: driver.profileImage || null,
      averageRating: finalRatingMap[driver._id.toString()]?.avgRating || 0,
      totalRatings: finalRatingMap[driver._id.toString()]?.totalRatings || 0,
    }));

    console.log(
      `✅ [DRIVERS PUBLIC LIST] Returning ${formattedData.length} drivers with ratings`
    );

    successResponse(
      res,
      200,
      "Drivers and conductors retrieved successfully",
      formattedData
    );
  } catch (error) {
    console.error("Get public drivers list error:", error);
    errorResponse(
      res,
      500,
      "Failed to retrieve drivers and conductors",
      error.message
    );
  }
});

// Helper function to delete old files
const deleteOldFile = (filePath) => {
  if (!filePath || filePath.startsWith("http")) {
    return; // Skip Cloudinary URLs or empty paths
  }

  try {
    const fullPath = path.join(__dirname, "..", "..", filePath);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
      console.log(`🗑️ Deleted old file: ${filePath}`);
    }
  } catch (error) {
    console.log(`⚠️ Could not delete old file ${filePath}:`, error.message);
  }
};

/*
 * @swagger
 * /api/drivers:
 *   get:
 *     summary: Get all drivers
 *     tags: [Drivers]
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
 *         description: Number of drivers per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term for name, mobile, or email
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [all, Driver, Conductor]
 *           default: all
 *         description: Filter by job role
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [all, Active, Inactive, Suspended]
 *           default: all
 *         description: Filter by status
 *     responses:
 *       200:
 *         description: Drivers retrieved successfully
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
 *                         $ref: '#/components/schemas/Driver'
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
    const role = req.query.role || "all";
    const status = req.query.status || "all";

    // Build search query
    const searchQuery = {};

    if (search) {
      searchQuery.$or = [
        { fullName: { $regex: search, $options: "i" } },
        { mobile: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    if (role !== "all") {
      searchQuery.jobTitle = role;
    }

    if (status !== "all") {
      searchQuery.status = status;
    }

    // Get drivers with pagination
    const drivers = await Driver.find(searchQuery)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Driver.countDocuments(searchQuery);

    paginatedResponse(res, 200, "Drivers retrieved successfully", drivers, {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Get drivers error:", error);
    errorResponse(res, 500, "Failed to retrieve drivers", error.message);
  }
});

/*
 * @swagger
 * /api/drivers/{id}:
 *   get:
 *     summary: Get driver by ID
 *     tags: [Drivers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Driver ID
 *     responses:
 *       200:
 *         description: Driver retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Driver'
 *       404:
 *         description: Driver not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get("/:id", authenticateToken, validateObjectId, async (req, res) => {
  try {
    const driver = await Driver.findById(req.params.id);

    if (!driver) {
      return errorResponse(res, 404, "Driver not found");
    }

    successResponse(res, 200, "Driver retrieved successfully", driver);
  } catch (error) {
    console.error("Get driver error:", error);
    errorResponse(res, 500, "Failed to retrieve driver", error.message);
  }
});

/*
 * @swagger
 * /api/drivers:
 *   post:
 *     summary: Create new driver (Admin only)
 *     tags: [Drivers]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - jobTitle
 *               - fullName
 *               - mobile
 *               - email
 *               - aadharNumber
 *               - panNumber
 *             properties:
 *               jobTitle:
 *                 type: string
 *                 enum: [Driver, Conductor]
 *                 example: "Driver"
 *               fullName:
 *                 type: string
 *                 example: "John Doe"
 *               mobile:
 *                 type: string
 *                 example: "+919876543210"
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "john@example.com"
 *               aadharNumber:
 *                 type: string
 *                 example: "123456789012"
 *               panNumber:
 *                 type: string
 *                 example: "ABCDE1234F"
 *               yearsOfExperience:
 *                 type: number
 *                 example: 5
 *               aadharFront:
 *                 type: string
 *                 format: binary
 *                 description: Aadhar card front image
 *               aadharBack:
 *                 type: string
 *                 format: binary
 *                 description: Aadhar card back image
 *               panCard:
 *                 type: string
 *                 format: binary
 *                 description: PAN card image
 *               drivingLicense:
 *                 type: string
 *                 format: binary
 *                 description: Driving license image
 *               profileImage:
 *                 type: string
 *                 format: binary
 *                 description: Profile image
 *     responses:
 *       201:
 *         description: Driver created successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Driver'
 *       400:
 *         description: Validation error or driver already exists
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
  (req, res, next) => {
    console.log("🔥 ===== POST /api/drivers HIT =====");
    console.log("📅 Timestamp:", new Date().toISOString());
    console.log("🔍 Request method:", req.method);
    console.log("🌐 Request URL:", req.url);
    console.log("📋 Request headers:", JSON.stringify(req.headers, null, 2));
    next();
  },
  authenticateToken,
  requireAdmin,
  uploadFields([
    { name: "aadharFront", maxCount: 1 },
    { name: "aadharBack", maxCount: 1 },
    { name: "panCard", maxCount: 1 },
    { name: "drivingLicense", maxCount: 1 },
    { name: "profileImage", maxCount: 1 },
  ]),
  validateDriver,
  async (req, res) => {
    try {
      console.log("=============================================");
      console.log("🟢 [POST] /api/drivers — Create Driver Called");
      console.log("=============================================\n");

      console.log("🔍 Request Headers:");
      console.log(JSON.stringify(req.headers, null, 2));

      console.log("\n📝 Request Body (raw):");
      console.log(JSON.stringify(req.body, null, 2));

      console.log("\n📂 Uploaded Files:");
      if (req.files) {
        Object.keys(req.files).forEach((key) => {
          console.log(
            `  - ${key}:`,
            req.files[key].map((file) => ({
              fieldname: file.fieldname,
              originalname: file.originalname,
              mimetype: file.mimetype,
              size: file.size,
              path: `${req.protocol}://${req.get("host")}/uploads/` + file.filename,
            }))
          );
        });
      } else {
        console.log("  - No files uploaded");
      }

      console.log("\n🔧 Validation Results:");
      console.log("  - Validation passed:", !req.validationErrors);
      if (req.validationErrors) {
        console.log("  - Validation errors:", req.validationErrors);
      }

      const driverData = { ...req.body };
      console.log("\n📋 Initial driver data from body:");
      console.log(JSON.stringify(driverData, null, 2));

      // Handle file uploads
      if (req.files) {
        console.log("\n📎 Processing file uploads:");
        if (req.files.aadharFront) {
          driverData.aadharFront = `${req.protocol}://${req.get("host")}/uploads/` + req.files.aadharFront[0].filename;
          console.log("  ✅ aadharFront uploaded:", driverData.aadharFront);
        }
        if (req.files.aadharBack) {
          driverData.aadharBack = `${req.protocol}://${req.get("host")}/uploads/` + req.files.aadharBack[0].filename;
          console.log("  ✅ aadharBack uploaded:", driverData.aadharBack);
        }
        if (req.files.panCard) {
          driverData.panCard = `${req.protocol}://${req.get("host")}/uploads/` + req.files.panCard[0].filename;
          console.log("  ✅ panCard uploaded:", driverData.panCard);
        }
        if (req.files.drivingLicense) {
          driverData.drivingLicense = `${req.protocol}://${req.get("host")}/uploads/` + req.files.drivingLicense[0].filename;
          console.log(
            "  ✅ drivingLicense uploaded:",
            driverData.drivingLicense
          );
        }
        if (req.files.profileImage) {
          driverData.profileImage = `${req.protocol}://${req.get("host")}/uploads/` + req.files.profileImage[0].filename;
          console.log("  ✅ profileImage uploaded:", driverData.profileImage);
        }
      }

      console.log("\n🧩 Final Driver Data After File Processing:");
      console.log(JSON.stringify(driverData, null, 2));

      // Restructure bank account fields for Mongoose model
      console.log("\n🏦 Restructuring bank account fields:");
      if (
        driverData.accountNumber ||
        driverData.ifscCode ||
        driverData.bankName
      ) {
        driverData.bankAccount = {
          accountNumber: driverData.accountNumber,
          ifscCode: driverData.ifscCode,
          bankName: driverData.bankName,
        };

        // Remove the individual fields
        delete driverData.accountNumber;
        delete driverData.ifscCode;
        delete driverData.bankName;

        console.log(
          "  ✅ Bank account restructured:",
          JSON.stringify(driverData.bankAccount, null, 2)
        );
      }

      console.log("\n📋 Final driver data after restructuring:");
      console.log(JSON.stringify(driverData, null, 2));

      // Clean up invalid or empty fields that could cause CastErrors
      console.log("\n🧹 Cleaning up invalid fields:");

      // Remove empty assignedTrips array or invalid values
      if (driverData.assignedTrips) {
        if (Array.isArray(driverData.assignedTrips)) {
          // Filter out empty strings and invalid values
          driverData.assignedTrips = driverData.assignedTrips.filter(
            (trip) => trip && trip !== "" && trip !== null && trip !== undefined
          );
          // If array is empty after filtering, remove the field
          if (driverData.assignedTrips.length === 0) {
            delete driverData.assignedTrips;
            console.log("  ✅ Removed empty assignedTrips array");
          } else {
            console.log(
              "  ✅ Cleaned assignedTrips array:",
              driverData.assignedTrips
            );
          }
        } else if (
          driverData.assignedTrips === "" ||
          driverData.assignedTrips === null
        ) {
          delete driverData.assignedTrips;
          console.log("  ✅ Removed invalid assignedTrips value");
        }
      }

      // Remove other potentially problematic fields
      const fieldsToClean = ["assignedBuses", "assignedRoutes", "bookings"];
      fieldsToClean.forEach((field) => {
        if (
          driverData[field] === "" ||
          driverData[field] === null ||
          driverData[field] === undefined
        ) {
          delete driverData[field];
          console.log(`  ✅ Removed invalid ${field} value`);
        }
      });

      // Clean up any other array fields that might contain empty strings
      Object.keys(driverData).forEach((key) => {
        if (Array.isArray(driverData[key])) {
          const originalLength = driverData[key].length;
          driverData[key] = driverData[key].filter(
            (item) => item && item !== "" && item !== null && item !== undefined
          );
          if (driverData[key].length === 0) {
            delete driverData[key];
            console.log(`  ✅ Removed empty array field: ${key}`);
          } else if (driverData[key].length !== originalLength) {
            console.log(
              `  ✅ Cleaned array field ${key}: ${originalLength} -> ${driverData[key].length} items`
            );
          }
        }
      });

      // Validate required fields
      console.log("\n🔍 Validating required fields:");
      const requiredFields = [
        "jobTitle",
        "fullName",
        "mobile",
        "email",
        "dateOfBirth",
        "permanentAddress",
        "aadharNumber",
        "panNumber",
        "yearsOfExperience",
      ];
      const missingFields = [];

      requiredFields.forEach((field) => {
        if (!driverData[field] || driverData[field].toString().trim() === "") {
          missingFields.push(field);
          console.log(`  ❌ Missing required field: ${field}`);
        } else {
          console.log(`  ✅ Field present: ${field} = "${driverData[field]}"`);
        }
      });

      // Check bank account fields
      if (
        !driverData.bankAccount ||
        !driverData.bankAccount.accountNumber ||
        !driverData.bankAccount.ifscCode ||
        !driverData.bankAccount.bankName
      ) {
        missingFields.push("bankAccount (accountNumber, ifscCode, bankName)");
        console.log(`  ❌ Missing bank account fields`);
      } else {
        console.log(`  ✅ Bank account fields present`);
      }

      if (missingFields.length > 0) {
        console.log(
          `\n❌ Missing required fields: ${missingFields.join(", ")}`
        );
        return errorResponse(
          res,
          400,
          `Missing required fields: ${missingFields.join(", ")}`
        );
      }

      // Check if driver already exists
      console.log("\n🔍 Checking for duplicate drivers:");
      console.log("  - Mobile:", driverData.mobile);
      console.log("  - Email:", driverData.email);
      console.log("  - Aadhar:", driverData.aadharNumber);
      console.log("  - PAN:", driverData.panNumber);

      const existingDriver = await Driver.findOne({
        $or: [
          { mobile: driverData.mobile },
          { email: driverData.email },
          { aadharNumber: driverData.aadharNumber },
          { panNumber: driverData.panNumber },
        ],
      });

      if (existingDriver) {
        console.log("⚠️ Duplicate driver found:");
        console.log(JSON.stringify(existingDriver, null, 2));
        return errorResponse(
          res,
          400,
          "Driver already exists with this information"
        );
      } else {
        console.log("✅ No duplicate driver found, proceeding with creation");
      }

      console.log("\n💾 Creating new Driver instance:");
      const driver = new Driver(driverData);
      console.log("Driver instance created:", JSON.stringify(driver, null, 2));

      console.log("\n🔄 Saving driver to database...");
      const savedDriver = await driver.save();
      console.log("✅ Driver successfully saved to DB:");
      console.log(JSON.stringify(savedDriver, null, 2));

      console.log("\n📤 Sending success response...");
      successResponse(res, 201, "Driver created successfully", savedDriver);
      console.log("=============================================\n");
    } catch (error) {
      console.error("\n❌ ===== DRIVER CREATION ERROR =====");
      console.error("🚨 Error type:", error.constructor.name);
      console.error("📝 Error message:", error.message);
      console.error("📊 Error code:", error.code);
      console.error("🔍 Error name:", error.name);
      console.error("📄 Stack trace:", error.stack);

      if (error.errors) {
        console.error(
          "🔧 Validation errors:",
          JSON.stringify(error.errors, null, 2)
        );
      }

      if (error.code === 11000) {
        console.error("🔑 Duplicate key error detected");
        const duplicateField = Object.keys(error.keyPattern)[0];
        console.error("🔑 Duplicate field:", duplicateField);
        console.error("🔑 Duplicate value:", error.keyValue[duplicateField]);
      }

      console.error("❌ ===== END ERROR LOGGING =====");

      // Determine appropriate error response
      let statusCode = 500;
      let message = "Failed to create driver";

      if (error.name === "ValidationError") {
        statusCode = 400;
        message = "Validation failed";
      } else if (error.code === 11000) {
        statusCode = 400;
        message = "Driver already exists with this information";
      }

      errorResponse(res, statusCode, message, error.message);
    }
  }
);

/*
 * @swagger
 * /api/drivers/{id}:
 *   put:
 *     summary: Update driver (Admin only)
 *     tags: [Drivers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Driver ID
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               jobTitle:
 *                 type: string
 *                 enum: [Driver, Conductor]
 *               fullName:
 *                 type: string
 *               mobile:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               yearsOfExperience:
 *                 type: number
 *               status:
 *                 type: string
 *                 enum: [Active, Inactive, Suspended]
 *               aadharFront:
 *                 type: string
 *                 format: binary
 *                 description: Aadhar card front image
 *               aadharBack:
 *                 type: string
 *                 format: binary
 *                 description: Aadhar card back image
 *               panCard:
 *                 type: string
 *                 format: binary
 *                 description: PAN card image
 *               drivingLicense:
 *                 type: string
 *                 format: binary
 *                 description: Driving license image
 *               profileImage:
 *                 type: string
 *                 format: binary
 *                 description: Profile image
 *     responses:
 *       200:
 *         description: Driver updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Driver'
 *       404:
 *         description: Driver not found
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
  uploadFields([
    { name: "aadharFront", maxCount: 1 },
    { name: "aadharBack", maxCount: 1 },
    { name: "panCard", maxCount: 1 },
    { name: "drivingLicense", maxCount: 1 },
    { name: "profileImage", maxCount: 1 },
  ]),
  validateDriver,
  async (req, res) => {
    try {
      console.log("=============================================");
      console.log("🔄 [PUT] /api/drivers/:id — Update Driver Called");
      console.log("=============================================\n");

      const driverId = req.params.id;
      console.log("🔍 Driver ID:", driverId);

      console.log("📝 Request Body (raw):");
      console.log(JSON.stringify(req.body, null, 2));

      console.log("\n📂 Uploaded Files:");
      if (req.files) {
        Object.keys(req.files).forEach((key) => {
          console.log(
            `  - ${key}:`,
            req.files[key].map((file) => ({
              fieldname: file.fieldname,
              originalname: file.originalname,
              mimetype: file.mimetype,
              size: file.size,
              path: `${req.protocol}://${req.get("host")}/uploads/` + file.filename,
            }))
          );
        });
      } else {
        console.log("  - No files uploaded");
      }

      const updateData = { ...req.body };

      // Get existing driver data to check for old files
      const existingDriver = await Driver.findById(driverId);
      if (!existingDriver) {
        console.log("❌ Driver not found with ID:", driverId);
        return errorResponse(res, 404, "Driver not found");
      }

      console.log("\n📎 Processing file uploads:");
      console.log("🔍 Existing driver files:", {
        aadharFront: existingDriver.aadharFront,
        aadharBack: existingDriver.aadharBack,
        panCard: existingDriver.panCard,
        drivingLicense: existingDriver.drivingLicense,
        profileImage: existingDriver.profileImage,
      });

      // Handle file uploads and removals
      const fileFields = [
        "aadharFront",
        "aadharBack",
        "panCard",
        "drivingLicense",
        "profileImage",
      ];

      fileFields.forEach((field) => {
        if (req.files && req.files[field]) {
          // New file uploaded - delete old file and set new path
          if (
            existingDriver[field] &&
            !existingDriver[field].startsWith("http")
          ) {
            deleteOldFile(existingDriver[field]);
          }
          updateData[field] = '/uploads/' + req.files[field][0].filename;
          console.log(`  ✅ ${field} uploaded:`, updateData[field]);
        } else if (updateData[field] === "") {
          // File was removed by user - delete old file and set to null
          if (
            existingDriver[field] &&
            !existingDriver[field].startsWith("http")
          ) {
            deleteOldFile(existingDriver[field]);
          }
          updateData[field] = null;
          console.log(`  🗑️ ${field} removed by user`);
        }
      });

      // Restructure bank account fields for Mongoose model
      if (
        updateData.accountNumber ||
        updateData.ifscCode ||
        updateData.bankName
      ) {
        console.log("\n🏦 Restructuring bank account fields:");
        updateData.bankAccount = {
          accountNumber: updateData.accountNumber,
          ifscCode: updateData.ifscCode,
          bankName: updateData.bankName,
        };

        // Remove the individual fields
        delete updateData.accountNumber;
        delete updateData.ifscCode;
        delete updateData.bankName;

        console.log(
          "  ✅ Bank account restructured:",
          JSON.stringify(updateData.bankAccount, null, 2)
        );
      }

      // Convert years of experience to number
      if (updateData.yearsOfExperience) {
        updateData.yearsOfExperience =
          parseInt(updateData.yearsOfExperience) || 0;
        console.log(
          "🔢 Converting yearsOfExperience:",
          updateData.yearsOfExperience
        );
      }

      // Remove fields that shouldn't be updated directly
      delete updateData._id;
      delete updateData.createdAt;
      delete updateData.updatedAt;

      // Clean up invalid or empty fields that could cause CastErrors
      console.log("\n🧹 Cleaning up invalid fields:");

      // Handle assignedTrips field - it might come as a string representation
      if (updateData.assignedTrips !== undefined) {
        console.log(
          "🔍 Processing assignedTrips:",
          updateData.assignedTrips,
          "type:",
          typeof updateData.assignedTrips
        );

        if (typeof updateData.assignedTrips === "string") {
          // Try to parse if it's a string representation of an array
          try {
            const parsed = JSON.parse(updateData.assignedTrips);
            if (Array.isArray(parsed)) {
              updateData.assignedTrips = parsed;
              console.log(
                "  ✅ Parsed assignedTrips from string:",
                updateData.assignedTrips
              );
            } else {
              delete updateData.assignedTrips;
              console.log("  ✅ Removed invalid assignedTrips string");
            }
          } catch (e) {
            // If it's not valid JSON, remove it
            delete updateData.assignedTrips;
            console.log("  ✅ Removed invalid assignedTrips string (not JSON)");
          }
        }

        if (Array.isArray(updateData.assignedTrips)) {
          // Filter out empty strings and invalid values
          updateData.assignedTrips = updateData.assignedTrips.filter(
            (trip) => trip && trip !== "" && trip !== null && trip !== undefined
          );
          // If array is empty after filtering, remove the field
          if (updateData.assignedTrips.length === 0) {
            delete updateData.assignedTrips;
            console.log("  ✅ Removed empty assignedTrips array");
          } else {
            console.log(
              "  ✅ Cleaned assignedTrips array:",
              updateData.assignedTrips
            );
          }
        } else if (
          updateData.assignedTrips === "" ||
          updateData.assignedTrips === null
        ) {
          delete updateData.assignedTrips;
          console.log("  ✅ Removed invalid assignedTrips value");
        }
      }

      // Remove other potentially problematic fields
      const fieldsToClean = ["assignedBuses", "assignedRoutes", "bookings"];
      fieldsToClean.forEach((field) => {
        if (
          updateData[field] === "" ||
          updateData[field] === null ||
          updateData[field] === undefined
        ) {
          delete updateData[field];
          console.log(`  ✅ Removed invalid ${field} value`);
        }
      });

      // Clean up any other array fields that might contain empty strings
      Object.keys(updateData).forEach((key) => {
        if (Array.isArray(updateData[key])) {
          const originalLength = updateData[key].length;
          updateData[key] = updateData[key].filter(
            (item) => item && item !== "" && item !== null && item !== undefined
          );
          if (updateData[key].length === 0) {
            delete updateData[key];
            console.log(`  ✅ Removed empty array field: ${key}`);
          } else if (updateData[key].length !== originalLength) {
            console.log(
              `  ✅ Cleaned array field ${key}: ${originalLength} -> ${updateData[key].length} items`
            );
          }
        }
      });

      console.log("\n📋 Final update data:");
      console.log(JSON.stringify(updateData, null, 2));

      const driver = await Driver.findByIdAndUpdate(driverId, updateData, {
        new: true,
        runValidators: true,
      });

      if (!driver) {
        console.log("❌ Driver not found with ID:", driverId);
        return errorResponse(res, 404, "Driver not found");
      }

      console.log("\n✅ Driver successfully updated:");
      console.log(JSON.stringify(driver, null, 2));
      console.log("=============================================\n");

      successResponse(res, 200, "Driver updated successfully", driver);
    } catch (error) {
      console.error("\n❌ ===== DRIVER UPDATE ERROR =====");
      console.error("🚨 Error type:", error.constructor.name);
      console.error("📝 Error message:", error.message);
      console.error("📊 Error code:", error.code);
      console.error("🔍 Error name:", error.name);
      console.error("📄 Stack trace:", error.stack);

      if (error.errors) {
        console.error(
          "🔧 Validation errors:",
          JSON.stringify(error.errors, null, 2)
        );
      }

      console.error("❌ ===== END ERROR LOGGING =====");

      // Determine appropriate error response
      let statusCode = 500;
      let message = "Failed to update driver";

      if (error.name === "ValidationError") {
        statusCode = 400;
        message = "Validation failed";
      }

      errorResponse(res, statusCode, message, error.message);
    }
  }
);

/*
 * @swagger
 * /api/drivers/{id}:
 *   delete:
 *     summary: Delete driver (Admin only)
 *     tags: [Drivers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Driver ID
 *     responses:
 *       200:
 *         description: Driver deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       404:
 *         description: Driver not found
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
      const driver = await Driver.findByIdAndDelete(req.params.id);

      if (!driver) {
        return errorResponse(res, 404, "Driver not found");
      }

      successResponse(res, 200, "Driver deleted successfully");
    } catch (error) {
      console.error("Delete driver error:", error);
      errorResponse(res, 500, "Failed to delete driver", error.message);
    }
  }
);

/*
 * @swagger
 * /api/drivers/{id}/trips:
 *   get:
 *     summary: Get driver's assigned trips
 *     tags: [Drivers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Driver ID
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
 *         description: Driver trips retrieved successfully
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
 *         description: Driver not found
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
      const driver = await Driver.findById(req.params.id).populate({
        path: "assignedTrips",
        populate: [
          { path: "busId", select: "busName busNumber" },
          { path: "routeId", select: "name startPoint" },
        ],
      });

      if (!driver) {
        return errorResponse(res, 404, "Driver not found");
      }

      successResponse(
        res,
        200,
        "Driver trips retrieved successfully",
        driver.assignedTrips
      );
    } catch (error) {
      console.error("Get driver trips error:", error);
      errorResponse(res, 500, "Failed to retrieve driver trips", error.message);
    }
  }
);

/*
 * @swagger
 * /api/drivers/{id}/status:
 *   put:
 *     summary: Update driver status (Admin only)
 *     tags: [Drivers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Driver ID
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
 *                 enum: [Active, Inactive, Suspended]
 *                 example: "Active"
 *     responses:
 *       200:
 *         description: Driver status updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Driver'
 *       404:
 *         description: Driver not found
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

      if (!["Active", "Inactive", "Suspended"].includes(status)) {
        return errorResponse(res, 400, "Invalid status");
      }

      const driver = await Driver.findByIdAndUpdate(
        req.params.id,
        { status },
        { new: true }
      );

      if (!driver) {
        return errorResponse(res, 404, "Driver not found");
      }

      successResponse(res, 200, "Driver status updated successfully", driver);
    } catch (error) {
      console.error("Update driver status error:", error);
      errorResponse(res, 500, "Failed to update driver status", error.message);
    }
  }
);

/*
 * @swagger
 * /api/drivers/stats/overview:
 *   get:
 *     summary: Get driver statistics (Admin only)
 *     tags: [Drivers]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Driver statistics retrieved successfully
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
 *                         totalDrivers:
 *                           type: integer
 *                         activeDrivers:
 *                           type: integer
 *                         inactiveDrivers:
 *                           type: integer
 *                         suspendedDrivers:
 *                           type: integer
 *                         driverRoleStats:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               _id:
 *                                 type: string
 *                               count:
 *                                 type: integer
 *                         experienceStats:
 *                           type: object
 *                           properties:
 *                             avgExperience:
 *                               type: number
 *                             totalExperience:
 *                               type: number
 *                         topDrivers:
 *                           type: array
 *                           items:
 *                             type: object
 *                         recentDrivers:
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
      const totalDrivers = await Driver.countDocuments();
      const activeDrivers = await Driver.countDocuments({ status: "Active" });
      const drivers = await Driver.countDocuments({ jobTitle: "Driver" });
      const conductors = await Driver.countDocuments({ jobTitle: "Conductor" });

      const experienceStats = await Driver.aggregate([
        {
          $group: {
            _id: null,
            avgExperience: { $avg: "$yearsOfExperience" },
            maxExperience: { $max: "$yearsOfExperience" },
            minExperience: { $min: "$yearsOfExperience" },
          },
        },
      ]);

      const statusStats = await Driver.aggregate([
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
          },
        },
      ]);

      successResponse(res, 200, "Driver statistics retrieved successfully", {
        totalDrivers,
        activeDrivers,
        drivers,
        conductors,
        experienceStats: experienceStats[0] || {},
        statusStats,
      });
    } catch (error) {
      console.error("Get driver stats error:", error);
      errorResponse(
        res,
        500,
        "Failed to retrieve driver statistics",
        error.message
      );
    }
  }
);

module.exports = router;
