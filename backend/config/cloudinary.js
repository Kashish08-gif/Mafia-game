import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

/**
 * Upload an image buffer directly to Cloudinary using upload_stream
 * @param {Buffer} buffer - File buffer from multer memory storage
 * @param {Object} options - Cloudinary upload options
 * @returns {Promise<Object>} - Cloudinary upload result
 */
export const uploadImageToCloudinary = (buffer, customOptions = {}) => {
  return new Promise((resolve, reject) => {
    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
      return reject(
        new Error("Cloudinary environment variables (CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET) are not configured.")
      );
    }

    const defaultOptions = {
      folder: "mafia_avatars",
      resource_type: "image",
      transformation: [
        { width: 500, height: 500, crop: "limit" },
        { quality: "auto" },
        { fetch_format: "auto" }
      ],
      ...customOptions,
    };

    const stream = cloudinary.uploader.upload_stream(
      defaultOptions,
      (error, result) => {
        if (error) {
          console.error("Cloudinary upload stream error:", error);
          return reject(error);
        }
        resolve(result);
      }
    );

    stream.end(buffer);
  });
};

/**
 * Delete an image from Cloudinary by public ID
 * @param {string} publicId
 * @returns {Promise<Object>}
 */
export const deleteImageFromCloudinary = async (publicId) => {
  try {
    if (!publicId) return null;
    return await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error("Error deleting image from Cloudinary:", error);
    return null;
  }
};

export default cloudinary;
