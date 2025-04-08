import express from 'express';
import {
  getUserProfile,
  updateUserProfile,
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  getFriendRequests,
  uploadProfilePicture,
  searchUsers,
  getSentFriendRequests,
  followUser,
  unfollowUser,
  getUserRelationship,
  acceptFollowRequest,
  rejectFollowRequest,
} from '../controllers/userController';
import { auth } from '../middleware/auth';
import multer from 'multer';
import path from 'path';

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../uploads/'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, 'profile-' + uniqueSuffix + ext);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|gif/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'));
    }
  },
});

// All routes in this file are protected with authentication
router.use(auth);

// @route   GET /api/users/search
// @desc    Search users
// @access  Private
router.get('/search', searchUsers);

// @route   GET /api/users/friend-requests
// @desc    Get all friend requests
// @access  Private
router.get('/friend-requests', getFriendRequests);

// @route   GET /api/users/sent-requests
// @desc    Get sent friend requests
// @access  Private
router.get('/sent-requests', getSentFriendRequests);

// @route   POST /api/users/upload-profile-picture
// @desc    Upload profile picture
// @access  Private
router.post('/upload-profile-picture', upload.single('profilePicture'), uploadProfilePicture);

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

// @route   POST /api/users/:id/follow
// @desc    Follow a user directly
// @access  Private
router.post('/:id/follow', followUser);

// @route   POST /api/users/:id/unfollow
// @desc    Unfollow a user
// @access  Private
router.post('/:id/unfollow', unfollowUser);

// @route   GET /api/users/:id/relationship
// @desc    Get relationship status with a user
// @access  Private
router.get('/:id/relationship', getUserRelationship);

// @route   POST /api/users/:id/accept-follow-request
// @desc    Accept follow request
// @access  Private
router.post('/:id/accept-follow-request', acceptFollowRequest);

// @route   POST /api/users/:id/reject-follow-request
// @desc    Reject follow request
// @access  Private
router.post('/:id/reject-follow-request', rejectFollowRequest);

export default router; 