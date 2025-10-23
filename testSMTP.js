import dotenv from "dotenv";
import nodemailer from "nodemailer";

dotenv.config();

const testSMTP = async () => {
  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });

  try {
    await transporter.verify();
    console.log("SMTP connection successful!");
  } catch (err) {
    console.error("SMTP connection failed:", err);
  }
};

testSMTP();
