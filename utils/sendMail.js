// utils/sendEmail.js
import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

export const sendEmail = async ({ email, subject, text, html }) => {
  if (!email || !subject || (!text && !html)) {
    throw new Error("Email, subject, and either text or HTML content are required.");
  }

  // Ensure environment variables are set
  const { SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_USER || !SMTP_PASS) {
    throw new Error("SMTP_USER or SMTP_PASS not set in environment.");
  }

  // Choose secure/port automatically
  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465, // default SSL port
    secure: true, // true for port 465
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
    tls: {
      rejectUnauthorized: true, // safer for production
    },
    connectionTimeout: 10000, // 10s timeout
  });

  try {
    // Verify connection before sending
    await transporter.verify();
    console.log("✅ SMTP connection successful");

    const mailOptions = {
      from: `"HaoChapChap" <${SMTP_USER}>`,
      to: email,
      subject,
      text: text || "",
      html: html || "",
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("✅ Email sent:", info.response);
    return info;
  } catch (err) {
    console.error("❌ SMTP/email sending error:", err);
    throw new Error("Failed to send email. Please try again later.");
  }
};
