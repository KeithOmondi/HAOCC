// controllers/authController.js
import { catchAsyncErrors } from "../middlewares/catchAsyncErrors.js";
import { User } from "../models/userModel.js";
import { sendToken } from "../utils/sendToken.js";
import { sendEmail } from "../utils/sendMail.js";
import {
  generateLoginAlertEmailTemplate,
  generatePasswordChangeEmailTemplate,
} from "../utils/emailTemplates.js";
import validator from "validator";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import cloudinary from "cloudinary";
import ErrorHandler from "../utils/ErrorHandler.js";

/* =========================================================
   🔒 Helper: Validate Password Strength
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
  if (existingUser) return next(new ErrorHandler("User already exists.", 400));

  let userRole = "User";
  if (role && ["Admin", "Agent", "User"].includes(role)) userRole = "User";

  let avatarData = {};
  if (req.files?.avatar) {
    const { avatar } = req.files;
    const allowedFormats = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowedFormats.includes(avatar.mimetype)) {
      return next(new ErrorHandler("Invalid image format. Must be JPEG, PNG, or WebP.", 400));
    }
    const uploadRes = await cloudinary.uploader.upload(avatar.tempFilePath, { folder: "avatars" });
    avatarData = { publicId: uploadRes.public_id, url: uploadRes.secure_url };
  }

  const user = new User({
    name,
    email: email.toLowerCase().trim(),
    password,
    role: userRole,
    avatar: avatarData,
    accountVerified: false,
  });

  const otp = user.generateOtp();
  await user.save();

  await sendEmail({
    email,
    subject: "Verify your account",
    html: `<p>Hello ${name},</p><p>Your OTP is <b>${otp}</b>. It expires in 10 minutes.</p>`,
  });

  res.status(201).json({
    success: true,
    message: "User registered successfully. OTP sent to email for verification.",
    user: { id: user._id, email: user.email, role: user.role },
  });
});

/* =========================================================
   ✅ Verify OTP
========================================================= */
export const verifyOTP = catchAsyncErrors(async (req, res, next) => {
  const { email, otp } = req.body;
  const user = await User.findOne({ email }).select("+verificationCode +verificationCodeExpiry");
  if (!user) return next(new ErrorHandler("User not found.", 404));

  const isValid = user.verifyOtp(otp);
  if (!isValid) return next(new ErrorHandler("Invalid or expired OTP.", 400));

  user.accountVerified = true;
  user.verificationCode = undefined;
  user.verificationCodeExpiry = undefined;
  await user.save();

  res.status(200).json({ success: true, message: "Account verified successfully. You can now log in." });
});

/* =========================================================
   ✅ Resend OTP
========================================================= */
export const resendOTP = catchAsyncErrors(async (req, res, next) => {
  const { email } = req.body;
  const user = await User.findOne({ email });
  if (!user) return next(new ErrorHandler("User not found.", 404));
  if (user.accountVerified) return next(new ErrorHandler("Account already verified.", 400));

  const otp = user.generateOtp();
  await user.save({ validateBeforeSave: false });

  await sendEmail({
    email: user.email,
    subject: "Resend OTP",
    html: `<p>Hello ${user.name},</p><p>Your new OTP is <b>${otp}</b>. It expires in 15 minutes.</p>`,
  });

  res.status(200).json({ success: true, message: "New OTP sent to email." });
});

/* =========================================================
   ✅ Login
========================================================= */
export const login = catchAsyncErrors(async (req, res, next) => {
  const { email, password } = req.body;
  if (!email || !password) return next(new ErrorHandler("Email and password are required.", 400));

  const user = await User.findOne({ email: email.toLowerCase().trim() }).select(
    "+password +loginAttempts +lockUntil +refreshToken"
  );
  if (!user) return next(new ErrorHandler("Invalid email or password.", 401));

  if (user.isLocked) {
    const unlockTimeMinutes = Math.ceil((user.lockUntil - Date.now()) / 60000);
    return res.status(423).json({
      success: false,
      accountLocked: true,
      message: `Account locked due to too many failed attempts. Try again in ${unlockTimeMinutes} minute(s).`,
    });
  }

  const isValid = await user.comparePassword(password);
  if (!isValid) {
    await user.incrementLoginAttempts();
    const attemptsLeft = Math.max(5 - (user.loginAttempts || 0), 0);
    return res.status(401).json({
      success: false,
      attemptsLeft,
      message: `Invalid email or password. ${attemptsLeft} attempt(s) remaining before lockout.`,
    });
  }

  if (!user.accountVerified)
    return next(new ErrorHandler("Account not verified. Please verify your email with OTP.", 403));

  await user.resetLoginAttempts();

  const ip = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.connection.remoteAddress || req.ip || "Unknown IP";
  const userAgent = req.headers["user-agent"] || "Unknown device";
  const time = new Date().toLocaleString();

  user.lastLogin = Date.now();
  user.loginHistory = [...(user.loginHistory || []), { ip, userAgent, time }].slice(-10);
  await user.save({ validateBeforeSave: false });

  await sendEmail({
    email: user.email,
    subject: "Security Alert: New Login Detected",
    html: generateLoginAlertEmailTemplate(user.name, ip, userAgent, time),
  });

  await sendToken(user, 200, "Login successful.", res);
});

