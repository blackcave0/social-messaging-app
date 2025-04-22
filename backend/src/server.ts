import express, { Request, Response } from 'express';
import http from 'http';
import { Server as SocketIoServer } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './config/db';
import path from 'path';
import fs from 'fs';
import supabase from './config/supabase';
import { checkTablesExist } from './services/messageService';
import User from './models/User';

// Import models to ensure schemas are registered at startup
import './models';

// Import routes
import authRoutes from './routes/authRoutes';
import userRoutes from './routes/userRoutes';
import postRoutes from './routes/postRoutes';
import notificationRoutes from './routes/notificationRoutes';
// import storyRoutes from './routes/storyRoutes';
import chatRoutes from './routes/chatRoutes';

// Load environment variables
dotenv.config();

// Connect to MongoDB (still needed for users and other data)
connectDB();

// Check Supabase tables
checkTablesExist().then((tablesExist) => {
  if (!tablesExist) {
    console.warn('⚠️ Supabase tables not found. Chat functionality will not work correctly.');
    console.warn('⚠️ Run "npm run create-tables" to get setup instructions');
  } else {
    // console.log('✅ Supabase tables verified successfully.');
  }
});

// Initialize Express
const app = express();
const server = http.createServer(app);
const io = new SocketIoServer(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
  },
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000
});

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Middleware
app.use(express.json());
app.use(cors());

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/notifications', notificationRoutes);
// app.use('/api/stories', storyRoutes);
app.use('/api/chat', chatRoutes);

// Default route
app.get('/', (req: Request, res: Response) => {
  res.send('API is running...');
});

// Global user-to-socket mapping for direct messaging
const userSocketMap = new Map<string, Set<string>>();
// Message queue for offline users
const messageQueue = new Map<string, Array<any>>();
// Recent messages cache to prevent duplicates
const recentMessagesCache = new Map<string, Set<string>>();
// Recent delivery receipts cache
const deliveryReceiptsCache = new Map<string, Set<string>>();

