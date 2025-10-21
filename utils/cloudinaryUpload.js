// utils/cloudinaryUpload.js
import streamifier from "streamifier";
import cloudinary from "./cloudinary.js";

export const uploadToCloudinary = (fileBuffer, folder = "properties") => {
  return new Promise((resolve, reject) => {
    const cldUploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: "auto", // supports image, audio, video
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result.secure_url);
      }
    );

    streamifier.createReadStream(fileBuffer).pipe(cldUploadStream);
  });
};

// ✅ ADD THIS FUNCTION BELOW
export const cloudinaryDelete = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result;
  } catch (error) {
    throw new Error("Failed to delete image from Cloudinary: " + error.message);
  }
};
