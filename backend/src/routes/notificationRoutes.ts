import express from 'express';
import {
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from '../controllers/notificationController';
import { auth } from '../middleware/auth';

const router = express.Router();

// All routes in this file are protected with authentication
router.use(auth);

// @route   GET /api/notifications
// @desc    Get user notifications
// @access  Private
router.get('/', getUserNotifications);

// @route   PUT /api/notifications/:id/read
// @desc    Mark notification as read
// @access  Private
router.put('/:id/read', markNotificationAsRead);

// @route   PUT /api/notifications/read-all
// @desc    Mark all notifications as read
// @access  Private
router.put('/read-all', markAllNotificationsAsRead);

export default router; 