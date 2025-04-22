import { Request, Response } from 'express';
import Story from '../models/Story';
import User from '../models/User';
import { uploadToCloudinary } from '../utils/cloudinary';
import { validationResult } from 'express-validator';
import mongoose from 'mongoose';
import Following from '../models/Following';

// @desc    Create a new story
// @route   POST /api/stories
// @access  Private
export const createStory = async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { userId } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Upload to Cloudinary with user-specific folder
    const result = await uploadToCloudinary(file.path, 'stories', userId);

    // Create story
    const story = await Story.create({
      user: userId,
      mediaUrl: result.secure_url,
      mediaType: file.mimetype.startsWith('image') ? 'image' : 'video'
    });

    res.status(201).json({
      success: true,
      data: story
    });
  } catch (error) {
    console.error('Error creating story:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating story'
    });
  }
};

// @desc    Get all stories from followed users and user's own stories
// @route   GET /api/stories
// @access  Private
export const getStories = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const stories = await Story.find({
      user: userId,
      expiresAt: { $gt: new Date() }
    }).populate('user', 'username profilePicture');

    res.status(200).json({
      success: true,
      data: stories
    });
  } catch (error) {
    console.error('Error fetching stories:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching stories'
    });
  }
};

// @desc    Get a specific user's stories
// @route   GET /api/stories/user/:userId
// @access  Private
export const getUserStories = async (req: Request, res: Response) => {
  try {
    const userId = req.params.userId;

    // Find user's stories that haven't expired
    const stories = await Story.find({
      user: userId,
      expiresAt: { $gt: new Date() },
    })
      .sort({ createdAt: 1 })
      .populate('user', '_id username name profilePicture');

    // Return empty array instead of 404 when no stories found
    return res.status(200).json({
      success: true,
      data: stories
    });
  } catch (error) {
    console.error('Get user stories error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    View a story (add current user to viewers)
// @route   POST /api/stories/:storyId/view
// @access  Private
export const viewStory = async (req: Request, res: Response) => {
  try {
    const { storyId } = req.params;
    const userId = req.body.userId || req.user._id;

    // Validate storyId format
    if (!mongoose.Types.ObjectId.isValid(storyId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid story ID'
      });
    }

    const story = await Story.findById(storyId);
    if (!story) {
      return res.status(404).json({
        success: false,
        message: 'Story not found'
      });
    }

    // Add viewer if not already viewed
    if (!story.views.includes(userId)) {
      story.views.push(userId);
      await story.save();
    }

    res.status(200).json({
      success: true,
      data: story
    });
  } catch (error) {
    console.error('Error viewing story:', error);
    res.status(500).json({
      success: false,
      message: 'Error viewing story'
    });
  }
};

// @desc    Delete a story
// @route   DELETE /api/stories/:id
// @access  Private
export const deleteStory = async (req: Request, res: Response) => {
  try {
    const story = await Story.findById(req.params.id);

    if (!story) {
      return res.status(404).json({ message: 'Story not found' });
    }

    // Check if story belongs to user
    if (story.user.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: 'Not authorized to delete this story' });
    }

    await Story.findByIdAndDelete(req.params.id);

    res.json({ message: 'Story deleted successfully' });
  } catch (error) {
    console.error('Delete story error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get stories from users the current user follows
// @route   GET /api/stories/feed
// @access  Private
export const getFeedStories = async (req: Request, res: Response) => {
  try {
    // Get current user
    const userId = req.user._id;

    // Get user with populated following field
    const user = await req.user.populate('following');

    if (!user || !user.following) {
      return res.status(200).json({
        success: true,
        data: []
      });
    }

    // Get followed user IDs
    const followedUserIds = user.following.map((followedUser: any) => followedUser._id);

    // Find stories from followed users that haven't expired
    const stories = await Story.find({
      user: { $in: followedUserIds },
      expiresAt: { $gt: new Date() }
    })
      .populate('user', '_id username name profilePicture')
      .sort({ createdAt: -1 });

    // Group stories by user
    const userStoriesMap = stories.reduce((acc: any, story: any) => {
      const userId = story.user._id.toString();

      if (!acc[userId]) {
        acc[userId] = {
          _id: story.user._id,
          username: story.user.username,
          name: story.user.name,
          profilePicture: story.user.profilePicture,
          stories: []
        };
      }

      acc[userId].stories.push(story);
      return acc;
    }, {});

    // Convert map to array
    const userStories = Object.values(userStoriesMap);

    res.status(200).json({
      success: true,
      data: userStories
    });
  } catch (error) {
    console.error('Error fetching feed stories:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching feed stories'
    });
  }
};

// @desc    Get viewers of a story
// @route   GET /api/stories/:storyId/viewers
// @access  Private
export const getStoryViewers = async (req: Request, res: Response) => {
  try {
    const { storyId } = req.params;

    // Validate storyId format
    if (!mongoose.Types.ObjectId.isValid(storyId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid story ID'
      });
    }

    // Find the story
    const story = await Story.findById(storyId);

    if (!story) {
      return res.status(404).json({
        success: false,
        message: 'Story not found'
      });
    }

    // Check if the story belongs to the current user
    if (story.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You can only view viewers of your own stories'
      });
    }

    // Get the details of users who viewed the story
    const viewers = await User.find({
      _id: { $in: story.views }
    }).select('_id username name profilePicture');

    return res.status(200).json({
      success: true,
      viewers
    });
  } catch (error) {
    console.error('Error getting story viewers:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get stories from users that current user follows
// @route   GET /api/stories/following
// @access  Private
export const getFollowingUserStories = async (req: Request, res: Response) => {
  try {
    const userId = req.user!._id;

    // Get users that the current user follows
    const following = await Following.find({ follower: userId })
      .select('following')
      .lean();

    if (!following.length) {
      return res.status(200).json({
        success: true,
        data: []
      });
    }

    // Extract the IDs of users being followed
    const followingIds = following.map((f: { following: mongoose.Types.ObjectId }) => f.following);

    // Find all active stories from followed users
    const stories = await Story.find({
      user: { $in: followingIds },
      expiresAt: { $gt: new Date() }
    })
      .sort({ createdAt: 1 }) // Change to ascending order (oldest first)
      .populate('user', '_id username name profilePicture');

    // Group stories by user
    const storiesByUser = stories.reduce((acc: any, story) => {
      const userId = story.user._id.toString();
      if (!acc[userId]) {
        // Since the user field is populated, we can safely access its properties
        const populatedUser = story.user as unknown as {
          _id: mongoose.Types.ObjectId;
          username: string;
          name: string;
          profilePicture?: string;
        };

        acc[userId] = {
          _id: populatedUser._id,
          username: populatedUser.username,
          name: populatedUser.name,
          profilePicture: populatedUser.profilePicture,
          stories: []
        };
      }
      acc[userId].stories.push(story);
      return acc;
    }, {});

    // Convert to array
    const result = Object.values(storiesByUser);

    return res.status(200).json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Get following stories error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
}; 