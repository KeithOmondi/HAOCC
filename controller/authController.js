// controllers/authController.js
import { catchAsyncErrors } from "../middlewares/catchAsyncErrors.js";
import ErrorHandler from "../middlewares/errorMiddlewares.js";
import { User } from "../models/userModel.js";
// Removed: import Supplier from "../models/Supplier.js";
import { sendToken } from "../utils/sendToken.js";
import { sendEmail } from "../utils/sendMail.js";
import { generateOTP } from "../utils/generateOTP.js";
import {
  generateLoginAlertEmailTemplate,
  generatePasswordChangeEmailTemplate,
} from "../utils/emailTemplates.js";
import validator from "validator";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import cloudinary from "cloudinary";

/* =========================================================
   Helper: Validate password strength
========================================================= */
const validatePassword = (password) => {
  const isStrong = validator.isStrongPassword(password, {
    minLength: 8,
    minLowercase: 1,
    minUppercase: 1,
    minNumbers: 1,
    minSymbols: 1,
  });

  if (!isStrong) {
    throw new ErrorHandler(
      "Password must be at least 8 characters long and include uppercase, lowercase, number, and symbol.",
      400
    );
  }
};


/* =========================================================
   ✅ Register
========================================================= */
export const register = catchAsyncErrors(async (req, res, next) => {
  const { name, email, password, role } = req.body;

  if (!name || !email || !password) {
    return next(new ErrorHandler("Please provide name, email, and password.", 400));
  }

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return next(new ErrorHandler("User already exists.", 400));
  }

  // Default role for public registration
  let userRole = "User";
  if (role && ["Admin", "Agent", "User"].includes(role)) {
    userRole = "User"; // Public can't self-assign elevated roles
  }

  let avatarData = {};
  if (req.files?.avatar) {
    const { avatar } = req.files;
    const allowedFormats = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

    if (!allowedFormats.includes(avatar.mimetype)) {
      return next(new ErrorHandler("Invalid image format. Must be JPEG, PNG, or WebP.", 400));
    }

    const uploadRes = await cloudinary.uploader.upload(avatar.tempFilePath, {
      folder: "avatars",
    });

    avatarData = {
      publicId: uploadRes.public_id,
      url: uploadRes.secure_url,
    };
  }

  // Create user first without OTP fields
  const user = new User({
    name,
    email: email.toLowerCase().trim(),
    password,
    role: userRole,
    avatar: avatarData,
    accountVerified: false,
  });

  // Generate OTP using the schema method (it hashes it automatically)
  const otp = user.generateOtp();
  await user.save();

  // Send email with the plain OTP
  await sendEmail({
    email,
    subject: "Verify your account",
    html: `<p>Hello ${name},</p>
           <p>Your OTP is <b>${otp}</b>. It expires in 10 minutes.</p>`,
  });

  res.status(201).json({
    success: true,
    message: "User registered successfully. OTP sent to email for verification.",
    user: { id: user._id, email: user.email, role: user.role },
  });
});


/* --------------------------------------------------------- */

/* =========================================================
   ✅ Verify OTP
========================================================= */
export const verifyOTP = catchAsyncErrors(async (req, res, next) => {
  const { email, otp } = req.body;

  const user = await User.findOne({ email }).select("+verificationCode +verificationCodeExpiry");

  if (!user) {
    return next(new ErrorHandler("User not found.", 404));
  }

  const isValid = user.verifyOtp(otp);

  if (!isValid) {
    return next(new ErrorHandler("Invalid or expired OTP.", 400));
  }

  user.accountVerified = true;
  user.verificationCode = undefined;
  user.verificationCodeExpiry = undefined;
  await user.save();

  res.status(200).json({
    success: true,
    message: "Account verified successfully. You can now log in.",
  });
});



/* --------------------------------------------------------- */

/* =========================================================
   ✅ Resend OTP
========================================================= */
export const resendOTP = catchAsyncErrors(async (req, res, next) => {
  const { email } = req.body;
  const user = await User.findOne({ email });
  if (!user) return next(new ErrorHandler("User not found.", 404));
  if (user.accountVerified)
    return next(new ErrorHandler("Account already verified.", 400)); // Generate and store new OTP

  const otp = user.generateOtp(); // Using the model's method to generate and hash/store OTP
  await user.save({ validateBeforeSave: false });

  await sendEmail({
    email: user.email,
    subject: "Resend OTP",
    html: `<p>Hello ${user.name},</p><p>Your new OTP is <b>${otp}</b>. It expires in 15 minutes.</p>`,
  });
  
  res.status(200).json({ success: true, message: "New OTP sent to email." });
});

/* --------------------------------------------------------- */

