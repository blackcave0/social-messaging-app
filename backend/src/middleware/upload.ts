import multer from 'multer';
import { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';

// Configure multer for memory storage
const storage = multer.memoryStorage();

// File filter function to accept only image files
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Log the incoming file details
  console.log('Processing file upload:', {
    originalname: file.originalname,
    mimetype: file.mimetype,
    size: file.size,
  });

  // Check if file exists
  if (!file) {
    console.error('No file provided in request');
    return cb(null, false);
  }

  // Validate file type
  const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (!allowedMimeTypes.includes(file.mimetype)) {
    console.error('Invalid file type:', file.mimetype);
    return cb(null, false);
  }

  // Validate file size (5MB limit)
  const maxSize = 5 * 1024 * 1024; // 5MB in bytes
  if (file.size > maxSize) {
    console.error('File too large:', file.size, 'bytes');
    return cb(null, false);
  }

  // File is valid
  console.log('File validation passed');
  cb(null, true);
};

// Create multer upload instance
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

// Error handling middleware
export const handleUploadError = (err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Upload error:', err);

  if (err instanceof multer.MulterError) {
    // Handle Multer-specific errors
    console.error('Multer error details:', {
      code: err.code,
      message: err.message,
      field: err.field
    });
    
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File size exceeds 5MB limit' });
    } else if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ error: 'Too many files uploaded' });
    } else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({ 
        error: 'Unexpected field name in upload request',
        details: `Expected field name: ${err.field || 'unknown'}`
      });
    }
    return res.status(400).json({ error: `Upload error: ${err.message}` });
  }

  if (err) {
    // Handle other errors
    console.error('Non-Multer upload error:', err);
    return res.status(400).json({ error: err.message });
  }

  next();
};

// Middleware to ensure upload directory exists
export const ensureUploadDir = (req: Request, res: Response, next: NextFunction) => {
  const uploadDir = path.join(__dirname, '../../uploads');
  
  if (!fs.existsSync(uploadDir)) {
    console.log('Creating uploads directory');
    fs.mkdirSync(uploadDir, { recursive: true });
  }
  
  next();
};

export default upload; 