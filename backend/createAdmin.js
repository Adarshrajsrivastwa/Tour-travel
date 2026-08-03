const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Import User model
const User = require('./src/models/User');

async function createAdmin() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/bus_booking_system");
    console.log("✅ Connected to MongoDB");

    // Use admin credentials from .env or defaults
    const adminEmail = process.env.ADMIN_EMAIL || "admin@mailinator.com";
    const adminPassword = process.env.ADMIN_PASSWORD || "admin123";
    const adminUsername = process.env.ADMIN_USERNAME || "Admin User";

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: adminEmail });
    if (existingAdmin) {
      console.log(`❌ Admin user already exists with email: ${adminEmail}`);
      // Update password just in case it changed in .env
      // Let the User model handle hashing (pre-save middleware)
      existingAdmin.password = adminPassword; 
      existingAdmin.userType = "Admin"; // Ensure it's Admin
      await existingAdmin.save();
      console.log(`✅ Admin password updated for: ${adminEmail}`);
      return;
    }

    // Create admin user
    // Let the User model handle hashing (pre-save middleware)
    const adminUser = new User({
      name: adminUsername,
      mobile: "+919876543200",
      email: adminEmail,
      password: adminPassword,
      userType: "Admin",
      registrationDate: new Date('2024-01-01'),
      isActive: true,
      accountDetails: {
        email: adminEmail,
        preferences: { 
          notifications: true, 
          sms: true 
        },
        notificationSettings: { 
          email: true, 
          sms: true, 
          push: true 
        }
      }
    });

    // Save the admin user
    await adminUser.save();
    
    console.log("✅ Admin user created successfully!");
    console.log(`📧 Email: ${adminEmail}`);
    console.log(`🔑 Password: ${adminPassword}`);
    console.log("👤 User Type: Admin");
    console.log("📱 Mobile: +919876543200");

  } catch (error) {
    console.error("❌ Error creating admin user:", error);
  } finally {
    await mongoose.disconnect();
    console.log("🔌 Disconnected from MongoDB");
  }
}

// Run the function
createAdmin();
