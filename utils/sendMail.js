import nodemailer from "nodemailer";

export const sendEmail = async ({ email, subject, message, html }) => {
  if (!email || !subject || (!message && !html)) {
    throw new Error("Email, subject, and either message or HTML content are required.");
  }

  try {
    const port = Number(process.env.SMTP_PORT) || 587;
    const secure = port === 465; // only true for 465 (SSL)

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port,
      secure,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      tls: {
        rejectUnauthorized: true, // ✅ safer for production
      },
      connectionTimeout: 10000, // 10s timeout to avoid indefinite waits
    });

    const mailOptions = {
      from: `"HaoChapChap" <${process.env.SMTP_USER}>`,
      to: email,
      subject,
      text: message || "",
      html: html || "",
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("✅ Email sent successfully:", info.response);
    return info;
  } catch (error) {
    console.error("❌ Email sending error:", error);
    throw new Error("Failed to send email. Please try again later.");
  }
};
