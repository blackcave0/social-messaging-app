import express from 'express';
import { createPost, getAllPosts, getPostById } from '../controllers/postController';
import upload from '../middleware/upload';
import { auth } from '../middleware/auth';
import { optionalAuth } from '../middleware/optionalAuth';

const router = express.Router();

// Create a new post with image uploads (up to 5 images)
router.post('/', auth, upload.array('images', 5), createPost);

// Get all posts - use optional auth to still identify user if token exists
router.get('/', optionalAuth, getAllPosts);

// Get post by ID
router.get('/:id', getPostById);

export default router; 