import { Request, Response } from 'express';
import Story from '../models/Story';
import User from '../models/User';
import { validationResult } from 'express-validator';
import mongoose from 'mongoose';

// @desc    Create a new story
// @route   POST /api/stories
// @access  Private
export const createStory = async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { mediaUrl, mediaType } = req.body;

    const newStory = new Story({
      user: req.user._id,
      mediaUrl,
      mediaType,
    });

    const savedStory = await newStory.save();

    res.status(201).json(savedStory);
  } catch (error) {
    console.error('Create story error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get all stories from followed users and user's own stories
// @route   GET /api/stories
// @access  Private
export const getStories = async (req: Request, res: Response) => {
  try {
    // Get followed users
    const followingUsers = req.user.following;
    // Include user's own stories
    followingUsers.push(req.user._id);

    // Find stories from followed users that haven't expired
    const stories = await Story.find({
      user: { $in: followingUsers },
      expiresAt: { $gt: new Date() },
    })
      .sort({ createdAt: -1 })
      .populate('user', '_id username name profilePicture');

    // Group stories by user
    const userStories = stories.reduce((acc: any, story) => {
      const userId = story.user._id.toString();
      if (!acc[userId]) {
        acc[userId] = {
          user: story.user,
          stories: [],
        };
      }
      acc[userId].stories.push(story);
      return acc;
    }, {});

    res.json(Object.values(userStories));
  } catch (error) {
    console.error('Get stories error:', error);
    res.status(500).json({ message: 'Server error' });
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
      .sort({ createdAt: -1 })
      .populate('user', '_id username name profilePicture');

    if (stories.length === 0) {
      return res.status(404).json({ message: 'No stories found for this user' });
    }

    res.json(stories);
  } catch (error) {
    console.error('Get user stories error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    View a story (add current user to viewers)
// @route   PUT /api/stories/:id/view
// @access  Private
export const viewStory = async (req: Request, res: Response) => {
  try {
    const story = await Story.findById(req.params.id);

    if (!story) {
      return res.status(404).json({ message: 'Story not found' });
    }

    // Check if story has expired
    if (story.expiresAt < new Date()) {
      return res.status(400).json({ message: 'Story has expired' });
    }

    // Check if user already viewed the story
    if (!story.viewers.some((viewerId: mongoose.Types.ObjectId) => viewerId.equals(req.user._id))) {
      story.viewers.push(req.user._id);
      await story.save();
    }

    res.json({ message: 'Story viewed successfully' });
  } catch (error) {
    console.error('View story error:', error);
    res.status(500).json({ message: 'Server error' });
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