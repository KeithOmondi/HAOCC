// utils/sendToken.js
export const sendToken = async (user, statusCode, message, res) => {
  // Generate short-lived access token
  const accessToken = user.getJwtToken();

  // Generate + set refresh token (hashed in DB, raw returned here)
  const refreshToken = user.setRefreshToken();
  await user.save({ validateBeforeSave: false });

  // Convert to plain object and strip sensitive fields
  const safeUser = user.toObject();
  delete safeUser.password;
  delete safeUser.refreshToken;

  // Send refresh token in secure HttpOnly cookie
  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production", // send only over HTTPS in prod
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    maxAge:
      Number(process.env.JWT_REFRESH_COOKIE_EXPIRE || 7) *
      24 *
      60 *
      60 *
      1000, // default 7 days
  });

  // Send access token + user in response body
  return res.status(statusCode).json({
    success: true,
    message,
    user: safeUser,
    accessToken,
  });
};