/* =========================================================
   ✅ Forgot Password
========================================================= */
export const forgotPassword = catchAsyncErrors(async (req, res, next) => {
  const { email } = req.body;
  const user = await User.findOne({ email });
  if (!user) return next(new ErrorHandler("User not found.", 404));

  const resetToken = crypto.randomBytes(32).toString("hex");
  user.resetPasswordToken = crypto.createHash("sha256").update(resetToken).digest("hex");
  user.resetPasswordExpire = Date.now() + 15 * 60 * 1000;
  await user.save({ validateBeforeSave: false });

  const resetUrl = `${process.env.FRONTEND_URL}/password/reset/${resetToken}`;
  await sendEmail({
    email: user.email,
    subject: "Password Reset Request",
    html: `<p>Hello ${user.name},</p><p>Click the link below to reset your password. Expires in 15 minutes:</p><a href="${resetUrl}">${resetUrl}</a>`,
  });

  res.status(200).json({ success: true, message: "Password reset link sent to email." });
});

/* =========================================================
   ✅ Reset Password
========================================================= */
export const resetPassword = catchAsyncErrors(async (req, res, next) => {
  const tokenHash = crypto.createHash("sha256").update(req.params.token).digest("hex");
  const user = await User.findOne({
    resetPasswordToken: tokenHash,
    resetPasswordExpire: { $gt: Date.now() },
  }).select("+password");

  if (!user) return next(new ErrorHandler("Password reset token is invalid or expired.", 400));

  validatePassword(req.body.password);
  user.password = req.body.password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;
  await user.save();

  await sendEmail({
    email: user.email,
    subject: "Password Change Alert",
    html: generatePasswordChangeEmailTemplate(user.name),
  });

  res.status(200).json({ success: true, message: "Password reset successful." });
});

/* =========================================================
   ✅ Update Password (Logged-in)
========================================================= */
export const updatePassword = catchAsyncErrors(async (req, res, next) => {
  const user = await User.findById(req.user.id).select("+password");
  if (!user) return next(new ErrorHandler("User not found.", 404));

  const { oldPassword, newPassword } = req.body;
  if (!oldPassword || !newPassword)
    return next(new ErrorHandler("Provide old and new passwords.", 400));

  const isMatched = await user.comparePassword(oldPassword);
  if (!isMatched) return next(new ErrorHandler("Old password is incorrect.", 400));

  validatePassword(newPassword);
  user.password = newPassword;
  await user.save();

  await sendEmail({
    email: user.email,
    subject: "Password Change Alert",
    html: generatePasswordChangeEmailTemplate(user.name),
  });

  res.status(200).json({ success: true, message: "Password updated successfully." });
});

/* =========================================================
   ✅ Logout
========================================================= */
export const logout = catchAsyncErrors(async (req, res) => {
  if (req.user) {
    const user = await User.findById(req.user._id).select("+refreshToken");
    if (user) {
      user.refreshToken = undefined;
      await user.save({ validateBeforeSave: false });
    }
  }

  res
    .clearCookie("refreshToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
    })
    .status(200)
    .json({ success: true, message: "Logged out successfully." });
});

/* =========================================================
   ✅ Get Current User
========================================================= */
export const getUser = catchAsyncErrors(async (req, res) => {
  res.status(200).json({ success: true, user: req.user });
});

/* =========================================================
   ✅ Refresh Token
========================================================= */
export const refreshToken = catchAsyncErrors(async (req, res, next) => {
  const token = req.cookies.refreshToken;
  if (!token) return next(new ErrorHandler("Refresh token required.", 401));

  try {
    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.id).select("+refreshToken");
    if (!user) return next(new ErrorHandler("Invalid refresh token (User not found).", 401));
    if (!user.verifyRefreshToken(token))
      return next(new ErrorHandler("Refresh token mismatch or revoked.", 401));
    await sendToken(user, 200, "Access token refreshed.", res);
  } catch (err) {
    const user = await User.findOne({ refreshToken: token }).select("+refreshToken");
    if (user) {
      user.refreshToken = undefined;
      await user.save({ validateBeforeSave: false });
    }
    return next(new ErrorHandler("Refresh token expired or invalid.", 401));
  }
});

/* =========================================================
   ✅ Update Profile
========================================================= */
export const updateProfile = catchAsyncErrors(async (req, res, next) => {
  const user = await User.findById(req.user.id);
  if (!user) return next(new ErrorHandler("User not found", 404));

  const { name, email } = req.body;
  const updates = {};

  if (name && name.trim().length < 2)
    return next(new ErrorHandler("Name must be at least 2 characters long", 400));

  if (email) {
    if (!validator.isEmail(email))
      return next(new ErrorHandler("Please provide a valid email address", 400));

    if (email.toLowerCase().trim() !== user.email) {
      const emailExists = await User.findOne({ email: email.toLowerCase().trim() });
      if (emailExists)
        return next(new ErrorHandler("This email is already registered.", 400));
    }
  }

  if (name) updates.name = name.trim();
  if (email) updates.email = email.trim().toLowerCase();

  // Avatar Upload
  if (req.files?.avatar) {
    const { avatar } = req.files;
    const allowedFormats = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowedFormats.includes(avatar.mimetype))
      return next(new ErrorHandler("Invalid image format.", 400));

    if (user.avatar?.publicId) await cloudinary.uploader.destroy(user.avatar.publicId);
    const uploadRes = await cloudinary.uploader.upload(avatar.tempFilePath, { folder: "avatars" });
    updates.avatar = { publicId: uploadRes.public_id, url: uploadRes.secure_url };
  }

  // Remove avatar
  if (req.body.removeAvatar === "true" || req.body.removeAvatar === true) {
    if (user.avatar?.publicId) await cloudinary.uploader.destroy(user.avatar.publicId);
    updates.avatar = { url: "", publicId: "" };
  }

  Object.assign(user, updates);
  await user.save({ validateBeforeSave: true });

  res.status(200).json({ success: true, message: "Profile updated successfully.", user });
});
