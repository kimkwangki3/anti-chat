const express = require('express');
const router = express.Router();
const { queryOne, execute, insertAndGetId } = require('../db/mssql');
const { protect } = require('../middleware/authMiddleware');

// GET /api/push/vapid-key
router.get('/vapid-key', (req, res) => {
    res.json({ publicKey: process.env.PUBLIC_VAPID_KEY });
});

// POST /api/push/subscribe
router.post('/subscribe', protect, async (req, res) => {
    try {
        const { subscription } = req.body;
        const endpoint = subscription.endpoint;

        const existing = await queryOne(
            'SELECT id FROM PushSubscriptions WHERE userId=@userId AND subscription LIKE @endpoint',
            { userId: req.user.id, endpoint: `%${endpoint}%` }
        );

        if (existing) {
            await execute(
                'UPDATE PushSubscriptions SET subscription=@subscription WHERE id=@id',
                { subscription: JSON.stringify(subscription), id: existing.id }
            );
        } else {
            await insertAndGetId(
                'INSERT INTO PushSubscriptions (userId, subscription) VALUES (@userId, @subscription)',
                { userId: req.user.id, subscription: JSON.stringify(subscription) }
            );
        }

        res.status(201).json({ message: 'Push subscription saved.' });
    } catch (error) {
        console.error('Subscription error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// DELETE /api/push/subscribe
router.delete('/subscribe', protect, async (req, res) => {
    try {
        await execute('DELETE FROM PushSubscriptions WHERE userId=@userId', { userId: req.user.id });
        res.json({ message: 'Subscriptions cleared. Please resubscribe.' });
    } catch (error) {
        console.error('[PUSH] Clear subscription error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
