require('dotenv').config();
const mongoose = require('mongoose');

async function setup() {
    try {
        await mongoose.connect('mongodb://127.0.0.1:27017/corporate-chat');
        const db = mongoose.connection.db;

        await db.collection('users').updateOne({ username: 'user1' }, { $set: { password: '1234', role: 'admin' } });
        await db.collection('users').updateOne({ username: 'test1' }, { $set: { password: '1234', role: 'member' } });

        const u1 = await db.collection('users').findOne({ username: 'user1' });
        const t1 = await db.collection('users').findOne({ username: 'test1' });
        const ch = await db.collection('channels').findOne({ name: 'DSBH' });

        if (ch && u1 && t1) {
            await db.collection('channels').updateOne({ _id: ch._id }, { $set: { ownerId: u1._id } });
            await db.collection('channelmembers').updateOne(
                { channelId: ch._id, userId: u1._id },
                { $set: { status: 'approved' } },
                { upsert: true }
            );
            await db.collection('channelmembers').updateOne(
                { channelId: ch._id, userId: t1._id },
                { $set: { status: 'approved' } },
                { upsert: true }
            );
            console.log('Successfully prepared test data: user1(admin) and test1(member) for DSBH channel!');
        } else {
            console.log('Could not find existing DSBH channel to link users.');
        }
    } catch (err) {
        console.error(err);
    } finally {
        process.exit(0);
    }
}
setup();
