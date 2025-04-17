import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import * as messageService from '../services/messageService';
import User from '../models/User';

// @desc    Get all conversations for a user
// @route   GET /api/chat/conversations
// @access  Private
export const getConversations = async (req: Request, res: Response) => {
  try {
    const conversations = await messageService.getConversations(req.user._id.toString());
    res.json(conversations);
  } catch (error: any) {
    console.error('Get conversations error:', error);
    res.status(500).json({ message: error.message || 'Server error' });
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

    const conversation = await messageService.getOrCreateConversation(
      req.user._id.toString(),
      userId
    );

    res.json(conversation);
  } catch (error: any) {
    console.error('Get or create conversation error:', error);
    res.status(500).json({ message: error.message || 'Server error' });
  }
};

// @desc    Send a message
// @route   POST /api/chat/messages
// @access  Private
export const sendMessage = async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.error('Validation errors in sendMessage:', errors.array());
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    // Support both recipientId and recipient_id for backward compatibility
    const recipientId = req.body.recipientId || req.body.recipient_id;
    const { text, mediaUrl, mediaType } = req.body;

    console.log('Sending message:', { recipientId, text: text ? 'text present' : 'no text', mediaUrl: mediaUrl ? 'media present' : 'no media' });

    if (!recipientId) {
      console.error('No recipient ID provided in request');
      return res.status(400).json({ message: 'Recipient ID is required' });
    }

    // Check if recipient exists
    const recipient = await User.findById(recipientId);
    if (!recipient) {
      console.error(`Recipient not found with ID: ${recipientId}`);
      return res.status(404).json({ message: 'Recipient not found' });
    }

    // Get or create conversation
    const conversation = await messageService.getOrCreateConversation(
      req.user._id.toString(),
      recipientId
    );

    if (!conversation || !conversation.id) {
      console.error('Failed to get or create conversation');
      return res.status(500).json({ message: 'Failed to create conversation' });
    }

    console.log(`Created/retrieved conversation: ${conversation.id}`);

    // Create message object
    const message = {
      sender_id: req.user._id.toString(),
      recipient_id: recipientId,
      conversation_id: conversation.id,
      text,
      media_url: mediaUrl,
      media_type: mediaType,
      read: false
    };

    // Send message
    const savedMessage = await messageService.sendMessage(message);
    
    if (!savedMessage) {
      console.error('Failed to save message');
      return res.status(500).json({ message: 'Failed to save message' });
    }
    
    console.log(`Message saved with ID: ${savedMessage.id}`);
    
    // Return message with user info
    const populatedMessage = {
      ...savedMessage,
      sender: {
        _id: req.user._id,
        username: req.user.username,
        name: req.user.name,
        profilePicture: req.user.profilePicture
      },
      recipient: {
        _id: recipient._id,
        username: recipient.username,
        name: recipient.name,
        profilePicture: recipient.profilePicture
      }
    };

    // Return message wrapped in object to match frontend expectations
    res.status(201).json({ message: populatedMessage });
  } catch (error: any) {
    console.error('Send message error:', error);
    console.error('Error details:', error.stack);
    res.status(500).json({ message: error.message || 'Server error' });
  }
};

// @desc    Get messages for a conversation
// @route   GET /api/chat/messages/:conversationId
// @access  Private
export const getMessages = async (req: Request, res: Response) => {
  try {
    const { conversationId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 100;

    // console.log(`API request for messages: conversation=${conversationId}, page=${page}, limit=${limit}`);
    
    // Get messages from Supabase
    const result = await messageService.getMessages(conversationId, page, limit);
    
    // Here we would typically populate user data, but that would require additional queries
    // to get user info for each message. For simplicity, we're returning the raw messages.
    // In a production app, you'd fetch the user data from the users table in Supabase
    // and merge it with the message data.

    res.json(result);
  } catch (error: any) {
    console.error('Get messages error:', error);
    res.status(500).json({ message: error.message || 'Server error' });
  }
};

// @desc    Get unread message count
// @route   GET /api/chat/messages/unread
// @access  Private
export const getUnreadCount = async (req: Request, res: Response) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { unreadCount } = await messageService.getUnreadCount(req.user._id.toString());
    res.json({ unreadCount });
  } catch (error: any) {
    console.error('Get unread count error:', error);
    res.status(500).json({ 
      message: error.message || 'Server error'
    });
  }
};

// @desc    Mark messages as read in a conversation
// @route   POST /api/chat/messages/mark_as_read
// @access  Private
export const markMessagesAsRead = async (req: Request, res: Response) => {
  try {
    const { conversationId } = req.body;
    const errors = validationResult(req);
    
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Get the user ID from the authenticated user
    const userId = req.user._id.toString();

    // Mark messages as read in this conversation that were sent to this user
    const result = await messageService.markMessagesAsRead(conversationId, userId);
    
    res.json({ success: true, markedMessageIds: result.markedMessageIds });
  } catch (error: any) {
    console.error('Error marking messages as read:', error);
    res.status(500).json({ 
      message: error.message || 'Server error'
    });
  }
}; 