/* =========================================================
   ✅ Login Controller
========================================================= */
export const login = catchAsyncErrors(async (req, res, next) => {
  const body = req.body || {};
  const { email, password } = body; // 1. Validate input

  if (!email || !password) {
    return next(new ErrorHandler("Email and password are required.", 400));
  } // 2. Find user and select sensitive/security fields

  const user = await User.findOne({ email: email.toLowerCase().trim() }).select(
    "+password +loginAttempts +lockUntil +refreshToken"
  );

  if (!user) {
    return next(new ErrorHandler("Invalid email or password.", 401));
  } // 3. Account locked check

  if (user.isLocked) {
    const unlockTimeMinutes = Math.ceil((user.lockUntil - Date.now()) / 60000);
    return res.status(423).json({
      success: false,
      accountLocked: true,
      message: `Account locked due to too many failed attempts. Try again in ${unlockTimeMinutes} minute(s).`,
    });
  } // 4. Verify password

  const isValid = await user.comparePassword(password);
  if (!isValid) {
    await user.incrementLoginAttempts();
    const attemptsLeft = Math.max(5 - (user.loginAttempts || 0), 0);
    return res.status(401).json({
      success: false,
      attemptsLeft,
      message: `Invalid email or password. ${attemptsLeft} attempt(s) remaining before lockout.`,
    });
  } // 5. Account Verification Check

  if (!user.accountVerified) {
    return next(
      new ErrorHandler(
        "Account not verified. Please verify your email with OTP.",
        403
      )
    );
  } // 6. Login successful: Reset attempts

  await user.resetLoginAttempts(); 

  // 7. Record login history and prepare data for alert email
  const ip =
    req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    req.connection.remoteAddress ||
    req.ip ||
    "Unknown IP";
  const userAgent = req.headers["user-agent"] || "Unknown device";
  const time = new Date().toLocaleString(); 

  user.lastLogin = Date.now();
  user.loginHistory = [
    ...(user.loginHistory || []),
    { ip, userAgent, time },
  ].slice(-10); // Keep last 10 entries
  await user.save({ validateBeforeSave: false }); 

  // 8. Send login alert email (The complete object structure you requested)
await sendEmail({
  email: user.email, // ✅ FIXED
  subject: "Security Alert: New Login Detected",
  html: generateLoginAlertEmailTemplate(user.name, ip, userAgent, time),
});


  // 9. Send JWT token (Access Token via body, Refresh Token via cookie)
  await sendToken(user, 200, "Login successful.", res);
});

/* --------------------------------------------------------- */

/* =========================================================
   ✅ Forgot Password
========================================================= */
export const forgotPassword = catchAsyncErrors(async (req, res, next) => {
  const { email } = req.body;
  const user = await User.findOne({ email });
  if (!user) return next(new ErrorHandler("User not found.", 404));

  const resetToken = crypto.randomBytes(32).toString("hex");
  user.resetPasswordToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");
  user.resetPasswordExpire = Date.now() + 15 * 60 * 1000; // 15 mins expiry
  await user.save({ validateBeforeSave: false });

  const resetUrl = `${process.env.FRONTEND_URL}/password/reset/${resetToken}`;
  await sendEmail({
    to: user.email,
    subject: "Password Reset Request",
    html: `<p>Hello ${user.name},</p><p>Click the link below to reset your password. This link expires in 15 minutes:</p><a href="${resetUrl}">${resetUrl}</a>`,
  });

  res
    .status(200)
    .json({ success: true, message: "Password reset link sent to email." });
});

/* --------------------------------------------------------- */

/* =========================================================
   ✅ Reset Password
========================================================= */
export const resetPassword = catchAsyncErrors(async (req, res, next) => {
  const tokenHash = crypto
    .createHash("sha256")
    .update(req.params.token)
    .digest("hex");
  const user = await User.findOne({
    resetPasswordToken: tokenHash,
    resetPasswordExpire: { $gt: Date.now() }, // $gt: greater than current time
  }).select("+password"); // Need to select password to hash the new one

  if (!user)
    return next(
      new ErrorHandler("Password reset token is invalid or expired.", 400)
    ); // Validate and set new password

  validatePassword(req.body.password);
  user.password = req.body.password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;
  await user.save(); // Pre-save hook hashes the new password // Send alert

  await sendEmail({
    to: user.email, // changed from 'email' to 'to' to match sendEmail standard
    subject: "Password Change Alert",
    html: generatePasswordChangeEmailTemplate(user.name),
  });

  res
    .status(200)
    .json({ success: true, message: "Password reset successful." });
});

/* --------------------------------------------------------- */

/* =========================================================
   ✅ Update Password (logged in)
========================================================= */
export const updatePassword = catchAsyncErrors(async (req, res, next) => {
  // req.user.id is set by the auth middleware
  const user = await User.findById(req.user.id).select("+password");
  if (!user) return next(new ErrorHandler("User not found.", 404));

  const { oldPassword, newPassword } = req.body;
  if (!oldPassword || !newPassword)
    return next(new ErrorHandler("Provide old and new passwords.", 400));

  const isMatched = await user.comparePassword(oldPassword);
  if (!isMatched)
    return next(new ErrorHandler("Old password is incorrect.", 400));

  validatePassword(newPassword);
  user.password = newPassword;
  await user.save(); // Pre-save hook hashes the new password

  await sendEmail({
    to: user.email, // changed from 'email' to 'to'
    subject: "Password Change Alert",
    html: generatePasswordChangeEmailTemplate(user.name),
  });

  res
    .status(200)
    .json({ success: true, message: "Password updated successfully." });
});

