import { Request, Response } from 'express';
import User from '../models/User';

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
    if (req.user._id.toString() === req.params.id) {
      return res.status(400).json({ message: 'Cannot send friend request to yourself' });
    }

    const targetUser = await User.findById(req.params.id);
    if (!targetUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if already following
    if (req.user.following.includes(req.params.id)) {
      return res.status(400).json({ message: 'Already following this user' });
    }

    // Check if friend request already sent
    if (targetUser.friendRequests.includes(req.user._id)) {
      return res.status(400).json({ message: 'Friend request already sent' });
    }

    // Add to friend requests
    targetUser.friendRequests.push(req.user._id);
    await targetUser.save();

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

    // Check if there's a friend request to accept
    if (!currentUser.friendRequests.includes(req.params.id)) {
      return res.status(400).json({ message: 'No friend request from this user' });
    }

    // Remove from friend requests
    currentUser.friendRequests = currentUser.friendRequests.filter(
      id => id.toString() !== req.params.id
    );

    // Add to followers and following
    currentUser.followers.push(req.params.id);
    requestingUser.following.push(req.user._id);

    await currentUser.save();
    await requestingUser.save();

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

    // Check if there's a friend request to reject
    if (!user.friendRequests.includes(req.params.id)) {
      return res.status(400).json({ message: 'No friend request from this user' });
    }

    // Remove from friend requests
    user.friendRequests = user.friendRequests.filter(
      id => id.toString() !== req.params.id
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