import express, { Request, Response } from 'express';
import http from 'http';
import { Server as SocketIoServer } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './config/db';
import path from 'path';
import fs from 'fs';

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

// Connect to MongoDB
connectDB();

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

// Socket.IO connection
io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);

  // Join a room (conversation)
  socket.on('join_conversation', (conversationId) => {
    socket.join(conversationId);
    console.log(`User joined conversation: ${conversationId}`);
  });

  // Leave a room
  socket.on('leave_conversation', (conversationId) => {
    socket.leave(conversationId);
    console.log(`User left conversation: ${conversationId}`);
  });

  // Send message
  socket.on('send_message', (messageData) => {
    io.to(messageData.conversation).emit('receive_message', messageData);
  });

  // User disconnects
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Set port
const PORT = process.env.PORT || 5000;

// Start server - Listen on all interfaces
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Access the API at http://localhost:${PORT} or http://<your-ip>:${PORT}`);
}); 