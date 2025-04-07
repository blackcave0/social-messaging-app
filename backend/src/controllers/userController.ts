import { Request, Response } from 'express';
import User from '../models/User';
import mongoose, { Types } from 'mongoose';
import { createNotification } from './notificationController';

// @desc    Get user profile
// @route   GET /api/users/:id
// @access  Private
export const getUserProfile = async (req: Request, res: Response) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password')
      .populate('followers', '_id username name profilePicture')
      .populate('following', '_id username name profilePicture');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Get user profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
export const updateUserProfile = async (req: Request, res: Response) => {
  try {
    const { name, bio, profilePicture } = req.body;
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (name) user.name = name;
    if (bio !== undefined) user.bio = bio;
    if (profilePicture) user.profilePicture = profilePicture;

    const updatedUser = await user.save();

    res.json({
      _id: updatedUser._id,
      username: updatedUser.username,
      email: updatedUser.email,
      name: updatedUser.name,
      bio: updatedUser.bio,
      profilePicture: updatedUser.profilePicture,
    });
  } catch (error) {
    console.error('Update user profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Send friend request
// @route   POST /api/users/:id/friend-request
// @access  Private
export const sendFriendRequest = async (req: Request, res: Response) => {
  try {
    console.log(`Friend request from ${req.user._id} to ${req.params.id}`);
    
    if (req.user._id.toString() === req.params.id) {
      console.log('User attempted to send friend request to self');
      return res.status(400).json({ message: 'Cannot send friend request to yourself' });
    }

    const targetUser = await User.findById(req.params.id);
    if (!targetUser) {
      console.log(`Target user ${req.params.id} not found`);
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if already following
    const targetUserId = new mongoose.Types.ObjectId(req.params.id);
    if (req.user.following.some((id: mongoose.Types.ObjectId) => id.equals(targetUserId))) {
      console.log(`User ${req.user._id} is already following ${targetUser._id}`);
      return res.status(400).json({ message: 'Already following this user' });
    }

    // Check if friend request already sent
    if (targetUser.friendRequests.some((id: mongoose.Types.ObjectId) => id.equals(req.user._id))) {
      console.log(`Friend request already sent from ${req.user._id} to ${targetUser._id}`);
      return res.status(400).json({ message: 'Friend request already sent' });
    }

    // Add to friend requests
    targetUser.friendRequests.push(req.user._id);
    await targetUser.save();

    // Create notification for the friend request
    const notification = await createNotification(
      targetUser._id.toString(),
      req.user._id.toString(),
      'friendRequest'
    );
    
    console.log(`Friend request sent successfully from ${req.user._id} to ${targetUser._id}`);
    if (notification) {
      console.log(`Notification created: ${notification._id}`);
    }

    res.json({ message: 'Friend request sent successfully' });
  } catch (error) {
    console.error('Send friend request error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Accept friend request
// @route   POST /api/users/:id/accept-request
// @access  Private
export const acceptFriendRequest = async (req: Request, res: Response) => {
  try {
    const currentUser = await User.findById(req.user._id);
    if (!currentUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    const requestingUser = await User.findById(req.params.id);
    if (!requestingUser) {
      return res.status(404).json({ message: 'Requesting user not found' });
    }

    // Convert param ID to ObjectId
    const requestingUserId = new mongoose.Types.ObjectId(req.params.id);

    // Check if there's a friend request to accept
    if (!currentUser.friendRequests.some((id: mongoose.Types.ObjectId) => id.equals(requestingUserId))) {
      return res.status(400).json({ message: 'No friend request from this user' });
    }

    // Remove from friend requests
    currentUser.friendRequests = currentUser.friendRequests.filter(
      (id: mongoose.Types.ObjectId) => !id.equals(requestingUserId)
    );

    // Add to followers and following
    currentUser.followers.push(requestingUserId);
    requestingUser.following.push(req.user._id);

    await currentUser.save();
    await requestingUser.save();

    // Create notification for the accepted friend request (follow notification)
    await createNotification(
      requestingUser._id.toString(),
      currentUser._id.toString(),
      'follow'
    );

    res.json({ message: 'Friend request accepted' });
  } catch (error) {
    console.error('Accept friend request error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Reject friend request
// @route   POST /api/users/:id/reject-request
// @access  Private
export const rejectFriendRequest = async (req: Request, res: Response) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Convert param ID to ObjectId
    const requestingUserId = new mongoose.Types.ObjectId(req.params.id);

    // Check if there's a friend request to reject
    if (!user.friendRequests.some((id: mongoose.Types.ObjectId) => id.equals(requestingUserId))) {
      return res.status(400).json({ message: 'No friend request from this user' });
    }

    // Remove from friend requests
    user.friendRequests = user.friendRequests.filter(
      (id: mongoose.Types.ObjectId) => !id.equals(requestingUserId)
    );

    await user.save();

    res.json({ message: 'Friend request rejected' });
  } catch (error) {
    console.error('Reject friend request error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get all friend requests
// @route   GET /api/users/friend-requests
// @access  Private
export const getFriendRequests = async (req: Request, res: Response) => {
  try {
    const user = await User.findById(req.user._id)
      .select('friendRequests')
      .populate('friendRequests', '_id username name profilePicture');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user.friendRequests);
  } catch (error) {
    console.error('Get friend requests error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Upload profile picture
// @route   POST /api/users/upload-profile-picture
// @access  Private
export const uploadProfilePicture = async (req: Request, res: Response) => {
  try {
    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({ message: 'No image file uploaded' });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Generate URL for the uploaded file
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const profilePicture = `${baseUrl}/uploads/${req.file.filename}`;

    // Update user's profile picture
    user.profilePicture = profilePicture;
    await user.save();

    res.json({ 
      success: true, 
      profilePicture,
      message: 'Profile picture uploaded successfully' 
    });
  } catch (error) {
    console.error('Upload profile picture error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Search users
// @route   GET /api/users/search
// @access  Private
export const searchUsers = async (req: Request, res: Response) => {
  try {
    const { query } = req.query;
    
    console.log(`Search request received. Query: "${query}", User ID: ${req.user._id}`);
    
    if (!query || typeof query !== 'string') {
      console.log('Invalid search query', { query });
      return res.status(400).json({ message: 'Search query is required' });
    }

    // Exclude the current user from search results
    const users = await User.find({
      $and: [
        { _id: { $ne: req.user._id } },
        {
          $or: [
            { username: { $regex: query, $options: 'i' } },
            { name: { $regex: query, $options: 'i' } }
          ]
        }
      ]
    })
    .select('_id username name profilePicture')
    .limit(20);

    console.log(`Search results for "${query}": ${users.length} users found`);
    
    res.json(users);
  } catch (error) {
    console.error('Search users error:', error);
    res.status(500).json({ message: 'Server error' });
  }
}; 