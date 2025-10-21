// utils/sendVerificationCode.js

import { sendEmail } from "./sendMail.js";
import { generateVerificationotpEmailTemplate } from "./emailTemplates.js";

/**
 * Sends a numeric OTP/Verification Code to a user's email address.
 * * @param {string} to - The recipient's email address.
 * @param {string} code - The 6-digit numeric verification code (as a string).
 * @param {string} subject - The subject line for the email.
 */
export async function sendVerificationCode(to, code, subject = "Account Verification Code") {
  // Basic validation
  if (!to || !code || isNaN(Number(code))) {
    throw new Error("Valid recipient email and numeric verification code are required.");
  }

  const html = generateVerificationotpEmailTemplate(code);
  const text = `Your verification code is: ${code}. It is valid for 15 minutes.`;

  await sendEmail({
    to: to, // Ensure your sendMail utility uses 'to' or update this property name
    subject: subject,
    message: text, // Fallback text message
    html: html,
  });
}