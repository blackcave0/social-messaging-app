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

// @desc    Get sent friend requests
// @route   GET /api/users/sent-requests
// @access  Private
export const getSentFriendRequests = async (req: Request, res: Response) => {
  try {
    console.log(`Getting sent friend requests for user: ${req.user._id}`);
    
    // Find all users who have the current user's ID in their friendRequests array
    const usersWithPendingRequests = await User.find({
      friendRequests: { $in: [req.user._id] }
    }).select('_id username name profilePicture');

    console.log(`Found ${usersWithPendingRequests.length} users with pending requests from current user`);
    
    // Return just the user IDs as an array if that's what the frontend expects
    const userIds = usersWithPendingRequests.map(user => user._id);
    res.json(userIds);
  } catch (error) {
    console.error('Get sent friend requests error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Follow a user directly (without friend request)
// @route   POST /api/users/:id/follow
// @access  Private
export const followUser = async (req: Request, res: Response) => {
  try {
    if (req.user._id.toString() === req.params.id) {
      return res.status(400).json({ message: 'Cannot follow yourself' });
    }

    const currentUser = await User.findById(req.user._id);
    if (!currentUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    const targetUser = await User.findById(req.params.id);
    if (!targetUser) {
      return res.status(404).json({ message: 'Target user not found' });
    }

    // Check if already following
    const targetUserId = new mongoose.Types.ObjectId(req.params.id);
    if (currentUser.following.some((id: mongoose.Types.ObjectId) => id.equals(targetUserId))) {
      return res.status(400).json({ message: 'Already following this user' });
    }

    // Add to followers and following
    currentUser.following.push(targetUserId);
    targetUser.followers.push(req.user._id);

    await currentUser.save();
    await targetUser.save();

    // Create notification for the follow
    await createNotification(
      targetUser._id.toString(),
      currentUser._id.toString(),
      'follow'
    );

    res.json({ 
      success: true,
      message: 'User followed successfully',
      followingCount: currentUser.following.length,
      followersCount: targetUser.followers.length
    });
  } catch (error) {
    console.error('Follow user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Unfollow a user
// @route   POST /api/users/:id/unfollow
// @access  Private
export const unfollowUser = async (req: Request, res: Response) => {
  try {
    if (req.user._id.toString() === req.params.id) {
      return res.status(400).json({ message: 'Cannot unfollow yourself' });
    }

    const currentUser = await User.findById(req.user._id);
    if (!currentUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    const targetUser = await User.findById(req.params.id);
    if (!targetUser) {
      return res.status(404).json({ message: 'Target user not found' });
    }

    // Check if actually following
    const targetUserId = new mongoose.Types.ObjectId(req.params.id);
    if (!currentUser.following.some((id: mongoose.Types.ObjectId) => id.equals(targetUserId))) {
      return res.status(400).json({ message: 'Not following this user' });
    }

    // Remove from followers and following
    currentUser.following = currentUser.following.filter(
      (id: mongoose.Types.ObjectId) => !id.equals(targetUserId)
    );
    
    targetUser.followers = targetUser.followers.filter(
      (id: mongoose.Types.ObjectId) => !id.equals(req.user._id)
    );

    await currentUser.save();
    await targetUser.save();

    res.json({ 
      success: true,
      message: 'User unfollowed successfully',
      followingCount: currentUser.following.length,
      followersCount: targetUser.followers.length
    });
  } catch (error) {
    console.error('Unfollow user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get relationship status between current user and target user
// @route   GET /api/users/:id/relationship
// @access  Private
export const getUserRelationship = async (req: Request, res: Response) => {
  try {
    const currentUserId = req.user._id;
    const targetUserId = req.params.id;
    
    if (currentUserId.toString() === targetUserId) {
      return res.status(400).json({ message: 'Cannot check relationship with yourself' });
    }

    const currentUser = await User.findById(currentUserId);
    if (!currentUser) {
      return res.status(404).json({ message: 'Current user not found' });
    }

    const targetUser = await User.findById(targetUserId);
    if (!targetUser) {
      return res.status(404).json({ message: 'Target user not found' });
    }

    // Convert to ObjectId for comparison
    const targetUserObjectId = new mongoose.Types.ObjectId(targetUserId);
    const currentUserObjectId = new mongoose.Types.ObjectId(currentUserId);

    // Check relationship
    const isFollowing = currentUser.following.some((id: mongoose.Types.ObjectId) => 
      id.equals(targetUserObjectId)
    );
    
    const isFollowedBy = currentUser.followers.some((id: mongoose.Types.ObjectId) => 
      id.equals(targetUserObjectId)
    );
    
    const hasReceivedRequest = currentUser.friendRequests.some((id: mongoose.Types.ObjectId) => 
      id.equals(targetUserObjectId)
    );
    
    const hasSentRequest = targetUser.friendRequests.some((id: mongoose.Types.ObjectId) => 
      id.equals(currentUserObjectId)
    );

    res.json({
      success: true,
      relationship: {
        isFollowing,
        isFollowedBy,
        hasReceivedRequest,
        hasSentRequest
      }
    });
  } catch (error) {
    console.error('Get user relationship error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Accept follow request
// @route   POST /api/users/:id/accept-follow-request
// @access  Private
export const acceptFollowRequest = async (req: Request, res: Response) => {
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
      return res.status(400).json({ message: 'No follow request from this user' });
    }

    // Remove from friend requests
    currentUser.friendRequests = currentUser.friendRequests.filter(
      (id: mongoose.Types.ObjectId) => !id.equals(requestingUserId)
    );

    // Add to followers
    currentUser.followers.push(requestingUserId);
    requestingUser.following.push(req.user._id);

    await currentUser.save();
    await requestingUser.save();

    // Create notification for the accepted follow request
    await createNotification(
      requestingUser._id.toString(),
      currentUser._id.toString(),
      'follow'
    );

    // Return the updated user object for the requester
    const user = await User.findById(requestingUser._id)
      .select('_id username name profilePicture');

    res.json({ 
      success: true, 
      message: 'Follow request accepted',
      user
    });
  } catch (error) {
    console.error('Accept follow request error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Reject follow request
// @route   POST /api/users/:id/reject-follow-request
// @access  Private
export const rejectFollowRequest = async (req: Request, res: Response) => {
  try {
    const currentUser = await User.findById(req.user._id);
    if (!currentUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Convert param ID to ObjectId
    const requestingUserId = new mongoose.Types.ObjectId(req.params.id);

    // Check if there's a friend request to reject
    if (!currentUser.friendRequests.some((id: mongoose.Types.ObjectId) => id.equals(requestingUserId))) {
      return res.status(400).json({ message: 'No follow request from this user' });
    }

    // Remove from friend requests
    currentUser.friendRequests = currentUser.friendRequests.filter(
      (id: mongoose.Types.ObjectId) => !id.equals(requestingUserId)
    );

    await currentUser.save();

    res.json({
      success: true, 
      message: 'Follow request rejected'
    });
  } catch (error) {
    console.error('Reject follow request error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Remove a follower
// @route   POST /api/users/:id/remove-follower
// @access  Private
export const removeFollower = async (req: Request, res: Response) => {
  try {
    const currentUser = await User.findById(req.user._id);
    if (!currentUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    const followerUser = await User.findById(req.params.id);
    if (!followerUser) {
      return res.status(404).json({ message: 'Follower user not found' });
    }

    // Convert param ID to ObjectId
    const followerUserId = new mongoose.Types.ObjectId(req.params.id);

    // Check if they are actually a follower
    if (!currentUser.followers.some((id: mongoose.Types.ObjectId) => id.equals(followerUserId))) {
      return res.status(400).json({ message: 'This user is not following you' });
    }

    // Remove from followers
    currentUser.followers = currentUser.followers.filter(
      (id: mongoose.Types.ObjectId) => !id.equals(followerUserId)
    );

    // Remove from following of the other user
    followerUser.following = followerUser.following.filter(
      (id: mongoose.Types.ObjectId) => !id.equals(req.user._id)
    );

    await currentUser.save();
    await followerUser.save();

    res.json({
      success: true, 
      message: 'Follower removed successfully'
    });
  } catch (error) {
    console.error('Remove follower error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Block a user
// @route   POST /api/users/:id/block
// @access  Private
export const blockUser = async (req: Request, res: Response) => {
  try {
    if (req.user._id.toString() === req.params.id) {
      return res.status(400).json({ message: 'Cannot block yourself' });
    }

    const currentUser = await User.findById(req.user._id);
    if (!currentUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    const userToBlock = await User.findById(req.params.id);
    if (!userToBlock) {
      return res.status(404).json({ message: 'User to block not found' });
    }

    // Convert param ID to ObjectId
    const blockUserId = new mongoose.Types.ObjectId(req.params.id);
    
    // Check if already blocked
    if (currentUser.blockedUsers && currentUser.blockedUsers.some((id: mongoose.Types.ObjectId) => id.equals(blockUserId))) {
      return res.status(400).json({ message: 'User already blocked' });
    }

    // Initialize blockedUsers array if it doesn't exist
    if (!currentUser.blockedUsers) {
      currentUser.blockedUsers = [];
    }

    // Add to blocked users
    currentUser.blockedUsers.push(blockUserId);

    // Remove from followers/following if applicable
    currentUser.followers = currentUser.followers.filter(
      (id: mongoose.Types.ObjectId) => !id.equals(blockUserId)
    );
    
    currentUser.following = currentUser.following.filter(
      (id: mongoose.Types.ObjectId) => !id.equals(blockUserId)
    );

    // Remove user from the other user's followers/following
    userToBlock.followers = userToBlock.followers.filter(
      (id: mongoose.Types.ObjectId) => !id.equals(req.user._id)
    );
    
    userToBlock.following = userToBlock.following.filter(
      (id: mongoose.Types.ObjectId) => !id.equals(req.user._id)
    );

    // Also remove any pending friend requests
    currentUser.friendRequests = currentUser.friendRequests.filter(
      (id: mongoose.Types.ObjectId) => !id.equals(blockUserId)
    );
    
    userToBlock.friendRequests = userToBlock.friendRequests.filter(
      (id: mongoose.Types.ObjectId) => !id.equals(req.user._id)
    );

    await currentUser.save();
    await userToBlock.save();

    res.json({
      success: true, 
      message: 'User blocked successfully'
    });
  } catch (error) {
    console.error('Block user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
}; 