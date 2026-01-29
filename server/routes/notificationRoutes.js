
import express from 'express';
import { Notification } from '../models/index.js';
import { getAuthUser } from '../utils/auth.js';

import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// Get user notifications
router.get('/', getAuthUser, async (req, res) => {
    try {
        let notifications = await Notification.find({ user_id: req.currentUser.id })
            .sort({ created_at: -1 })
            .limit(20);

        if (notifications.length === 0) {
            // Auto-generate welcome notification
            const welcomeNotif = new Notification({
                id: uuidv4(),
                user_id: req.currentUser.id,
                title: 'Welcome to EduPlatform!',
                message: 'Detailed analytics and course management tools are now available in your dashboard.',
                type: 'system',
                read: false,
                created_at: new Date()
            });
            await welcomeNotif.save();
            notifications = [welcomeNotif];
        }

        res.json({
            data: notifications
        });
    } catch (error) {
        console.error('Get notifications error:', error);
        res.status(500).json({ detail: "Failed to fetch notifications" });
    }
});

// Mark notification as read
router.put('/:id/read', getAuthUser, async (req, res) => {
    try {
        const notification = await Notification.findOne({
            id: req.params.id,
            user_id: req.currentUser.id
        });

        if (!notification) {
            return res.status(404).json({ detail: "Notification not found" });
        }

        notification.read = true;
        await notification.save();

        res.json({ success: true, message: "Marked as read" });
    } catch (error) {
        console.error('Mark notification read error:', error);
        res.status(500).json({ detail: "Failed to update notification" });
    }
});

// Create a notification (Internal or via API)
router.post('/', async (req, res) => {
    try {
        const { user_id, title, message, type, course_id } = req.body;

        // Simple validation
        if (!user_id || !title || !message) {
            return res.status(400).json({ error: { message: 'Missing required fields' } });
        }

        const notification = new Notification({
            id: uuidv4(),
            user_id,
            title,
            message,
            type: type || 'system',
            course_id,
            read: false,
            created_at: new Date()
        });

        await notification.save();

        res.status(201).json({ success: true, data: notification });
    } catch (error) {
        console.error('Create notification error:', error);
        res.status(500).json({ error: { message: "Failed to create notification" } });
    }
});

// Mark all as read
router.put('/mark-all-read', getAuthUser, async (req, res) => {
    try {
        await Notification.updateMany(
            { user_id: req.currentUser.id, read: false },
            { $set: { read: true } }
        );
        res.json({ success: true, message: "All notifications marked as read" });
    } catch (error) {
        console.error('Mark all read error:', error);
        res.status(500).json({ detail: "Failed to update notifications" });
    }
});

export default router;
