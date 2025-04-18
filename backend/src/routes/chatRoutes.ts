import express from 'express';
import { 
  getConversations,
  getOrCreateConversation,
  sendMessage,
  getMessages,
  getUnreadCount,
  markMessagesAsRead
} from '../controllers/chatController';
import { auth } from '../middleware/auth';
import { check } from 'express-validator';

const router = express.Router();

// All chat routes are protected
router.use(auth);

// Get all conversations for current user
router.get('/conversations', getConversations);

// Get or create a conversation with another user
router.get('/conversations/:userId', getOrCreateConversation);

// Get unread message count (this route needs to be before dynamic routes)
router.get('/messages/unread', getUnreadCount);

// Add route to mark messages as read
router.post('/messages/mark_as_read', [
  check('conversationId', 'Conversation ID is required').not().isEmpty()
], markMessagesAsRead);

// Get messages for a conversation (this route should come after specific routes)
router.get('/messages/:conversationId', getMessages);

// Send a message
router.post(
  '/messages', 
  [
    check(['recipientId', 'recipient_id'])
      .custom((value, { req }) => {
        // Check if either recipientId or recipient_id exists
        if (!req.body.recipientId && !req.body.recipient_id) {
          throw new Error('Recipient ID is required');
        }
        return true;
      }),
    check('text', 'Text is required if no media').custom((value, { req }) => {
      if (!req.body.mediaUrl && !value) {
        throw new Error('Either text or media is required');
      }
      return true;
    }),
  ],
  sendMessage
);

export default router; 