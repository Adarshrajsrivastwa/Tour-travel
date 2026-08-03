const express = require("express");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const BusinessInfo = require("../models/BusinessInfo");
const { authenticateToken, requireAdmin } = require("../middleware/auth");
const { successResponse, errorResponse } = require("../utils/response");
const logger = require("../utils/logger");

const router = express.Router();

/**
 * @swagger
 * /api/admin/reset-password:
 *   post:
 *     summary: Reset admin password using administrative email
 *     description: Allows admin to reset password using their administrative email ID. Sends OTP to email for verification. Does not require authentication.
 *     tags: [Admin]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "admin@example.com"
 *     responses:
 *       200:
 *         description: OTP sent successfully to admin email
 *       400:
 *         description: Invalid email or validation error
 *       404:
 *         description: Admin not found
 */
router.post("/reset-password", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return errorResponse(res, 400, "Email is required");
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return errorResponse(res, 400, "Please provide a valid email address");
    }

    // Find admin user by email
    const adminUser = await User.findOne({ 
      email: email.toLowerCase().trim(),
      userType: "Admin"
    }).select("+otp +otpExpires +otpVerifiedAt");

    if (!adminUser) {
      return errorResponse(res, 404, "Admin account not found with this email");
    }

    // Check if user is active
    if (!adminUser.isActive) {
      return errorResponse(res, 400, "Admin account is deactivated");
    }

    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000);
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Update OTP fields
    const updatedUser = await User.findOneAndUpdate(
      { email: email.toLowerCase().trim(), userType: "Admin" },
      { 
        $set: { 
          otp: otp, 
          otpExpires: otpExpires 
        },
        $unset: { 
          otpVerifiedAt: "" 
        }
      },
      { 
        new: true,
        runValidators: false 
      }
    ).select("+otp +otpExpires");

    if (!updatedUser) {
      return errorResponse(res, 404, "Admin not found");
    }

    // Send OTP via email
    const { sendOTPEmail } = require("../utils/email");
    try {
      await sendOTPEmail(updatedUser.email, otp, updatedUser.name);
      logger.debug("Admin password reset OTP email sent successfully");
    } catch (emailError) {
      logger.error("Failed to send admin password reset OTP email:", emailError);
      // Log OTP for development/debugging
      logger.debug(`Admin Password Reset [DEV] OTP for ${email}: ${otp} (Valid until: ${new Date(otpExpires).toLocaleString()})`);
    }

    successResponse(res, 200, "Password reset code sent to your administrative email", {
      otp: otp.toString(),
      expiresAt: otpExpires,
      validUntil: new Date(otpExpires).toISOString()
    });
  } catch (error) {
    logger.error("Admin reset password error:", error);
    errorResponse(res, 500, "Failed to process password reset request", error.message);
  }
});

// All other admin routes require authentication and admin role
router.use(authenticateToken);
router.use(requireAdmin);

// /**
//  * @swagger
//  * /api/admin/business-info:
//  *   get:
//  *     summary: Get business information
//  *     tags: [Admin]
//  *     security:
//  *       - bearerAuth: []
//  *     responses:
//  *       200:
//  *         description: Business information retrieved successfully
//  *       401:
//  *         description: Unauthorized
//  *       403:
//  *         description: Admin access required
//  */

router.get("/business-info", async (req, res) => {
  try {
    const businessInfo = await BusinessInfo.getBusinessInfo();
    successResponse(
      res,
      200,
      "Business information retrieved successfully",
      businessInfo
    );
  } catch (error) {
    logger.error("Get business info error:", error);
    errorResponse(
      res,
      500,
      "Failed to retrieve business information",
      error.message
    );
  }
});

// /**
//  * @swagger
//  * /api/admin/business-info:
//  *   put:
//  *     summary: Update business information
//  *     tags: [Admin]
//  *     security:
//  *       - bearerAuth: []
//  *     requestBody:
//  *       required: true
//  *       content:
//  *         application/json:
//  *           schema:
//  *             type: object
//  *             properties:
//  *               companyName:
//  *                 type: string
//  *               businessName:
//  *                 type: string
//  *               supportEmail:
//  *                 type: string
//  *               contactNumber:
//  *                 type: string
//  *               whatsappNumber:
//  *                 type: string
//  *               addressLine1:
//  *                 type: string
//  *               city:
//  *                 type: string
//  *               state:
//  *                 type: string
//  *               pincode:
//  *                 type: string
//  *               country:
//  *                 type: string
//  *               website:
//  *                 type: string
//  *               gstNumber:
//  *                 type: string
//  *     responses:
//  *       200:
//  *         description: Business information updated successfully
//  *       401:
//  *         description: Unauthorized
//  *       403:
//  *         description: Admin access required
//  */