// Socket.IO connection
io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);
  
  // Track user ID to socket ID mapping
  let currentUserId: string | null = null;
  
  // Associate user with socket
  socket.on('authenticate', (userId: string) => {
    if (userId) {
      currentUserId = userId;
      
      // Add this socket to the user's set of active sockets
      if (!userSocketMap.has(userId)) {
        userSocketMap.set(userId, new Set<string>());
      }
      userSocketMap.get(userId)?.add(socket.id);
      
      console.log(`User ${userId} authenticated with socket ${socket.id}`);
      
      // Process any queued messages for this user
      deliverQueuedMessages(userId);
    }
  });

  // Deliver any queued messages to the user
  const deliverQueuedMessages = (userId: string) => {
    if (messageQueue.has(userId)) {
      const queuedMessages = messageQueue.get(userId) || [];
      console.log(`Delivering ${queuedMessages.length} queued messages to user ${userId}`);
      
      queuedMessages.forEach(message => {
        // Emit each queued message directly to this socket
        socket.emit('receive_message', {
          ...message,
          _queued: true,
          _delivery_timestamp: new Date().toISOString()
        });
      });
      
      // Clear the queue after delivery
      messageQueue.delete(userId);
    }
  };

  // Join a room (conversation)
  socket.on('join_conversation', (conversationId) => {
    if (!conversationId) return;
    
    socket.join(conversationId);
    console.log(`User ${currentUserId} joined conversation: ${conversationId}`);
    
    // Notify others that user joined
    socket.to(conversationId).emit('user_joined', { 
      conversationId,
      userId: currentUserId,
      timestamp: new Date().toISOString()
    });
    
    // Mark user as online in this conversation
    io.to(conversationId).emit('user_online', {
      conversationId,
      userId: currentUserId,
      timestamp: new Date().toISOString()
    });
  });

  // Leave a room
  socket.on('leave_conversation', (conversationId) => {
    if (!conversationId) return;
    
    socket.leave(conversationId);
    console.log(`User ${currentUserId} left conversation: ${conversationId}`);
    
    // Notify others that user left
    socket.to(conversationId).emit('user_left', { 
      conversationId,
      userId: currentUserId,
      timestamp: new Date().toISOString()
    });
  });
  
  // Handle typing indicator
  socket.on('typing', (data) => {
    if (!data.conversationId) return;
    
    // Broadcast to everyone in the conversation except the sender
    socket.to(data.conversationId).emit('typing', {
      conversationId: data.conversationId,
      userId: data.userId,
      timestamp: new Date().toISOString()
    });
  });
  
  // Handle stop typing
  socket.on('stop_typing', (data) => {
    if (!data.conversationId) return;
    
    socket.to(data.conversationId).emit('stop_typing', {
      conversationId: data.conversationId,
      userId: data.userId,
      timestamp: new Date().toISOString()
    });
  });

  // Handle immediate message preview (before database save)
  socket.on('send_message', (message) => {
    const conversationId = message.conversation_id || message.conversation;
    const recipientId = message.recipientId || message.recipient_id;
    const senderId = message.sender_id;
    
    if (!conversationId) {
      console.error('No conversation ID provided for message:', message);
      return;
    }
    
    // Generate a unique ID for this message if not provided
    const messageId = message.id || message._id || `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Check if we've already processed this message recently (deduplication)
    const messageKey = `${messageId}-${senderId}-${conversationId}`;
    if (!recentMessagesCache.has(conversationId)) {
      recentMessagesCache.set(conversationId, new Set<string>());
    }
    
    if (recentMessagesCache.get(conversationId)?.has(messageKey)) {
      console.log(`Skipping duplicate message: ${messageKey}`);
      return;
    }
    
    // Add to recent messages cache with TTL (5 minutes)
    recentMessagesCache.get(conversationId)?.add(messageKey);
    setTimeout(() => {
      recentMessagesCache.get(conversationId)?.delete(messageKey);
    }, 5 * 60 * 1000);
    
    console.log(`Real-time message from ${senderId} to conversation ${conversationId}`);
    
    // Map recipientId to recipient_id for compatibility with both formats
    message.recipient_id = recipientId; 
    
    // Track message metadata
    const messageWithMetadata = {
      ...message,
      id: messageId,
      _id: messageId,
      _socket_processed: true,
      _socket_id: socket.id,
      _socket_timestamp: Date.now(),
      _delivery_status: 'sent',
      _delivery_timestamp: new Date().toISOString()
    };
    
    // First attempt: try to deliver directly to the recipient's active sockets
    let directDeliverySuccessful = false;
    
    if (recipientId) {
      const recipientSockets = userSocketMap.get(recipientId);
      
      if (recipientSockets && recipientSockets.size > 0) {
        // Recipient has active sockets, try direct delivery
        recipientSockets.forEach(socketId => {
          const recipientSocket = io.sockets.sockets.get(socketId);
          if (recipientSocket) {
            recipientSocket.emit('receive_message', {
              ...messageWithMetadata,
              _delivery_type: 'direct'
            });
            directDeliverySuccessful = true;
          }
        });
      }
      
      // If direct delivery wasn't possible, queue the message
      if (!directDeliverySuccessful) {
        console.log(`Recipient ${recipientId} not online, queueing message`);
        
        if (!messageQueue.has(recipientId)) {
          messageQueue.set(recipientId, []);
        }
        
        messageQueue.get(recipientId)?.push({
          ...messageWithMetadata,
          _delivery_type: 'queued'
        });
      }
    }
    
    // Always broadcast to the conversation room as well
    // This ensures delivery to any users currently viewing the conversation
    socket.to(conversationId).emit('receive_message', {
      ...messageWithMetadata,
      _delivery_type: 'room'
    });
    
    // Send delivery receipt back to sender
    socket.emit('message_delivered', {
      messageId: messageId,
      conversationId: conversationId,
      recipientId: recipientId,
      timestamp: new Date().toISOString(),
      status: directDeliverySuccessful ? 'delivered' : 'sent'
    });
  });
  
  // Handle explicit message delivery confirmations
  socket.on('confirm_delivery', (data) => {
    const { messageId, conversationId, senderId } = data;
    
    if (!messageId || !conversationId || !senderId || !currentUserId) return;
    
    // Deduplicate delivery confirmations
    const confirmKey = `${messageId}-${currentUserId}`;
    if (!deliveryReceiptsCache.has(conversationId)) {
      deliveryReceiptsCache.set(conversationId, new Set<string>());
    }
    
    if (deliveryReceiptsCache.get(conversationId)?.has(confirmKey)) {
      return; // Already confirmed
    }
    
    // Add to receipts cache with TTL (10 minutes)
    deliveryReceiptsCache.get(conversationId)?.add(confirmKey);
    setTimeout(() => {
      deliveryReceiptsCache.get(conversationId)?.delete(confirmKey);
    }, 10 * 60 * 1000);
    
    // Try to deliver confirmation to the sender directly
    const senderSockets = userSocketMap.get(senderId);
    
    if (senderSockets && senderSockets.size > 0) {
      senderSockets.forEach(socketId => {
        const senderSocket = io.sockets.sockets.get(socketId);
        if (senderSocket) {
          senderSocket.emit('message_seen', {
            messageId,
            conversationId,
            recipientId: currentUserId,
            timestamp: new Date().toISOString()
          });
        }
      });
    }
    
    // Also broadcast to the conversation
    socket.to(conversationId).emit('message_seen', {
      messageId,
      conversationId,
      recipientId: currentUserId,
      timestamp: new Date().toISOString()
    });
  });
  
  // Mark messages as read
  socket.on('mark_read', async (data) => {
    const { conversationId, messageIds } = data;
    
    if (!conversationId) return;
    
    try {
      // Update in Supabase
      if (messageIds && messageIds.length > 0) {
        // Mark specific messages as read
        await supabase
          .from('messages')
          .update({ read: true })
          .in('id', messageIds);
          
        // Send read receipts for each message
        messageIds.forEach((messageId: string) => {
          // Extract sender ID from local cache or message
          const message = messageIds.length > 0 ? { id: messageId } : null;
          if (message) {
            socket.to(conversationId).emit('message_read', {
              messageId: message.id,
              conversationId,
              userId: currentUserId,
              timestamp: new Date().toISOString()
            });
          }
        });
      } else {
        // Mark all unread messages in conversation as read
        const { data: messages } = await supabase
          .from('messages')
          .update({ read: true })
          .eq('conversation_id', conversationId)
          .eq('read', false)
          .select('id, sender_id');
        
        // Send read receipts for each message
        if (messages && messages.length > 0) {
          messages.forEach(message => {
            if (message.sender_id !== currentUserId) {
              // Send read receipt to the sender
              const senderSockets = userSocketMap.get(message.sender_id);
              if (senderSockets && senderSockets.size > 0) {
                senderSockets.forEach(socketId => {
                  const senderSocket = io.sockets.sockets.get(socketId);
                  if (senderSocket) {
                    senderSocket.emit('message_read', {
                      messageId: message.id,
                      conversationId,
                      userId: currentUserId,
                      timestamp: new Date().toISOString()
                    });
                  }
                });
              }
            }
          });
        }
      }
      
      // Broadcast read receipts to conversation room
      socket.to(conversationId).emit('messages_read', {
        conversationId,
        messageIds: messageIds || [],
        userId: currentUserId,
        timestamp: new Date().toISOString()
      });
      
      console.log(`Messages marked as read in conversation ${conversationId}`);
    } catch (error) {
      console.error('Error marking messages as read:', error);
      
      // Notify client of the error
      socket.emit('error', {
        type: 'mark_read_error',
        message: 'Failed to mark messages as read',
        conversationId,
        timestamp: new Date().toISOString()
      });
    }
  });

  // User disconnects
  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}, User: ${currentUserId || 'Unknown'}`);
    
    // Remove this socket from the user's set of active sockets
    if (currentUserId && userSocketMap.has(currentUserId)) {
      userSocketMap.get(currentUserId)?.delete(socket.id);
      
      // If no more active sockets, remove the user from the map
      if (userSocketMap.get(currentUserId)?.size === 0) {
        userSocketMap.delete(currentUserId);
        
        // Broadcast user offline status to relevant conversations
        // (in a production app, you'd track which conversations the user was in)
        io.emit('user_offline', {
          userId: currentUserId,
          timestamp: new Date().toISOString()
        });
      }
    }
    
    // Reset user ID
    currentUserId = null;
  });
  
  // Handle reconnection attempts
  socket.on('reconnect_attempt', () => {
    console.log(`Socket ${socket.id} attempting to reconnect`);
  });
  
  // Handle successful reconnection
  socket.on('reconnect', () => {
    console.log(`Socket ${socket.id} reconnected`);
    
    // Re-authenticate if we have user ID
    if (currentUserId) {
      socket.emit('authenticate', currentUserId);
    }
  });
  
  // Error handling
  socket.on('error', (error) => {
    console.error(`Socket ${socket.id} error:`, error);
  });
});

