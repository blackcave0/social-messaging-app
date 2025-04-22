import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/social-messaging-app';

const connectDB = async (): Promise<void> => {
  try {
    if (!process.env.MONGODB_URI) {
      console.warn('MONGODB_URI not provided. Running without MongoDB connection.');
      console.warn('Some features may not work properly without MongoDB.');
      return;
    }
    
    await mongoose.connect(MONGODB_URI);
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    console.warn('Running without MongoDB connection. Some features may not work properly.');
    // Don't exit the process, allow the app to run with Supabase only
  }
};

export default connectDB; 