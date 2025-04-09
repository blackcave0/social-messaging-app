import { Request, Response } from 'express';
import Notification from '../models/Notification';

// @desc    Get user notifications
// @route   GET /api/notifications
// @access  Private
export const getUserNotifications = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const notifications = await Notification.find({ recipient: req.user._id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('sender', '_id username name profilePicture')
      .populate('post', '_id content images')
      .populate('comment', '_id content');

    // Get unread count
    const unreadCount = await Notification.countDocuments({
      recipient: req.user._id,
      read: false,
    });

    res.json({
      notifications,
      unreadCount,
      page,
      hasMore: notifications.length === limit,
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Mark notification as read
// @route   PUT /api/notifications/:id/read
// @access  Private
export const markNotificationAsRead = async (req: Request, res: Response) => {
  try {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    // Check if the notification belongs to the current user
    if (notification.recipient.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    notification.read = true;
    await notification.save();

    res.json({ success: true });
  } catch (error) {
    console.error('Mark notification as read error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Mark all notifications as read
// @route   PUT /api/notifications/read-all
// @access  Private
export const markAllNotificationsAsRead = async (req: Request, res: Response) => {
  try {
    await Notification.updateMany(
      { recipient: req.user._id, read: false },
      { read: true }
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Mark all notifications as read error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Helper function to create a notification (to be used in other controllers)
export const createNotification = async (
  recipientId: string,
  senderId: string,
  type: 'like' | 'comment' | 'follow' | 'friendRequest',
  postId?: string,
  commentId?: string
) => {
  try {
    const notification = new Notification({
      recipient: recipientId,
      sender: senderId,
      type,
      ...(postId && { post: postId }),
      ...(commentId && { comment: commentId }),
    });

    await notification.save();
    return notification;
  } catch (error) {
    console.error('Create notification error:', error);
    return null;
  }
}; 