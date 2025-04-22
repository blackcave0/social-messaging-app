import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Upload a file to Cloudinary
 * @param filePath - Path to the file to upload
 * @param folder - Folder in Cloudinary to upload to
 * @param userId - Optional user ID for user-specific folders
 * @returns Promise with Cloudinary upload result
 */
export const uploadToCloudinary = async (filePath: string, folder: string = 'uploads', userId?: string) => {
  try {
    // Determine the upload folder path
    let uploadFolder = folder;

    // For stories, create a user-specific folder structure
    if (folder === 'stories' && userId) {
      uploadFolder = `social-app/stories/${userId}`;
    } else if (folder === 'stories') {
      uploadFolder = 'social-app/stories';
    }

    // Upload the file to Cloudinary
    const result = await cloudinary.uploader.upload(filePath, {
      folder: uploadFolder,
      resource_type: 'auto', // auto-detect if it's an image or video
    });

    // Delete the local file after successful upload
    fs.unlinkSync(filePath);

    return result;
  } catch (error) {
    // Delete the local file in case of error
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    console.error('Error uploading to Cloudinary:', error);
    throw error;
  }
};

/**
 * Delete a file from Cloudinary
 * @param publicId - Public ID of the file to delete
 * @returns Promise with Cloudinary deletion result
 */
export const deleteFromCloudinary = async (publicId: string) => {
  try {
    return await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error('Error deleting from Cloudinary:', error);
    throw error;
  }
}; 