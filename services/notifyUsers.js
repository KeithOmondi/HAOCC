import cron from "node-cron";
import { User } from "../models/userModel.js"; // ✅ fixed
import { sendEmail } from "../utils/sendMail.js";

export const notifyUsers = () => {
  // Runs every 30 minutes
  cron.schedule("*/30 * * * *", async () => {
    try {
      // Example: find all users to notify (you can filter as needed)
      const users = await User.find({ shouldNotify: true });

      for (const user of users) {
        if (user.email) {
          await sendEmail({
            email: user.email,
            subject: "Reminder Notification",
            message: `Hi ${user.name},\n\nThis is a friendly reminder.\n\nThank you!`,
          });

          console.log(`Notification email sent to ${user.email}.`);
        }
      }
    } catch (error) {
      console.error("Error in notifyUsers service:", error);
    }
  });
};
