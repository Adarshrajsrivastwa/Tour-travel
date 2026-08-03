const express = require('express');
const Route = require('../models/Route');
const Stop = require('../models/Stop');
const { successResponse, errorResponse, paginatedResponse } = require('../utils/response');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { validateRoute, validateObjectId, validatePagination } = require('../middleware/validation');

const router = express.Router();

// Helper function to save stops to database asynchronously (non-blocking)
const saveStopsAsync = async (startPoint, stops) => {
  // Run in background without blocking the route save
  setImmediate(async () => {
    try {
      const stopNames = new Set();
      
      // Add start point
      if (startPoint && startPoint.trim()) {
        stopNames.add(startPoint.trim());
      }
      
      // Add all stops from the route
      if (stops && Array.isArray(stops)) {
        stops.forEach(stop => {
          if (stop.name && stop.name.trim()) {
            stopNames.add(stop.name.trim());
          }
        });
      }
      
      // Save each stop (upsert - create if doesn't exist, update if exists)
      for (const stopName of stopNames) {
        try {
          // First try to find existing stop (case-insensitive)
          const existingStop = await Stop.findOne({
            name: { $regex: new RegExp(`^${stopName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
          });
          
          if (existingStop) {
            // Update existing stop
            await Stop.findByIdAndUpdate(
              existingStop._id,
              { 
                $set: { 
                  name: stopName, // Use the normalized name
                  displayName: stopName,
                  lastUsed: new Date()
                },
                $inc: { usageCount: 1 }
              }
            );
          } else {
            // Create new stop
            await Stop.create({
              name: stopName,
              displayName: stopName,
              usageCount: 1,
              lastUsed: new Date(),
              isActive: true
            });
          }
        } catch (stopError) {
          // Log error but don't fail - this is a background operation
          // Handle duplicate key error gracefully (might happen in race conditions)
          if (stopError.code !== 11000) {
            console.error(`Error saving stop "${stopName}":`, stopError.message);
          }
        }
      }
    } catch (error) {
      // Log error but don't fail - this is a background operation
      console.error('Error in saveStopsAsync:', error.message);
    }
  });
};

/*
 * @swagger
 * /api/routes:
 *   get:
 *     summary: Get all routes
 *     tags: [Routes]
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
 *         description: Number of routes per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term for route name or start point
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [all, Active, Inactive, Suspended]
 *           default: all
 *         description: Filter by status
 *     responses:
 *       200:
 *         description: Routes retrieved successfully
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
 *                         $ref: '#/components/schemas/Route'
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
router.get('/', authenticateToken, validatePagination, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const { sanitizeSearchQuery } = require("../utils/sanitize");
    const rawSearch = req.query.search || '';
    const search = sanitizeSearchQuery(rawSearch);
    const status = req.query.status || 'all';

    // Build search query - sanitized
    const searchQuery = {};
    
    if (search) {
      searchQuery.$or = [
        { name: { $regex: search, $options: 'i' } },
        { startPoint: { $regex: search, $options: 'i' } },
        // Match end stop (last element in stops array)
        {
          $expr: {
            $regexMatch: {
              input: { $arrayElemAt: [ '$stops.name', -1 ] },
              regex: search,
              options: 'i'
            }
          }
        }
      ];
    }

    if (status !== 'all') {
      searchQuery.status = status;
    }

    // Get routes with pagination
    const routes = await Route.find(searchQuery)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Route.countDocuments(searchQuery);

    paginatedResponse(res, 200, 'Routes retrieved successfully', routes, {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    });
  } catch (error) {
    const logger = require('../utils/logger');
    logger.error('Get routes error:', error);
    errorResponse(res, 500, 'Failed to retrieve routes', error.message);
  }
});

/**
 * @swagger
 * /api/routes/stops/suggest:
 *   get:
 *     summary: Get stop name suggestions (autocomplete)
 *     description: Search for stop names to help users avoid spelling mistakes. Returns matching stops based on search query.
 *     tags: [Routes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *         description: Search query for stop name
 *         example: "mum"
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Maximum number of suggestions to return
 *     responses:
 *       200:
 *         description: Stop suggestions retrieved successfully
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
 *                             example: "Mumbai"
 *                           displayName:
 *                             type: string
 *                             example: "Mumbai"
 *                           usageCount:
 *                             type: number
 *                             example: 15
 *       400:
 *         description: Validation error - search query is required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/stops/suggest', authenticateToken, async (req, res) => {
  try {
    const query = req.query.q;
    const limit = parseInt(req.query.limit) || 10;

    if (!query || query.trim().length === 0) {
      return errorResponse(res, 400, 'Search query (q) is required');
    }

    const { sanitizeSearchQuery } = require("../utils/sanitize");
    const searchQuery = sanitizeSearchQuery(query.trim());
    
    // Search stops by name (case-insensitive, partial match) - sanitized
    // Sort by usageCount (descending) and then by name (ascending)
    const stops = await Stop.find({
      isActive: true,
      $or: [
        { name: { $regex: searchQuery, $options: 'i' } },
        { displayName: { $regex: searchQuery, $options: 'i' } }
      ]
    })
    .select('name displayName usageCount')
    .sort({ usageCount: -1, name: 1 })
    .limit(limit);

    successResponse(res, 200, 'Stop suggestions retrieved successfully', stops);
  } catch (error) {
    const logger = require('../utils/logger');
    logger.error('Get stop suggestions error:', error);
    errorResponse(res, 500, 'Failed to retrieve stop suggestions', error.message);
  }
});

/*
 * @swagger
 * /api/routes/{id}:
 *   get:
 *     summary: Get route by ID
 *     tags: [Routes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Route ID
 *     responses:
 *       200:
 *         description: Route retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Route'
 *       404:
 *         description: Route not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/:id', authenticateToken, validateObjectId, async (req, res) => {
  try {
    const route = await Route.findById(req.params.id);

    if (!route) {
      return errorResponse(res, 404, 'Route not found');
    }

    successResponse(res, 200, 'Route retrieved successfully', route);
  } catch (error) {
    console.error('Get route error:', error);
    errorResponse(res, 500, 'Failed to retrieve route', error.message);
  }
});

/*
 * @swagger
 * /api/routes:
 *   post:
 *     summary: Create new route (Admin only)
 *     tags: [Routes]
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
 *               - startPoint
 *               - stops
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Mumbai to Delhi"
 *               startPoint:
 *                 type: string
 *                 example: "Mumbai"
 *               stops:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                       example: "Pune"
 *                     distanceFromPrev:
 *                       type: number
 *                       example: 150
 *                     durationFromPrev:
 *                       type: number
 *                       example: 120
 *               status:
 *                 type: string
 *                 enum: [Active, Inactive, Suspended]
 *                 default: Active
 *     responses:
 *       201:
 *         description: Route created successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Route'
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
router.post('/', authenticateToken, requireAdmin, validateRoute, async (req, res) => {
  try {
    const routeData = req.body;

    // Check if route already exists
    const existingRoute = await Route.findOne({
      name: routeData.name
    });

    if (existingRoute) {
      return errorResponse(res, 400, 'Route already exists with this name');
    }

    // Validate stops
    if (!routeData.stops || routeData.stops.length < 2) {
      return errorResponse(res, 400, 'Route must have at least 2 stops');
    }

    // Calculate total distance and time from stops
    let totalDistance = 0;
    let totalTime = 0;

    routeData.stops.forEach((stop, index) => {
      if (index > 0) {
        totalDistance += stop.distanceFromPrev || 0;
        totalTime += stop.durationFromPrev || 0;
      }
    });

    // Update calculated values
    routeData.totalDistance = totalDistance;
    routeData.estimatedTravelTime = totalTime;

    const route = new Route(routeData);
    await route.save();

    // Save stops asynchronously (non-blocking)
    saveStopsAsync(routeData.startPoint, routeData.stops);

    successResponse(res, 201, 'Route created successfully', route);
  } catch (error) {
    console.error('Create route error:', error);
    errorResponse(res, 500, 'Failed to create route', error.message);
  }
});

/*
 * @swagger
 * /api/routes/{id}:
 *   put:
 *     summary: Update route (Admin only)
 *     tags: [Routes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Route ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               startPoint:
 *                 type: string
 *               stops:
 *                 type: array
 *               status:
 *                 type: string
 *                 enum: [Active, Inactive, Suspended]
 *     responses:
 *       200:
 *         description: Route updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Route'
 *       404:
 *         description: Route not found
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
router.put('/:id', authenticateToken, requireAdmin, validateObjectId, async (req, res) => {
  try {
    const routeId = req.params.id;
    const updateData = req.body;

    // Remove fields that shouldn't be updated directly
    delete updateData._id;
    delete updateData.createdAt;
    delete updateData.updatedAt;

    // Recalculate distance and time if stops are updated
    if (updateData.stops) {
      let totalDistance = 0;
      let totalTime = 0;

      updateData.stops.forEach((stop, index) => {
        if (index > 0) {
          totalDistance += stop.distanceFromPrev || 0;
          totalTime += stop.durationFromPrev || 0;
        }
      });

      updateData.totalDistance = totalDistance;
      updateData.estimatedTravelTime = totalTime;
    }

    const route = await Route.findByIdAndUpdate(
      routeId,
      updateData,
      { new: true, runValidators: true }
    );

    if (!route) {
      return errorResponse(res, 404, 'Route not found');
    }

    // Save stops asynchronously (non-blocking) if route data was updated
    if (updateData.startPoint || updateData.stops) {
      saveStopsAsync(
        updateData.startPoint || route.startPoint,
        updateData.stops || route.stops
      );
    }

    successResponse(res, 200, 'Route updated successfully', route);
  } catch (error) {
    console.error('Update route error:', error);
    errorResponse(res, 500, 'Failed to update route', error.message);
  }
});

/*
 * @swagger
 * /api/routes/{id}:
 *   delete:
 *     summary: Delete route (Admin only)
 *     tags: [Routes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Route ID
 *     responses:
 *       200:
 *         description: Route deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       404:
 *         description: Route not found
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
router.delete('/:id', authenticateToken, requireAdmin, validateObjectId, async (req, res) => {
  try {
    const route = await Route.findByIdAndDelete(req.params.id);

    if (!route) {
      return errorResponse(res, 404, 'Route not found');
    }

    successResponse(res, 200, 'Route deleted successfully');
  } catch (error) {
    console.error('Delete route error:', error);
    errorResponse(res, 500, 'Failed to delete route', error.message);
  }
});

/*
 * @swagger
 * /api/routes/{id}/trips:
 *   get:
 *     summary: Get route assigned trips
 *     tags: [Routes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Route ID
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
 *         description: Route trips retrieved successfully
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
 *         description: Route not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/:id/trips', authenticateToken, validateObjectId, async (req, res) => {
  try {
    const route = await Route.findById(req.params.id).populate({
      path: 'assignedTrips',
      populate: [
        { path: 'busId', select: 'busName busNumber' }
      ]
    });

    if (!route) {
      return errorResponse(res, 404, 'Route not found');
    }

    successResponse(res, 200, 'Route trips retrieved successfully', route.assignedTrips);
  } catch (error) {
    console.error('Get route trips error:', error);
    errorResponse(res, 500, 'Failed to retrieve route trips', error.message);
  }
});

/*
 * @swagger
 * /api/routes/{id}/status:
 *   put:
 *     summary: Update route status (Admin only)
 *     tags: [Routes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Route ID
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
 *         description: Route status updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Route'
 *       404:
 *         description: Route not found
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
router.put('/:id/status', authenticateToken, requireAdmin, validateObjectId, async (req, res) => {
  try {
    const { status } = req.body;

    if (!['Active', 'Inactive', 'Suspended'].includes(status)) {
      return errorResponse(res, 400, 'Invalid status');
    }

    const route = await Route.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    if (!route) {
      return errorResponse(res, 404, 'Route not found');
    }

    successResponse(res, 200, 'Route status updated successfully', route);
  } catch (error) {
    console.error('Update route status error:', error);
    errorResponse(res, 500, 'Failed to update route status', error.message);
  }
});

/*
 * @swagger
 * /api/routes/stats/overview:
 *   get:
 *     summary: Get route statistics (Admin only)
 *     tags: [Routes]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Route statistics retrieved successfully
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
 *                         totalRoutes:
 *                           type: integer
 *                         activeRoutes:
 *                           type: integer
 *                         inactiveRoutes:
 *                           type: integer
 *                         suspendedRoutes:
 *                           type: integer
 *                         routeDistanceStats:
 *                           type: object
 *                           properties:
 *                             totalDistance:
 *                               type: number
 *                             avgDistance:
 *                               type: number
 *                             maxDistance:
 *                               type: number
 *                             minDistance:
 *                               type: number
 *                         routeTimeStats:
 *                           type: object
 *                           properties:
 *                             totalTime:
 *                               type: number
 *                             avgTime:
 *                               type: number
 *                             maxTime:
 *                               type: number
 *                             minTime:
 *                               type: number
 *                         topRoutes:
 *                           type: array
 *                           items:
 *                             type: object
 *                         recentRoutes:
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
router.get('/stats/overview', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const totalRoutes = await Route.countDocuments();
    const activeRoutes = await Route.countDocuments({ status: 'Active' });

    const distanceStats = await Route.aggregate([
      {
        $group: {
          _id: null,
          totalDistance: { $sum: '$totalDistance' },
          avgDistance: { $avg: '$totalDistance' },
          maxDistance: { $max: '$totalDistance' },
          minDistance: { $min: '$totalDistance' }
        }
      }
    ]);

    const timeStats = await Route.aggregate([
      {
        $group: {
          _id: null,
          avgTravelTime: { $avg: '$estimatedTravelTime' },
          maxTravelTime: { $max: '$estimatedTravelTime' },
          minTravelTime: { $min: '$estimatedTravelTime' }
        }
      }
    ]);

    const statusStats = await Route.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const stopsStats = await Route.aggregate([
      {
        $group: {
          _id: null,
          avgStops: { $avg: { $size: '$stops' } },
          maxStops: { $max: { $size: '$stops' } },
          minStops: { $min: { $size: '$stops' } }
        }
      }
    ]);

    successResponse(res, 200, 'Route statistics retrieved successfully', {
      totalRoutes,
      activeRoutes,
      distanceStats: distanceStats[0] || {},
      timeStats: timeStats[0] || {},
      statusStats,
      stopsStats: stopsStats[0] || {}
    });
  } catch (error) {
    console.error('Get route stats error:', error);
    errorResponse(res, 500, 'Failed to retrieve route statistics', error.message);
  }
});

module.exports = router;
