export const sendToken = async (user, statusCode, message, res) => {
  const accessToken = user.getJwtToken();

  // Generate + set refresh token
  const refreshToken = user.setRefreshToken();
  await user.save({ validateBeforeSave: false });

  const safeUser = user.toObject();
  delete safeUser.password;
  delete safeUser.refreshToken;

  // Send refresh token in HttpOnly cookie
  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    maxAge:
      Number(process.env.JWT_REFRESH_COOKIE_EXPIRE || 7) *
      24 *
      60 *
      60 *
      1000,
  });

  return res.status(statusCode).json({
    success: true,
    message,
    user: safeUser,
    accessToken,
  });
};
