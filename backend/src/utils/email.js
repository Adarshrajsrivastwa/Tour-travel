const nodemailer = require("nodemailer");

// Create reusable transporter object using SMTP transport
const createTransporter = () => {
  // Support both SMTP_* and EMAIL_* environment variable prefixes
  const rawPort = process.env.SMTP_PORT || process.env.EMAIL_PORT;
  const emailPort = rawPort ? parseInt(rawPort) : 587;
  const emailHost = process.env.SMTP_HOST || process.env.EMAIL_HOST || "smtp.gmail.com";
  const emailUser = process.env.SMTP_USER || process.env.EMAIL_USER;
  const emailPass = process.env.SMTP_PASS || process.env.EMAIL_PASS;
  
  // Secure: use SMTP_SECURE if set, otherwise auto-detect based on port
  // Render: Make sure SMTP_SECURE is set as string "false" not boolean
  const smtpSecure = process.env.SMTP_SECURE;
  const isSecure = smtpSecure === 'true' || emailPort === 465;
  
  console.log("🔧 [EMAIL] Creating transporter with config:", {
    host: emailHost,
    port: emailPort,
    rawPortEnv: rawPort || 'not set (using default 587)',
    secure: isSecure,
    smtpSecureValue: smtpSecure || 'not set',
    hasUser: !!emailUser,
    hasPass: !!emailPass ? '***' : false,
    userPrefix: emailUser ? emailUser.substring(0, 5) + '***' : 'missing',
    allEnvVars: {
      SMTP_PORT: process.env.SMTP_PORT || 'not set',
      EMAIL_PORT: process.env.EMAIL_PORT || 'not set',
      SMTP_SECURE: process.env.SMTP_SECURE || 'not set',
      SMTP_HOST: process.env.SMTP_HOST || 'not set'
    }
  });

  return nodemailer.createTransport({
    host: emailHost,
    port: emailPort,
    secure: isSecure, // true for 465, false for other ports
    auth: {
      user: emailUser, // Your Gmail email address
      pass: emailPass, // Gmail App Password (not your regular password)
    },
    tls: {
      // Do not fail on invalid certs
      rejectUnauthorized: false,
      // Additional TLS options for better compatibility
      minVersion: 'TLSv1.2',
    },
    requireTLS: !isSecure, // Require TLS for non-secure ports
    connectionTimeout: 30000, // 30 seconds (reduced from 60)
    greetingTimeout: 15000, // 15 seconds (reduced from 30)
    socketTimeout: 30000, // 30 seconds socket timeout
    // Additional options for Render/cloud deployments
    pool: true, // Use connection pooling
    maxConnections: 1,
    maxMessages: 3,
  });
};

/**
 * Send OTP email to user
 * @param {string} email - Recipient email address
 * @param {string} otp - 6-digit OTP code
 * @param {string} userName - User's name (optional)
 * @returns {Promise<Object>} - Result object with success status
 */
