import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import validator from "validator";

// ------------------- Address SubSchema -------------------
const addressSchema = new mongoose.Schema(
  {
    street: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    state: { type: String, required: true, trim: true },
    postalCode: { type: String, required: true, trim: true },
    country: { type: String, required: true, trim: true },
    isDefault: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// ------------------- Main User Schema -------------------
const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },

    email: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
      lowercase: true,
      validate: [validator.isEmail, "Please provide a valid email"],
    },

    password: {
      type: String,
      required: true,
      minlength: 8,
      select: false,
    },

    role: {
      // Updated to Admin, Agent, User
      type: String,
      enum: ["Admin", "Agent", "User"],
      default: "User",
    },

    accountVerified: { type: Boolean, default: false },

    // ------------------- Agent / Property Integration -------------------
    // Properties listed by this Agent (if role is Agent)
    listedProperties: [
      { type: mongoose.Schema.Types.ObjectId, ref: "Property" },
    ],
    
    // ------------------- OTP / Verification -------------------
    verificationCode: { type: String, select: false },
    verificationCodeExpiry: { type: Date },
    otpAttempts: { type: Number, default: 0 },
    resendAttempts: { type: Number, default: 0 },
    lastOtpSentAt: { type: Date },

    // ------------------- Password Reset -------------------
    resetPasswordToken: { type: String, select: false },
    resetPasswordExpire: { type: Date },

    // ------------------- Profile Data -------------------
    avatar: {
      url: { type: String },
      publicId: { type: String },
    },

    recentlyViewed: [{ type: mongoose.Schema.Types.ObjectId, ref: "Property" }], // Changed from Product to Property
    // orders: [{ type: mongoose.Schema.Types.ObjectId, ref: "Order" }], // Assuming 'Orders' might not fit a property app

    // ------------------- Security / Throttling -------------------
    loginAttempts: { type: Number, required: true, default: 0 },
    lockUntil: { type: Date },
    refreshToken: { type: String, select: false }, // Hashed refresh token storage

    // ------------------- Analytics -------------------
    lastLogin: { type: Date },
    loginHistory: [
      {
        ip: String,
        userAgent: String,
        time: { type: Date, default: Date.now }, // Use Date type for better sorting/querying
      },
    ],

    // ------------------- Embedded Data -------------------
    addresses: [addressSchema],
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_, obj) => {
        // Clean up sensitive fields before sending JSON response
        delete obj.password;
        delete obj.resetPasswordToken;
        delete obj.resetPasswordExpire;
        delete obj.verificationCode;
        delete obj.verificationCodeExpiry;
        delete obj.refreshToken;
        delete obj.loginAttempts;
        delete obj.lockUntil;
        return obj;
      },
    },
  }
);

// ------------------- Pre-save Middleware: Password Hashing -------------------
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// ------------------- Methods: Authentication & Tokens -------------------
userSchema.methods.comparePassword = async function (candidatePassword) {
  // Explicitly check for password existence before comparing
  if (!this.password) {
        // We must select the password field for this method to work outside of creation
        console.error("Password field not selected for comparison."); 
        return false;
    }
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.getJwtToken = function () {
  return jwt.sign({ id: this._id, role: this.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || "15m",
  });
};

// 🔒 Secure Refresh Token Handling
userSchema.methods.setRefreshToken = function () {
  // Create the raw, unhashed refresh token
  const refreshToken = jwt.sign({ id: this._id }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRE || "7d",
  });

  // Store the HASHED version in the database
  this.refreshToken = crypto.createHash("sha256").update(refreshToken).digest("hex");
  
  // Return the RAW token to be set as an HttpOnly cookie
  return refreshToken; 
};

userSchema.methods.verifyRefreshToken = function (token) {
  // Hash the incoming token and compare it to the stored hash
  const hashed = crypto.createHash("sha256").update(token).digest("hex");
  return this.refreshToken === hashed;
};

// ------------------- Methods: OTP -------------------
userSchema.methods.generateOtp = function () {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  this.verificationCode = crypto.createHash("sha256").update(otp).digest("hex");
  this.verificationCodeExpiry = Date.now() + 10 * 60 * 1000; // 10 minutes from now
  return otp;
};

userSchema.methods.verifyOtp = function (otp) {
  const hashedOtp = crypto.createHash("sha256").update(otp).digest("hex");
  // Check both hash match AND if the expiry time is in the future
  return this.verificationCode === hashedOtp && this.verificationCodeExpiry > Date.now();
};

// ------------------- Login Throttling & Account Lockout -------------------
userSchema.virtual("isLocked").get(function () {
  // Returns true if lockUntil exists and is a future time
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

userSchema.methods.incrementLoginAttempts = async function () {
  const LOCK_LIMIT = 5; // Max attempts before locking
  const LOCK_DURATION = 10 * 60 * 1000; // 10 minutes lock

  // 1. If the current lock time has passed, reset attempts
  if (this.lockUntil && this.lockUntil < Date.now()) {
    this.loginAttempts = 1;
    this.lockUntil = undefined;
  } else {
    // 2. Increment attempts
    this.loginAttempts = (this.loginAttempts || 0) + 1;
    
    // 3. If attempts exceed limit and not currently locked, set lock time
    if (this.loginAttempts >= LOCK_LIMIT && !this.isLocked) {
      this.lockUntil = Date.now() + LOCK_DURATION;
    }
  }
  return this.save();
};

userSchema.methods.resetLoginAttempts = async function () {
  this.loginAttempts = 0;
  this.lockUntil = undefined;
  return this.save();
};


export const User = mongoose.model("User", userSchema);
export default User;