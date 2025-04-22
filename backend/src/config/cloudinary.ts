import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';

dotenv.config();

// Define the Cloudinary upload result type
export interface CloudinaryUploadResult {
  secure_url: string;
  public_id: string;
  version: number;
  width: number;
  height: number;
  format: string;
  created_at: string;
  resource_type: string;
  tags: string[];
  bytes: number;
  type: string;
  url: string;
  [key: string]: any; // For any additional properties
}

// Configure cloudinary with timeout settings
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  timeout: 60000, // 60 seconds timeout
});

// Add a helper function for more robust uploads
export const uploadToCloudinary = async (filePath: string | Buffer, options: any = {}): Promise<CloudinaryUploadResult> => {
  const maxRetries = 3;
  let retryCount = 0;
  let lastError = null;

  while (retryCount < maxRetries) {
    try {
      console.log(`Starting Cloudinary upload attempt ${retryCount + 1}/${maxRetries} with config:`, {
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY ? '***' : 'missing',
        api_secret: process.env.CLOUDINARY_API_SECRET ? '***' : 'missing',
      });
      
      // Check if Cloudinary credentials are properly configured
      if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
        throw new Error('Cloudinary credentials are not properly configured');
      }
      
      // Determine if we're uploading from a file path or a buffer
      const uploadOptions = {
        folder: 'social-app/profile_pictures',
        resource_type: 'auto',
        timeout: 60000, // 60 seconds timeout
        ...options
      };
      
      let result: CloudinaryUploadResult;
      
      if (typeof filePath === 'string') {
        // Upload from file path
        result = await cloudinary.uploader.upload(filePath, uploadOptions) as CloudinaryUploadResult;
      } else {
        // Upload from buffer
        result = await new Promise<CloudinaryUploadResult>((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            uploadOptions,
            (error, result) => {
              if (error) return reject(error);
              resolve(result as CloudinaryUploadResult);
            }
          );
          
          // Write buffer to upload stream
          uploadStream.end(filePath);
        });
      }
      
      console.log('Cloudinary upload successful:', result.secure_url);
      return result;
    } catch (error: any) {
      lastError = error;
      console.error(`Cloudinary upload attempt ${retryCount + 1} failed:`, error);
      
      // Check for specific error types
      if (error.code === 'ECONNREFUSED') {
        console.error('Connection to Cloudinary refused. Please check your internet connection.');
      } else if (error.code === 'ETIMEDOUT') {
        console.error('Connection to Cloudinary timed out. Please try again.');
      } else if (error.http_code === 401) {
        console.error('Cloudinary authentication failed. Please check your API credentials.');
        // Don't retry on authentication errors
        break;
      } else if (error.http_code === 400) {
        console.error(`Cloudinary error: ${error.message}`);
        // Don't retry on bad request errors
        break;
      }
      
      // Wait before retrying (exponential backoff)
      const waitTime = Math.pow(2, retryCount) * 1000;
      console.log(`Waiting ${waitTime}ms before retry...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      
      retryCount++;
    }
  }
  
  // If we've exhausted all retries, throw the last error
  throw new Error(`Failed to upload to Cloudinary after ${maxRetries} attempts: ${lastError?.message || 'Unknown error'}`);
};

export default cloudinary; 