router.put("/business-info", async (req, res) => {
  try {
    const updateData = req.body;

    // Get or create business info document
    let businessInfo = await BusinessInfo.findOne();

    if (!businessInfo) {
      businessInfo = new BusinessInfo(updateData);
      await businessInfo.save();
    } else {
      // Update only provided fields
      Object.keys(updateData).forEach((key) => {
        if (updateData[key] !== undefined && updateData[key] !== null) {
          businessInfo[key] = updateData[key];
        }
      });
      await businessInfo.save();
    }

    successResponse(
      res,
      200,
      "Business information updated successfully",
      businessInfo
    );
  } catch (error) {
    logger.error("Update business info error:", error);
    errorResponse(
      res,
      500,
      "Failed to update business information",
      error.message
    );
  }
});

// /**
//  * @swagger
//  * /api/admin/change-credentials:
//  *   put:
//  *     summary: Change admin credentials (email and/or password)
//  *     tags: [Admin]
//  *     security:
//  *       - bearerAuth: []
//  *     requestBody:
//  *       required: true
//  *       content:
//  *         application/json:
//  *           schema:
//  *             type: object
//  *             properties:
//  *               email:
//  *                 type: string
//  *                 format: email
//  *               currentPassword:
//  *                 type: string
//  *               newPassword:
//  *                 type: string
//  *     responses:
//  *       200:
//  *         description: Credentials updated successfully
//  *       400:
//  *         description: Invalid current password or validation error
//  *       401:
//  *         description: Unauthorized
//  *       403:
//  *         description: Admin access required
//  */

router.put("/change-credentials", async (req, res) => {
  try {
    const { email, currentPassword, newPassword } = req.body;
    const userId = req.user._id;

    // Check if at least one field is being updated
    if (!email && !newPassword) {
      return errorResponse(
        res,
        400,
        "Please provide either a new email or new password to update"
      );
    }

    // Get user with password
    const user = await User.findById(userId).select("+password");

    if (!user) {
      return errorResponse(res, 404, "User not found");
    }

    // Handle email change
    if (email && email !== user.email) {
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return errorResponse(res, 400, "Please enter a valid email address");
      }

      // Check if email is already taken by another user
      const existingUser = await User.findOne({ email, _id: { $ne: userId } });
      if (existingUser) {
        return errorResponse(
          res,
          400,
          "Email is already taken by another user"
        );
      }

      user.email = email;
      // Also update accountDetails.email if it exists
      if (user.accountDetails) {
        user.accountDetails.email = email;
      }
    }

    // Handle password change
    if (newPassword) {
      if (!currentPassword) {
        return errorResponse(
          res,
          400,
          "Current password is required to change password"
        );
      }

      if (newPassword.length < 8) {
        return errorResponse(
          res,
          400,
          "New password must be at least 8 characters long"
        );
      }

      // Verify current password
      const isCurrentPasswordValid = await user.comparePassword(
        currentPassword
      );

      if (!isCurrentPasswordValid) {
        return errorResponse(res, 400, "Current password is incorrect");
      }

      // Update password
      user.password = newPassword;
    }

    await user.save();

    successResponse(res, 200, "Credentials updated successfully");
  } catch (error) {
    logger.error("Change credentials error:", error);
    errorResponse(res, 500, "Failed to update credentials", error.message);
  }
});

// /**
//  * @swagger
//  * /api/admin/roles:
//  *   get:
//  *     summary: Get all roles
//  *     tags: [Admin]
//  *     security:
//  *       - bearerAuth: []
//  *     responses:
//  *       200:
//  *         description: Roles retrieved successfully
//  *       401:
//  *         description: Unauthorized
//  *       403:
//  *         description: Admin access required
//  */

router.get("/roles", async (req, res) => {
  try {
    // For now, return empty array or mock data
    // In a real system, you would have a Role model
    const roles = [];
    successResponse(res, 200, "Roles retrieved successfully", roles);
  } catch (error) {
    logger.error("Get roles error:", error);
    errorResponse(res, 500, "Failed to retrieve roles", error.message);
  }
});

// /**
//  * @swagger
//  * /api/admin/assign-account:
//  *   post:
//  *     summary: Create or update a user account for a driver/conductor (Admin only)
//  *     tags: [Admin]
//  *     security:
//  *       - bearerAuth: []
//  *     requestBody:
//  *       required: true
//  *       content:
//  *         application/json:
//  *           schema:
//  *             type: object
//  *             required:
//  *               - driverId
//  *               - password
//  *             properties:
//  *               driverId:
//  *                 type: string
//  *               password:
//  *                 type: string
//  *               permissions:
//  *                 type: object
//  *                 example: { bookings: true }
//  *     responses:
//  *       200:
//  *         description: Account created/updated successfully
//  *       400:
//  *         description: Validation error
//  *       403:
//  *         description: Admin access required
//  */

