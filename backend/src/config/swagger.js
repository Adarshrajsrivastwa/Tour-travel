const swaggerJsdoc = require("swagger-jsdoc");
const path = require("path");

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Bus Booking & Fleet Management API",
      version: "1.0.0",
      description:
        "A comprehensive API for managing bus bookings, fleet operations, and administrative functions",
      contact: {
        name: "API Support",
        email: "support@busbooking.com",
      },
      license: {
        name: "MIT",
        url: "https://opensource.org/licenses/MIT",
      },
    },
    servers: [
      {
        url: process.env.SERVER_URL || "https://api.grtourtravels.com/",
        description: "Development server",
      },
      {
        url: process.env.SERVER_URL,
        description: "Production server",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
      schemas: {
        User: {
          type: "object",
          required: ["name", "email", "mobile", "password"],
          properties: {
            _id: {
              type: "string",
              description: "User ID",
            },
            name: {
              type: "string",
              description: "Full name of the user",
            },
            email: {
              type: "string",
              format: "email",
              description: "User email address",
            },
            mobile: {
              type: "string",
              description: "User mobile number",
            },
            userType: {
              type: "string",
              enum: ["Normal", "Buyer", "Admin"],
              description: "Type of user",
            },
            isActive: {
              type: "boolean",
              description: "Whether the user account is active",
            },
            registrationDate: {
              type: "string",
              format: "date-time",
              description: "User registration date",
            },
          },
        },
        Driver: {
          type: "object",
          required: [
            "jobTitle",
            "fullName",
            "mobile",
            "email",
            "aadharNumber",
            "panNumber",
          ],
          properties: {
            _id: {
              type: "string",
              description: "Driver ID",
            },
            jobTitle: {
              type: "string",
              enum: ["Driver", "Conductor"],
              description: "Job title of the crew member",
            },
            fullName: {
              type: "string",
              description: "Full name of the driver",
            },
            mobile: {
              type: "string",
              description: "Primary mobile number",
            },
            email: {
              type: "string",
              format: "email",
              description: "Email address",
            },
            aadharNumber: {
              type: "string",
              description: "Aadhar card number",
            },
            panNumber: {
              type: "string",
              description: "PAN card number",
            },
            yearsOfExperience: {
              type: "number",
              description: "Years of driving experience",
            },
            status: {
              type: "string",
              enum: ["Active", "Inactive", "Suspended"],
              description: "Driver status",
            },
          },
        },
        Bus: {
          type: "object",
          required: [
            "busName",
            "busNumber",
            "seatArchitecture",
            "seatCapacity",
            "insuranceNumber",
          ],
          properties: {
            _id: {
              type: "string",
              description: "Bus ID",
            },
            busName: {
              type: "string",
              description: "Name of the bus",
            },
            busNumber: {
              type: "string",
              description: "Registration number of the bus",
            },
            seatArchitecture: {
              type: "string",
              enum: ["2+2", "2+1", "1+1", "3+2"],
              description: "Seat layout configuration",
            },
            seatCapacity: {
              type: "number",
              description: "Total number of seats",
            },
            status: {
              type: "string",
              enum: ["Active", "Inactive", "Maintenance", "Retired"],
              description: "Bus operational status",
            },
          },
        },
        Route: {
          type: "object",
          required: [
            "name",
            "startPoint",
            "stops",
            "totalDistance",
            "estimatedTravelTime",
          ],
          properties: {
            _id: {
              type: "string",
              description: "Route ID",
            },
            name: {
              type: "string",
              description: "Name of the route",
            },
            startPoint: {
              type: "string",
              description: "Starting point of the route",
            },
            stops: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  distanceFromPrev: { type: "number" },
                  durationFromPrev: { type: "number" },
                },
              },
            },
            totalDistance: {
              type: "number",
              description: "Total distance in kilometers",
            },
            estimatedTravelTime: {
              type: "number",
              description: "Estimated travel time in minutes",
            },
          },
        },
        Booking: {
          type: "object",
          required: ["userId", "scheduleId", "seats", "fare", "travelDate"],
          properties: {
            _id: {
              type: "string",
              description: "Booking ID",
            },
            userId: {
              type: "string",
              description: "User who made the booking",
            },
            scheduleId: {
              type: "string",
              description: "Onboard schedule ID",
            },
            seats: {
              type: "array",
              items: { type: "string" },
              description: "Selected seat numbers",
            },
            fare: {
              type: "number",
              description: "Total fare amount",
            },
            paymentStatus: {
              type: "string",
              enum: ["Paid", "COD", "Pending", "Failed", "Refunded"],
              description: "Payment status",
            },
            status: {
              type: "string",
              enum: [
                "Confirmed",
                "Pending",
                "Cancelled",
                "Completed",
                "No-Show",
              ],
              description: "Booking status",
            },
            travelDate: {
              type: "string",
              format: "date-time",
              description: "Date of travel",
            },
          },
        },
        OnboardSchedule: {
          type: "object",
          required: ["busId", "routeId", "date", "time"],
          properties: {
            _id: {
              type: "string",
              description: "Schedule ID",
            },
            busId: {
              type: "string",
              description: "Assigned bus ID",
            },
            routeId: {
              type: "string",
              description: "Route ID",
            },
            date: {
              type: "string",
              format: "date",
              description: "Travel date",
            },
            time: {
              type: "string",
              description: "Departure time (HH:MM format)",
            },
            status: {
              type: "string",
              enum: [
                "Scheduled",
                "In Progress",
                "Completed",
                "Cancelled",
                "Delayed",
              ],
              description: "Schedule status",
            },
            assignedTeam: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: { type: "string" },
                  name: { type: "string" },
                  role: { type: "string", enum: ["Driver", "Conductor"] },
                },
              },
            },
          },
        },
        Rating: {
          type: "object",
          required: [
            "userId",
            "scheduleId",
            "rating",
            "serviceRating",
            "driverRating",
            "busRating",
            "punctualityRating",
          ],
          properties: {
            _id: {
              type: "string",
              description: "Rating ID",
            },
            userId: {
              type: "string",
              description: "User who gave the rating",
            },
            scheduleId: {
              type: "string",
              description: "Schedule being rated",
            },
            rating: {
              type: "number",
              minimum: 1,
              maximum: 5,
              description: "Overall rating",
            },
            serviceRating: {
              type: "number",
              minimum: 1,
              maximum: 5,
              description: "Service quality rating",
            },
            driverRating: {
              type: "number",
              minimum: 1,
              maximum: 5,
              description: "Driver performance rating",
            },
            busRating: {
              type: "number",
              minimum: 1,
              maximum: 5,
              description: "Bus condition rating",
            },
            punctualityRating: {
              type: "number",
              minimum: 1,
              maximum: 5,
              description: "Punctuality rating",
            },
            comments: {
              type: "string",
              description: "Additional comments",
            },
            wouldRecommend: {
              type: "boolean",
              description: "Would recommend to others",
            },
          },
        },
        Error: {
          type: "object",
          properties: {
            success: {
              type: "boolean",
              example: false,
            },
            message: {
              type: "string",
              description: "Error message",
            },
            errors: {
              type: "array",
              items: { type: "string" },
            },
          },
        },
        Success: {
          type: "object",
          properties: {
            success: {
              type: "boolean",
              example: true,
            },
            message: {
              type: "string",
              description: "Success message",
            },
            data: {
              type: "object",
              description: "Response data",
            },
          },
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: [
    path.join(__dirname, "../routes/*.js"),
    path.join(__dirname, "../app.js"),
  ],
};

const specs = swaggerJsdoc(options);

module.exports = specs;
