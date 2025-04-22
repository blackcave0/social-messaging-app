import express from 'express';
import { createStory, viewStory, getFeedStories, getUserStories, getStoryViewers } from '../controllers/storyController';
import { auth } from '../middleware/auth';
import multer from 'multer';

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

// Create a new story
router.post('/', auth, upload.single('media'), createStory);

// Get stories from users the current user follows
router.get('/feed', auth, getFeedStories);

// Get stories for a specific user
router.get('/user/:userId', auth, getUserStories);

// View a story
router.post('/:storyId/view', auth, viewStory);

// Get viewers of a story
router.get('/:storyId/viewers', auth, getStoryViewers);

export default router; 