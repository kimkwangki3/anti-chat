const fs = require('fs');
const path = require('path');

// 로그 디렉토리 생성
const logDirectory = path.join(__dirname, '../logs');
if (!fs.existsSync(logDirectory)) {
    fs.mkdirSync(logDirectory);
}

// 일반 로그 기록 (인증 등)
const writeAuthLog = (message) => {
    const logPath = path.join(logDirectory, 'auth_logs.txt');
    const timestamp = new Date().toLocaleString();
    const logEntry = `[${timestamp}] ${message}\n`;
    fs.appendFileSync(logPath, logEntry);
};

// 채팅 로그 기록
const writeChatLog = (roomId, senderName, content) => {
    const chatLogDir = path.join(logDirectory, 'chat');
    if (!fs.existsSync(chatLogDir)) {
        fs.mkdirSync(chatLogDir);
    }

    const logPath = path.join(chatLogDir, `${roomId}.txt`);
    const timestamp = new Date().toLocaleString();
    const logEntry = `[${timestamp}] ${senderName}: ${content}\n`;
    fs.appendFileSync(logPath, logEntry);
};

module.exports = { writeAuthLog, writeChatLog };
