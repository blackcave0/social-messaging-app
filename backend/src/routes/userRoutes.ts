import express from 'express';
import {
  getUserProfile,
  updateUserProfile,
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  getFriendRequests,
} from '../controllers/userController';
import { auth } from '../middleware/auth';

const router = express.Router();

// All routes in this file are protected with authentication
router.use(auth);

// @route   GET /api/users/:id
// @desc    Get user profile
// @access  Private
router.get('/:id', getUserProfile);

// @route   PUT /api/users/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', updateUserProfile);

// @route   POST /api/users/:id/friend-request
// @desc    Send friend request
// @access  Private
router.post('/:id/friend-request', sendFriendRequest);

// @route   POST /api/users/:id/accept-request
// @desc    Accept friend request
// @access  Private
router.post('/:id/accept-request', acceptFriendRequest);

// @route   POST /api/users/:id/reject-request
// @desc    Reject friend request
// @access  Private
router.post('/:id/reject-request', rejectFriendRequest);

// @route   GET /api/users/friend-requests
// @desc    Get all friend requests
// @access  Private
router.get('/friend-requests', getFriendRequests);

export default router; 