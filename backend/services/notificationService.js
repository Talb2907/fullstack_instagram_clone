const Notification = require('../models/Notification');

class NotificationService {
    // Create a new notification
    static async createNotification(recipientId, senderId, type, postId = null, comment = null) {
        try {
            // Don't create notification if sender is the same as recipient
            if (senderId.toString() === recipientId.toString()) {
                return null;
            }

            // Check if notification already exists for this action
            const existingNotification = await Notification.findOne({
                recipient: recipientId,
                sender: senderId,
                type: type,
                post: postId,
                isRead: false
            });

            if (existingNotification) {
                return existingNotification;
            }

            const notification = new Notification({
                recipient: recipientId,
                sender: senderId,
                type: type,
                post: postId,
                comment: comment
            });

            await notification.save();
            return notification;
        } catch (error) {
            console.error('Error creating notification:', error);
            return null;
        }
    }

    // Create follow notification
    static async createFollowNotification(recipientId, senderId) {
        return await this.createNotification(recipientId, senderId, 'follow');
    }

    // Create like notification
    static async createLikeNotification(recipientId, senderId, postId) {
        return await this.createNotification(recipientId, senderId, 'like', postId);
    }

    // Create comment notification
    static async createCommentNotification(recipientId, senderId, postId, comment) {
        return await this.createNotification(recipientId, senderId, 'comment', postId, comment);
    }

    // Remove notification (e.g., when unlike)
    static async removeNotification(recipientId, senderId, type, postId = null) {
        try {
            await Notification.deleteOne({
                recipient: recipientId,
                sender: senderId,
                type: type,
                post: postId
            });
        } catch (error) {
            console.error('Error removing notification:', error);
        }
    }

    // Remove like notification
    static async removeLikeNotification(recipientId, senderId, postId) {
        return await this.removeNotification(recipientId, senderId, 'like', postId);
    }
}

module.exports = NotificationService;




