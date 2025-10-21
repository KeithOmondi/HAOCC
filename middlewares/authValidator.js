import { body, validationResult } from "express-validator";

// Validation rules for register
export const registerValidation = [
  body("name")
    .trim()
    .notEmpty().withMessage("Name is required")
    .isLength({ min: 2 }).withMessage("Name must be at least 2 characters"),

  body("email")
    .trim()
    .isEmail().withMessage("Valid email is required"),

  body("password")
    .isString().withMessage("Password must be a string")
    .isLength({ min: 6 }).withMessage("Password must be at least 6 characters"),
];

// Middleware to handle validation results
export const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array().map(err => ({ field: err.param, msg: err.msg })),
    });
  }
  next();
};
