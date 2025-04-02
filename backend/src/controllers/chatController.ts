import { Request, Response } from 'express';
import Message from '../models/Message';
import Conversation from '../models/Conversation';
import User from '../models/User';
import { validationResult } from 'express-validator';

// @desc    Get all conversations for a user
// @route   GET /api/chat/conversations
// @access  Private
export const getConversations = async (req: Request, res: Response) => {
  try {
    const conversations = await Conversation.find({
      participants: { $in: [req.user._id] },
    })
      .populate('participants', '_id username name profilePicture')
      .populate('lastMessage')
      .sort({ updatedAt: -1 });

    res.json(conversations);
  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get or create a conversation with another user
// @route   GET /api/chat/conversations/:userId
// @access  Private
export const getOrCreateConversation = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    // Check if user exists
    const otherUser = await User.findById(userId);
    if (!otherUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if conversation already exists
    let conversation = await Conversation.findOne({
      participants: { $all: [req.user._id, userId] },
    })
      .populate('participants', '_id username name profilePicture')
      .populate('lastMessage');

    // If not, create a new conversation
    if (!conversation) {
      conversation = new Conversation({
        participants: [req.user._id, userId],
      });
      await conversation.save();
      await conversation.populate('participants', '_id username name profilePicture');
    }

    res.json(conversation);
  } catch (error) {
    console.error('Get or create conversation error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Send a message
// @route   POST /api/chat/messages
// @access  Private
export const sendMessage = async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { recipientId, text, mediaUrl, mediaType } = req.body;

    // Check if recipient exists
    const recipient = await User.findById(recipientId);
    if (!recipient) {
      return res.status(404).json({ message: 'Recipient not found' });
    }

    // Get or create conversation
    let conversation = await Conversation.findOne({
      participants: { $all: [req.user._id, recipientId] },
    });

    if (!conversation) {
      conversation = new Conversation({
        participants: [req.user._id, recipientId],
      });
      await conversation.save();
    }

    // Create new message
    const newMessage = new Message({
      sender: req.user._id,
      recipient: recipientId,
      conversation: conversation._id,
      text,
      mediaUrl,
      mediaType,
    });

    const savedMessage = await newMessage.save();
    // Update last message in conversation
    conversation.lastMessage = savedMessage._id as any;
    await conversation.save();

    // Populate sender and recipient info
    await savedMessage.populate('sender', '_id username name profilePicture');
    await savedMessage.populate('recipient', '_id username name profilePicture');

    res.status(201).json(savedMessage);
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get messages for a conversation
// @route   GET /api/chat/messages/:conversationId
// @access  Private
export const getMessages = async (req: Request, res: Response) => {
  try {
    const { conversationId } = req.params;

    // Check if conversation exists and user is a participant
    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: { $in: [req.user._id] },
    });

    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found or not authorized' });
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const messages = await Message.find({ conversation: conversationId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('sender', '_id username name profilePicture')
      .populate('recipient', '_id username name profilePicture');

    // Mark unread messages as read
    await Message.updateMany(
      {
        conversation: conversationId,
        sender: { $ne: req.user._id },
        read: false,
      },
      { read: true }
    );

    const total = await Message.countDocuments({ conversation: conversationId });

    res.json({
      messages: messages.reverse(), // Return in chronological order
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalMessages: total,
    });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get unread message count
// @route   GET /api/chat/messages/unread
// @access  Private
export const getUnreadCount = async (req: Request, res: Response) => {
  try {
    const unreadCount = await Message.countDocuments({
      recipient: req.user._id,
      read: false,
    });

    res.json({ unreadCount });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({ message: 'Server error' });
  }
}; 