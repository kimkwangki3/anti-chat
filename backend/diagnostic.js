require('dotenv').config();
const cloudinary = require('./config/cloudinary');
const streamifier = require('streamifier');

console.log('--- Cloudinary Diagnostic (with dotenv) ---');
console.log('CLOUDINARY_CLOUD_NAME:', process.env.CLOUDINARY_CLOUD_NAME ? 'DEFINED' : 'MISSING');
console.log('CLOUDINARY_API_KEY:', process.env.CLOUDINARY_API_KEY ? 'DEFINED' : 'MISSING');
console.log('CLOUDINARY_API_SECRET:', process.env.CLOUDINARY_API_SECRET ? 'DEFINED' : 'MISSING');

try {
    const stream = streamifier.createReadStream(Buffer.from('test'));
    console.log('Streamifier check: SUCCESS');
} catch (err) {
    console.error('Streamifier check: FAILED', err.message);
}