router.post("/assign-account", async (req, res) => {
  try {
    const { driverId, conductorId, password, permissions } = req.body;

    // Accept either driverId or conductorId (or both). Use whichever is provided.
    const targetId = driverId || conductorId;

    if (!targetId || !password) {
      return errorResponse(
        res,
        400,
        "driverId/conductorId and password are required"
      );
    }

    const Driver = require("../models/Driver");

    // Support assigning to one or both selected IDs
    const idsToProcess = [];
    if (driverId) idsToProcess.push(driverId);
    if (conductorId && conductorId !== driverId) idsToProcess.push(conductorId);

    const results = [];

    for (const id of idsToProcess) {
      const person = await Driver.findById(id);
      if (!person) {
        results.push({ id, status: "not_found" });
        continue;
      }

      // Try to find an existing user by email or mobile
      let user = await User.findOne({
        $or: [{ email: person.email }, { mobile: person.mobile }],
      }).select("+password");

      if (user) {
        user.password = password;
        user.userType = "Admin";
        user.accountDetails = user.accountDetails || {};
        // Driver/Conductor can only access bookings, override any permissions param
        user.accountDetails.permissions = { bookings: true };
        user.accountDetails.isDriverOrConductor = true;
        await user.save();
        results.push({ id, status: "updated", user: user.getAuthResponse() });
      } else {
        const newUser = new User({
          name: person.fullName,
          email: person.email,
          mobile: person.mobile,
          password,
          userType: "Admin",
          accountDetails: {
            email: person.email,
            // Driver/Conductor can only access bookings
            permissions: { bookings: true },
            isDriverOrConductor: true,
          },
        });
        await newUser.save();
        results.push({
          id,
          status: "created",
          user: newUser.getAuthResponse(),
        });
      }
    }

    // If none of the provided IDs were found, return 404
    const anyProcessed = results.some(
      (r) => r.status === "created" || r.status === "updated"
    );
    if (!anyProcessed) {
      return errorResponse(
        res,
        404,
        "No matching Driver/Conductor found for provided IDs",
        results
      );
    }

    successResponse(res, 200, "Accounts processed", { results });
  } catch (error) {
    console.error("Assign account error:", error);
    errorResponse(res, 500, "Failed to assign account", error.message);
  }
});

// /**
//  * @swagger
//  * /api/admin/roles:
//  *   post:
//  *     summary: Create a new role
//  *     tags: [Admin]
//  *     security:
//  *       - bearerAuth: []
//  *     requestBody:
//  *       required: true
//  *       content:
//  *         application/json:
//  *           schema:
//  *             type: object
//  *             required:
//  *               - name
//  *             properties:
//  *               name:
//  *                 type: string
//  *               description:
//  *                 type: string
//  *               permissions:
//  *                 type: object
//  *     responses:
//  *       201:
//  *         description: Role created successfully
//  *       401:
//  *         description: Unauthorized
//  *       403:
//  *         description: Admin access required
//  */

router.post("/roles", async (req, res) => {
  try {
    const { name, description, permissions } = req.body;

    if (!name) {
      return errorResponse(res, 400, "Role name is required");
    }

    // For now, return success
    // In a real system, you would create a Role document
    const role = {
      _id: new Date().getTime().toString(),
      name,
      description: description || "",
      permissions: permissions || {},
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    successResponse(res, 201, "Role created successfully", role);
  } catch (error) {
    logger.error("Create role error:", error);
    errorResponse(res, 500, "Failed to create role", error.message);
  }
});

// /**
//  * @swagger
//  * /api/admin/roles/:id:
//  *   put:
//  *     summary: Update a role
//  *     tags: [Admin]
//  *     security:
//  *       - bearerAuth: []
//  *     parameters:
//  *       - in: path
//  *         name: id
//  *         required: true
//  *         schema:
//  *           type: string
//  *     requestBody:
//  *       required: true
//  *       content:
//  *         application/json:
//  *           schema:
//  *             type: object
//  *             properties:
//  *               name:
//  *                 type: string
//  *               description:
//  *                 type: string
//  *               permissions:
//  *                 type: object
//  *     responses:
//  *       200:
//  *         description: Role updated successfully
//  *       401:
//  *         description: Unauthorized
//  *       403:
//  *         description: Admin access required
//  */

router.put("/roles/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, permissions } = req.body;

    // For now, return success
    // In a real system, you would update a Role document
    const role = {
      _id: id,
      name: name || "Updated Role",
      description: description || "",
      permissions: permissions || {},
      updatedAt: new Date(),
    };

    successResponse(res, 200, "Role updated successfully", role);
  } catch (error) {
    logger.error("Update role error:", error);
    errorResponse(res, 500, "Failed to update role", error.message);
  }
});

// /**
//  * @swagger
//  * /api/admin/roles/:id:
//  *   delete:
//  *     summary: Delete a role
//  *     tags: [Admin]
//  *     security:
//  *       - bearerAuth: []
//  *     parameters:
//  *       - in: path
//  *         name: id
//  *         required: true
//  *         schema:
//  *           type: string
//  *     responses:
//  *       200:
//  *         description: Role deleted successfully
//  *       401:
//  *         description: Unauthorized
//  *       403:
//  *         description: Admin access required
//  */

router.delete("/roles/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // For now, return success
    // In a real system, you would delete a Role document

    successResponse(res, 200, "Role deleted successfully");
  } catch (error) {
    logger.error("Delete role error:", error);
    errorResponse(res, 500, "Failed to delete role", error.message);
  }
});

module.exports = router;