const sendOTPEmail = async (email, otp, userName = "User") => {
  try {
    console.log(`[EMAIL DISABLED] Fake OTP email sent to ${email} with OTP ${otp}`);
    return { success: true, message: "OTP logged to console (email disabled)" };
    
    // Validate email configuration (support both SMTP_* and EMAIL_* prefixes)
    const emailUser = process.env.SMTP_USER || process.env.EMAIL_USER;
    const emailPass = process.env.SMTP_PASS || process.env.EMAIL_PASS;
    const emailHost = process.env.SMTP_HOST || process.env.EMAIL_HOST;
    const emailPort = process.env.SMTP_PORT || process.env.EMAIL_PORT;
    
    console.log("📧 [EMAIL] Configuration check:", {
      hasUser: !!emailUser,
      hasPass: !!emailPass,
      hasHost: !!emailHost,
      port: emailPort,
      environment: process.env.NODE_ENV,
      userEmail: emailUser ? `${emailUser.substring(0, 3)}***` : 'missing'
    });
    
    if (!emailUser || !emailPass) {
      console.error("❌ [EMAIL] Configuration missing:", {
        SMTP_USER: !!process.env.SMTP_USER,
        EMAIL_USER: !!process.env.EMAIL_USER,
        SMTP_PASS: !!process.env.SMTP_PASS,
        EMAIL_PASS: !!process.env.EMAIL_PASS,
        NODE_ENV: process.env.NODE_ENV
      });
      throw new Error("Email service is not configured. Please set SMTP_USER and SMTP_PASS environment variables.");
    }

    console.log("🔧 [EMAIL] Creating transporter...");
    const transporter = createTransporter();
    console.log("✅ [EMAIL] Transporter created successfully");

    // Company/Application configuration (can be set via environment variables)
    const companyName = process.env.COMPANY_NAME || "Fleet Bus Management";
    const companyEmail = process.env.COMPANY_EMAIL || emailUser;
    const supportEmail = process.env.SUPPORT_EMAIL || companyEmail;
    const companyWebsite = process.env.COMPANY_WEBSITE || "https://fleetbus.onrender.com";
    const companyPhone = process.env.COMPANY_PHONE || "";
    const currentYear = new Date().getFullYear();
    const otpExpiryMinutes = 10;
    
    // Format user name properly - use first name or full name
    let displayName = "Valued User";
    if (userName && userName !== "User" && userName.trim() !== "") {
      // Use the first part of the name (first name)
      displayName = userName.trim().split(" ")[0];
    }
    
    console.log("📧 [EMAIL] User name formatting:", { 
      original: userName, 
      displayName: displayName,
      email: email 
    });

    // Email content
    const mailOptions = {
      from: `"${companyName}" <${emailUser}>`,
      to: email,
      subject: `Password Reset Verification Code - ${companyName}`,
      html: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Password Reset Verification Code</title>
  <!--[if mso]>
  <style type="text/css">
    body, table, td, a { font-family: Arial, sans-serif !important; }
  </style>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f7fa; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f5f7fa; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08); overflow: hidden;">
          
          <!-- Header with Logo/Brand -->
          <tr>
            <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600; letter-spacing: -0.5px;">${companyName}</h1>
              <p style="margin: 8px 0 0; color: rgba(255, 255, 255, 0.9); font-size: 14px; font-weight: 400;">Password Reset Verification</p>
            </td>
          </tr>
          
          <!-- Main Content -->
          <tr>
            <td style="padding: 50px 40px 40px;">
              <!-- Greeting -->
              <h2 style="margin: 0 0 24px; color: #1a202c; font-size: 24px; font-weight: 600; line-height: 1.3;">Hello ${displayName},</h2>
              
              <p style="margin: 0 0 24px; color: #4a5568; font-size: 16px; line-height: 1.6;">
                We received a request to reset your password. Use the verification code below to complete the process:
              </p>
              
              <!-- OTP Code Box -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 32px 0;">
                <tr>
                  <td align="center" style="background: linear-gradient(135deg, #f7fafc 0%, #edf2f7 100%); border: 2px solid #e2e8f0; border-radius: 12px; padding: 32px 24px;">
                    <p style="margin: 0 0 12px; color: #718096; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1.2px;">Your Verification Code</p>
                    <p style="margin: 0; color: #667eea; font-size: 42px; font-weight: 700; letter-spacing: 8px; font-family: 'Courier New', 'Monaco', monospace; line-height: 1.2;">${otp}</p>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 24px 0 0; color: #718096; font-size: 14px; line-height: 1.6; text-align: center;">
                This code will expire in <strong style="color: #4a5568;">${otpExpiryMinutes} minutes</strong>
              </p>
              
              <!-- Security Notice -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 32px 0 0; background-color: #fff5f5; border-left: 4px solid #fc8181; border-radius: 6px; padding: 16px 20px;">
                <tr>
                  <td>
                    <p style="margin: 0 0 8px; color: #c53030; font-size: 13px; font-weight: 600;">🔒 Security Notice</p>
                    <ul style="margin: 0; padding-left: 20px; color: #742a2a; font-size: 13px; line-height: 1.7;">
                      <li style="margin-bottom: 6px;">Never share this code with anyone</li>
                      <li style="margin-bottom: 6px;">Our team will never ask for your verification code</li>
                      <li>If you didn't request this, please ignore this email</li>
                    </ul>
                  </td>
                </tr>
              </table>
              
              <!-- Instructions -->
              <p style="margin: 32px 0 0; color: #4a5568; font-size: 15px; line-height: 1.6;">
                Enter this code in the password reset form to create a new password. If you didn't request a password reset, you can safely ignore this email.
              </p>
              
              <!-- Help Section -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 40px 0 0; padding-top: 32px; border-top: 1px solid #e2e8f0;">
                <tr>
                  <td>
                    <p style="margin: 0 0 12px; color: #4a5568; font-size: 14px; font-weight: 600;">Need help?</p>
                    <p style="margin: 0; color: #718096; font-size: 14px; line-height: 1.6;">
                      Contact our support team at <a href="mailto:${supportEmail}" style="color: #667eea; text-decoration: none; font-weight: 500;">${supportEmail}</a>
                      ${companyPhone ? ` or call us at <a href="tel:${companyPhone}" style="color: #667eea; text-decoration: none; font-weight: 500;">${companyPhone}</a>` : ''}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f7fafc; padding: 30px 40px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0 0 8px; color: #718096; font-size: 12px; line-height: 1.5;">
                © ${currentYear} ${companyName}. All rights reserved.
              </p>
              <p style="margin: 0 0 12px; color: #a0aec0; font-size: 11px; line-height: 1.5;">
                This is an automated email. Please do not reply to this message.
              </p>
              ${companyWebsite ? `
              <p style="margin: 0; color: #a0aec0; font-size: 11px;">
                <a href="${companyWebsite}" style="color: #667eea; text-decoration: none;">Visit our website</a>
              </p>
              ` : ''}
            </td>
          </tr>
          
        </table>
        
        <!-- Email Client Compatibility Note -->
        <p style="margin: 24px 0 0; color: #a0aec0; font-size: 11px; text-align: center; line-height: 1.5;">
          If you're having trouble viewing this email, please check your email client settings.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
      `,
      text: `
Password Reset Verification Code - ${companyName}

Hello ${displayName},

We received a request to reset your password for your ${companyName} account.

Your Verification Code: ${otp}

This code will expire in ${otpExpiryMinutes} minutes.

SECURITY NOTICE:
- Never share this code with anyone
- Our team will never ask for your verification code
- If you didn't request this, please ignore this email

Enter this code in the password reset form to create a new password.

Need Help?
Contact our support team:
Email: ${supportEmail}
${companyPhone ? `Phone: ${companyPhone}` : ''}
${companyWebsite ? `Website: ${companyWebsite}` : ''}

---
© ${currentYear} ${companyName}. All rights reserved.
This is an automated email. Please do not reply to this message.
      `,
    };

    // Send email
    console.log("📤 [EMAIL] Attempting to send email...", {
      to: email,
      from: mailOptions.from,
      subject: mailOptions.subject
    });
    
    const info = await transporter.sendMail(mailOptions);

    console.log(`✅ [EMAIL] OTP email sent successfully to ${email}`);
    console.log(`📧 [EMAIL] Message ID: ${info.messageId}`);
    console.log(`📧 [EMAIL] Response:`, {
      accepted: info.accepted,
      rejected: info.rejected,
      response: info.response
    });

    return {
      success: true,
      messageId: info.messageId,
    };
  } catch (error) {
    console.error("❌ [EMAIL] Error sending OTP email:", {
      message: error.message,
      code: error.code,
      command: error.command,
      response: error.response,
      responseCode: error.responseCode,
      stack: error.stack,
      environment: process.env.NODE_ENV
    });
    
    // Provide helpful error messages for common Gmail issues
    if (error.code === 'EAUTH') {
      console.error("💡 [EMAIL] Gmail Authentication Troubleshooting:");
      console.error("   1. Make sure you're using an App Password, not your regular Gmail password");
      console.error("   2. Verify 2-Step Verification is enabled on your Google Account");
      console.error("   3. Generate a new App Password at: https://myaccount.google.com/apppasswords");
      console.error("   4. Ensure the email address matches the account where the App Password was created");
      throw new Error("Email authentication failed. Please verify SMTP_USER and SMTP_PASS are correct.");
    } else if (error.code === 'ETIMEDOUT' || error.code === 'ECONNECTION') {
      console.error("💡 [EMAIL] Connection timeout - Check network/firewall settings");
      throw new Error("Email service connection failed. Check network settings and SMTP port availability.");
    } else if (error.code === 'EENVELOPE') {
      console.error("💡 [EMAIL] Envelope error - Check email addresses");
      throw new Error("Invalid email address format.");
    }
    
    throw error;
  }
};

/**
 * Verify email transporter connection
 * @returns {Promise<boolean>} - True if connection is successful
 */
const verifyEmailConnection = async () => {
  try {
    // Support both SMTP_* and EMAIL_* environment variable prefixes
    const emailUser = process.env.SMTP_USER || process.env.EMAIL_USER;
    const emailPass = process.env.SMTP_PASS || process.env.EMAIL_PASS;
    const emailHost = process.env.SMTP_HOST || process.env.EMAIL_HOST || "smtp.gmail.com";
    const emailPort = process.env.SMTP_PORT || process.env.EMAIL_PORT || 587;
    
    console.log("🔍 [EMAIL] Verifying email connection...", {
      environment: process.env.NODE_ENV,
      hasUser: !!emailUser,
      hasPass: !!emailPass,
      host: emailHost,
      port: emailPort,
      rawPortEnv: process.env.SMTP_PORT || process.env.EMAIL_PORT || 'not set (defaulting to 587)',
      smtpSecure: process.env.SMTP_SECURE || 'not set',
      deployment: "Render", // Indicates Render deployment
      envVarsCheck: {
        SMTP_PORT: process.env.SMTP_PORT ? `"${process.env.SMTP_PORT}"` : 'NOT SET',
        EMAIL_PORT: process.env.EMAIL_PORT ? `"${process.env.EMAIL_PORT}"` : 'NOT SET',
        SMTP_SECURE: process.env.SMTP_SECURE ? `"${process.env.SMTP_SECURE}"` : 'NOT SET',
        SMTP_HOST: process.env.SMTP_HOST ? `"${process.env.SMTP_HOST}"` : 'NOT SET'
      }
    });
    
    if (!emailUser || !emailPass) {
      console.warn("⚠️ [EMAIL] Email credentials not configured");
      console.warn("💡 [EMAIL] Make sure to set environment variables:");
      console.warn("   - SMTP_USER (your Gmail address)");
      console.warn("   - SMTP_PASS (your Gmail App Password)");
      console.warn("   - SMTP_HOST (defaults to smtp.gmail.com)");
      console.warn("   - SMTP_PORT (defaults to 587)");
      return false;
    }

    console.log("🔧 [EMAIL] Creating transporter for verification...");
    const transporter = createTransporter();
    
    console.log("🔍 [EMAIL] Verifying SMTP connection...");
    try {
      await transporter.verify();
      console.log("✅ [EMAIL] Email server is ready to send messages");
      return true;
    } catch (verifyError) {
      console.error("❌ [EMAIL] Verification failed during transporter.verify():", {
        message: verifyError.message,
        code: verifyError.code,
        command: verifyError.command,
        response: verifyError.response,
        responseCode: verifyError.responseCode
      });
      throw verifyError;
    }
  } catch (error) {
    console.error("❌ [EMAIL] Email server verification failed:", {
      message: error.message,
      code: error.code,
      command: error.command,
      response: error.response,
      environment: process.env.NODE_ENV
    });
    
    // Provide helpful error messages for common Gmail issues
    if (error.message.includes("Invalid login") || error.message.includes("BadCredentials") || error.code === 'EAUTH') {
      console.error("\n💡 [EMAIL] Gmail Authentication Troubleshooting:");
      console.error("   1. Make sure you're using an App Password, not your regular Gmail password");
      console.error("   2. Verify 2-Step Verification is enabled on your Google Account");
      console.error("   3. Generate a new App Password at: https://myaccount.google.com/apppasswords");
      console.error("   4. Ensure the email address matches the account where the App Password was created");
      console.error("   5. Double-check SMTP_USER and SMTP_PASS in your environment variables");
    } else if (error.message.includes("ECONNECTION") || error.message.includes("ETIMEDOUT") || error.code === 'ETIMEDOUT' || error.code === 'ECONNECTION') {
      console.error("\n💡 [EMAIL] Connection Troubleshooting:");
      console.error("   - Check your network settings and firewall");
      console.error("   - Verify SMTP_HOST and SMTP_PORT are correct");
      console.error("   - For Gmail, use: SMTP_HOST=smtp.gmail.com, SMTP_PORT=587, SMTP_SECURE=false");
      console.error("   - Check deployment logs for firewall/network errors");
    }
    
    return false;
  }
};

module.exports = {
  sendOTPEmail,
  verifyEmailConnection,
  createTransporter,
};

