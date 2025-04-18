import { Request, Response } from 'express';
import Post from '../models/Post';
import User from '../models/User';
import cloudinary from '../config/cloudinary';
import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';

// Create a new post with images
export const createPost = async (req: Request, res: Response) => {
  try {
    // console.log('Create post request received');
    // console.log('Request body:', req.body);
    // console.log('Files:', req.files || req.file || 'No files');
    
    const { description, mood } = req.body;
    
    // Check if user is in request object (set by auth middleware)
    if (!req.user || !req.user._id) {
      console.error('User not found in request', req.user);
      return res.status(401).json({ message: 'User not authenticated' });
    }
    
    const userId = req.user._id;
    // console.log('User ID from request:', userId);

    // Check if user exists in database
    const user = await User.findById(userId);
    if (!user) {
      console.error('User not found in database for ID:', userId);
      return res.status(404).json({ message: 'User not found' });
    }

    // Handle image uploads if files exist
    let imageUrls: string[] = [];
    
    if (req.files && Array.isArray(req.files)) {
      // console.log(`Processing ${req.files.length} files`);
      
      // Upload each file to Cloudinary
      const uploadPromises = req.files.map(async (file, index) => {
        try {
          // console.log(`Uploading file ${index + 1}:`, file.path);
          
          // Upload to Cloudinary
          const result = await cloudinary.uploader.upload(file.path, {
            folder: 'social-app/posts',
          });
          
          // console.log(`File ${index + 1} uploaded successfully:`, result.secure_url);
          
          // Delete local file after upload
          fs.unlinkSync(file.path);
          
          return result.secure_url;
        } catch (error) {
          console.error(`Error uploading file ${index + 1} to Cloudinary:`, error);
          throw error;
        }
      });
      
      // Wait for all uploads to complete
      imageUrls = await Promise.all(uploadPromises);
      // console.log('All files uploaded successfully. URLs:', imageUrls);
    } else if (req.file) {
      // If only a single file was uploaded
      // console.log('Processing single file:', req.file.path);
      
      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: 'social-app/posts',
      });
      
      // console.log('File uploaded successfully:', result.secure_url);
      
      // Delete local file after upload
      fs.unlinkSync(req.file.path);
      
      imageUrls = [result.secure_url];
    } else {
      // console.log('No files to upload');
    }

    // Create new post
    // console.log('Creating new post with data:', {
    //   userId,
    //   description,
    //   mood,
    //   imageCount: imageUrls.length
    // });
    
    const newPost = new Post({
      user: userId,
      description,
      mood,
      images: imageUrls,
    });

    // Save post to database
    const savedPost = await newPost.save();
    // console.log('Post saved successfully, ID:', savedPost._id);

    // Add post to user's posts
    await User.findByIdAndUpdate(userId, {
      $push: { posts: savedPost._id },
    });
    // console.log('Post added to user document');

    res.status(201).json({
      success: true,
      data: savedPost,
    });
  } catch (error) {
    console.error('Create post error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error instanceof Error ? error.message : 'An unknown error occurred',
    });
  }
};

// Get all posts
export const getAllPosts = async (req: Request, res: Response) => {
  try {
    // console.log('Getting all posts');
    
    // First try without comments population to avoid issues
    const posts = await Post.find()
      .sort({ createdAt: -1 })
      .populate('user', '_id name username profilePicture');
      
    // console.log(`Found ${posts.length} posts`);
    
    res.status(200).json({
      success: true,
      count: posts.length,
      data: posts,
    });
  } catch (error) {
    console.error('Error in getAllPosts:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error instanceof Error ? error.message : 'An unknown error occurred',
    });
  }
};

// Get a single post
export const getPostById = async (req: Request, res: Response) => {
  try {
    // console.log(`Getting post with ID: ${req.params.id}`);
    
    // First try without comments population to avoid issues
    const post = await Post.findById(req.params.id)
      .populate('user', '_id name username profilePicture');

    if (!post) {
      // console.log(`Post with ID ${req.params.id} not found`);
      return res.status(404).json({
        success: false,
        message: 'Post not found',
      });
    }

    // console.log(`Successfully retrieved post: ${post._id}`);
    
    res.status(200).json({
      success: true,
      data: post,
    });
  } catch (error) {
    console.error(`Error in getPostById for ID ${req.params.id}:`, error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error instanceof Error ? error.message : 'An unknown error occurred',
    });
  }
}; 