/* --------------------------------------------------------- */

/* =========================================================
   ✅ Logout
========================================================= */
export const logout = catchAsyncErrors(async (req, res) => {
  // Clear refresh token from database if user is logged in
  if (req.user) {
    // Select the refresh token field to clear it
    const user = await User.findById(req.user._id).select("+refreshToken");
    if (user) {
      user.refreshToken = undefined;
      await user.save({ validateBeforeSave: false });
    }
  } // Clear the refresh token cookie

  res
    .clearCookie("refreshToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
    })
    .status(200)
    .json({ success: true, message: "Logged out successfully." });
});

/* --------------------------------------------------------- */

/* =========================================================
   ✅ Get Current User
========================================================= */
export const getUser = catchAsyncErrors(async (req, res) => {
  res.status(200).json({ success: true, user: req.user });
});

/* --------------------------------------------------------- */

/* =========================================================
   ✅ Refresh Token
========================================================= */
export const refreshToken = catchAsyncErrors(async (req, res, next) => {
  const token = req.cookies.refreshToken;
  if (!token) return next(new ErrorHandler("Refresh token required.", 401)); // 1. Verify the token using the secret (standard JWT verification)

  try {
    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);

    // 2. Find the user by the ID from the decoded payload
    // We must select the HASHED refresh token from the DB to compare against
    const user = await User.findById(decoded.id).select("+refreshToken");

    if (!user)
      return next(
        new ErrorHandler("Invalid refresh token (User not found).", 401)
      );

    // 3. Verify the unhashed cookie token against the stored hashed token
    if (!user.verifyRefreshToken(token)) {
      // If the token is valid but doesn't match the stored hash, it's a security breach
      return next(new ErrorHandler("Refresh token mismatch or revoked.", 401));
    } // 4. Token is valid and matched, issue a new access token

    await sendToken(user, 200, "Access token refreshed.", res);
  } catch (err) {
    // If verification fails (e.g., token expired), clear the cookie/DB token
    const user = await User.findOne({ refreshToken: token }).select(
      "+refreshToken"
    );
    if (user) {
      user.refreshToken = undefined;
      await user.save({ validateBeforeSave: false });
    }
    return next(new ErrorHandler("Refresh token expired or invalid.", 401));
  }
});

/* --------------------------------------------------------- */

/* =========================================================
   ✅ Update Profile (logged in)
========================================================= */
export const updateProfile = catchAsyncErrors(async (req, res, next) => {
  const user = await User.findById(req.user.id);
  if (!user) return next(new ErrorHandler("User not found", 404));

  const { name, email } = req.body;
  const updates = {}; // 1. Validate inputs

  if (name && name.trim().length < 2) {
    return next(
      new ErrorHandler("Name must be at least 2 characters long", 400)
    );
  }

  if (email) {
    if (!validator.isEmail(email)) {
      return next(
        new ErrorHandler("Please provide a valid email address", 400)
      );
    }
    // Check if the new email is already in use by another user
    if (email.toLowerCase().trim() !== user.email) {
      const emailExists = await User.findOne({
        email: email.toLowerCase().trim(),
      });
      if (emailExists) {
        return next(new ErrorHandler("This email is already registered.", 400));
      }
    }
  }

  if (name) updates.name = name.trim();
  if (email)
    updates.email = email.trim().toLowerCase(); /* -------------------------
     ✅ Handle Avatar Upload
  ------------------------- */

  if (req.files && req.files.avatar) {
    const { avatar } = req.files;
    const allowedFormats = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
    ];

    if (!allowedFormats.includes(avatar.mimetype)) {
      return next(
        new ErrorHandler(
          "Please upload a valid image format (JPEG, PNG, WebP).",
          400
        )
      );
    } // Delete old avatar if exists

    if (user.avatar?.publicId) {
      // Updated to publicId
      await cloudinary.uploader.destroy(user.avatar.publicId);
    } // Upload new one

    const uploadRes = await cloudinary.uploader.upload(avatar.tempFilePath, {
      folder: "avatars",
    });

    updates.avatar = {
      publicId: uploadRes.public_id, // Updated to publicId
      url: uploadRes.secure_url,
    };
  }

  // If the user wants to remove the avatar (e.g., passing a field like removeAvatar: true)
  if (req.body.removeAvatar === "true" || req.body.removeAvatar === true) {
    if (user.avatar?.publicId) {
      await cloudinary.uploader.destroy(user.avatar.publicId);
    }
    updates.avatar = { url: "", publicId: "" };
  } // Apply updates and save

  Object.assign(user, updates);
  await user.save({ validateBeforeSave: true }); // Ensure validation runs if changing email/name

  res.status(200).json({
    success: true,
    message: "Profile updated successfully.",
    user,
  });
});
