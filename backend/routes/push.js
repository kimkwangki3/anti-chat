const express = require('express');
const router = express.Router();
const PushSubscription = require('../models/PushSubscription');
const { protect } = require('../middleware/authMiddleware');

// VAPID 공개키 조회
router.get('/vapid-key', (req, res) => {
    res.json({ publicKey: process.env.PUBLIC_VAPID_KEY });
});

// 구독 정보 저장
router.post('/subscribe', protect, async (req, res) => {
    try {
        const { subscription } = req.body;

        await PushSubscription.findOneAndUpdate(
            {
                userId: req.user._id,
                'subscription.endpoint': subscription.endpoint
            },
            {
                userId: req.user._id,
                subscription: subscription
            },
            { upsert: true, new: true }
        );

        res.status(201).json({ message: 'Push subscription saved.' });
    } catch (error) {
        console.error('Subscription error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// 현재 유저의 만료된 구독 정보 삭제 후 재구독 유도 (VAPID 키 변경 후 사용)
router.delete('/subscribe', protect, async (req, res) => {
    try {
        await PushSubscription.deleteMany({ userId: req.user._id });
        res.json({ message: 'Subscriptions cleared. Please resubscribe.' });
    } catch (error) {
        console.error('[PUSH] Clear subscription error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;