// Enhance Supabase Realtime listener
const setupSupabaseRealtime = async () => {
  try {
    // Check if tables exist before setting up realtime
    const tablesExist = await checkTablesExist();
    if (!tablesExist) {
      console.warn('⚠️ Cannot set up Supabase Realtime because tables do not exist.');
      return null;
    }
    
    // Subscribe to the 'messages' table for real-time changes
    const channel = supabase
      .channel('db-messages-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        async (payload) => {
          console.log('New message from Supabase database:', payload.new);
          
          // Get the conversation ID from the payload
          const messageData = payload.new;
          const conversationId = messageData.conversation_id;
          const messageId = messageData.id;
          const senderId = messageData.sender_id;
          const recipientId = messageData.recipient_id;
          
          if (!conversationId) {
            console.error('No conversation ID in new message payload:', payload);
            return;
          }
          
          // Check if we've already processed this message via socket
          const messageKey = `${messageId}-${senderId}-${conversationId}`;
          if (recentMessagesCache.has(conversationId) && 
              recentMessagesCache.get(conversationId)?.has(messageKey)) {
            console.log(`Skipping already processed message: ${messageKey}`);
            return;
          }
          
          try {
            // Get sender info to populate the message
            const sender = await User.findById(messageData.sender_id);
            const recipient = await User.findById(messageData.recipient_id);
            
            // Enrich message with user data
            const enrichedMessage = {
              ...messageData,
              sender: sender ? {
                _id: sender._id,
                name: sender.name,
                username: sender.username,
                profilePicture: sender.profilePicture
              } : null,
              recipient: recipient ? {
                _id: recipient._id,
                name: recipient.name,
                username: recipient.username,
                profilePicture: recipient.profilePicture
              } : null,
              _from_database: true,
              _processed_timestamp: new Date().toISOString()
            };
            
            // First attempt: try to deliver directly to the recipient's active sockets
            let directDeliverySuccessful = false;
            
            if (recipientId) {
              const recipientSockets = userSocketMap.get(recipientId);
              
              if (recipientSockets && recipientSockets.size > 0) {
                // Recipient has active sockets, try direct delivery
                recipientSockets.forEach(socketId => {
                  const recipientSocket = io.sockets.sockets.get(socketId);
                  if (recipientSocket) {
                    recipientSocket.emit('receive_message', {
                      ...enrichedMessage,
                      _delivery_type: 'direct_db'
                    });
                    directDeliverySuccessful = true;
                  }
                });
              }
              
              // If direct delivery wasn't possible, queue the message
              if (!directDeliverySuccessful) {
                console.log(`Recipient ${recipientId} not online, queueing message from DB`);
                
                if (!messageQueue.has(recipientId)) {
                  messageQueue.set(recipientId, []);
                }
                
                messageQueue.get(recipientId)?.push({
                  ...enrichedMessage,
                  _delivery_type: 'queued_db'
                });
              }
            }
            
            // Emit the message to all clients in the conversation room
            io.to(conversationId).emit('receive_message', {
              ...enrichedMessage,
              _delivery_type: 'room_db'
            });
            
            // Add to recent messages cache to prevent duplicate processing
            if (!recentMessagesCache.has(conversationId)) {
              recentMessagesCache.set(conversationId, new Set<string>());
            }
            recentMessagesCache.get(conversationId)?.add(messageKey);
            
            // Add expiration for cache entry
            setTimeout(() => {
              recentMessagesCache.get(conversationId)?.delete(messageKey);
            }, 5 * 60 * 1000); // 5 minutes
            
            console.log(`Database message emitted to conversation ${conversationId}`);
          } catch (error) {
            console.error('Error enriching message with user data:', error);
            // Fall back to sending the raw message
            io.to(conversationId).emit('receive_message', {
              ...messageData,
              _from_database: true,
              _error: 'Failed to enrich with user data'
            });
          }
        }
      )
      .subscribe((status) => {
        console.log('Supabase channel status:', status);
      });

    console.log('✅ Supabase Realtime channel set up for messages');
    
    return channel;
  } catch (error) {
    console.error('Failed to set up Supabase Realtime:', error);
    return null;
  }
};

// Initialize Supabase Realtime
setupSupabaseRealtime();

// Set port
const PORT = process.env.PORT || 5000;
const PORT_NUMBER = typeof PORT === 'string' ? parseInt(PORT, 10) : PORT;

// Start server - Listen on all interfaces (empty host = all interfaces)
server.listen(PORT_NUMBER, '', () => {
  console.log(`Server running on port ${PORT_NUMBER}`);
  console.log(`Access the API at http://localhost:${PORT_NUMBER} or http://<your-ip>:${PORT_NUMBER}`);
});


/* 

  // update the message check if message seen
  // update the message check if message read
  // update the message check if message delivered
  // update the message check if message sent
  // update the message check if message queued
  // update the message check if message failed
  // update the message check if message received
 */