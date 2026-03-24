-- Anti Chat — MSSQL Schema
-- 실행 순서: FK 의존성 순서대로 위에서 아래로 실행

USE anti_chat;
GO

-- Users
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Users' AND xtype='U')
CREATE TABLE Users (
    id               INT            IDENTITY(1,1) PRIMARY KEY,
    name             NVARCHAR(100)  NOT NULL,
    username         NVARCHAR(100)  NOT NULL UNIQUE,
    password         NVARCHAR(255)  NOT NULL,
    nickname         NVARCHAR(100),
    profileImage     NVARCHAR(500),
    gender           NVARCHAR(10)   DEFAULT 'none',   -- male | female | other | none
    birthdate        NVARCHAR(20),                    -- YYYY-MM-DD
    phone            NVARCHAR(50),
    memo             NVARCHAR(MAX)  DEFAULT '',
    recommender      NVARCHAR(100),
    registrationIp   NVARCHAR(100),
    registrationMac  NVARCHAR(100)  DEFAULT 'N/A (Browser Restricted)',
    role             NVARCHAR(20)   DEFAULT 'member', -- superadmin | admin | member | withdrawn
    isOnline         BIT            DEFAULT 0,
    lastLoginIp      NVARCHAR(100),
    lastLoginAt      DATETIME,
    lastLogoutAt     DATETIME,
    status           NVARCHAR(20)   DEFAULT 'active', -- active | suspended | withdrawn
    currentSessionId NVARCHAR(100),
    createdAt        DATETIME       DEFAULT GETDATE(),
    updatedAt        DATETIME       DEFAULT GETDATE()
);
GO

-- Channels
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Channels' AND xtype='U')
CREATE TABLE Channels (
    id           INT            IDENTITY(1,1) PRIMARY KEY,
    ownerId      INT            NOT NULL REFERENCES Users(id),
    name         NVARCHAR(200)  NOT NULL UNIQUE,
    slug         NVARCHAR(200)  UNIQUE,
    description  NVARCHAR(MAX)  NOT NULL,
    profileImage NVARCHAR(500)  DEFAULT '',
    status       NVARCHAR(20)   DEFAULT 'active',     -- active | suspended | deleted
    cardColor    NVARCHAR(50)   DEFAULT '#4f6ef7',
    createdAt    DATETIME       DEFAULT GETDATE(),
    updatedAt    DATETIME       DEFAULT GETDATE()
);
GO

-- ChannelMembers
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='ChannelMembers' AND xtype='U')
CREATE TABLE ChannelMembers (
    id           INT          IDENTITY(1,1) PRIMARY KEY,
    channelId    INT          NOT NULL REFERENCES Channels(id),
    userId       INT          NOT NULL REFERENCES Users(id),
    status       NVARCHAR(20) DEFAULT 'pending', -- pending|approved|rejected|kicked|suspended|withdrawn|inactive
    isChatBlocked BIT         DEFAULT 0,
    createdAt    DATETIME     DEFAULT GETDATE(),
    updatedAt    DATETIME     DEFAULT GETDATE(),
    UNIQUE (channelId, userId)
);
GO

-- Notices
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Notices' AND xtype='U')
CREATE TABLE Notices (
    id        INT            IDENTITY(1,1) PRIMARY KEY,
    channelId INT            NOT NULL REFERENCES Channels(id),
    authorId  INT            NOT NULL REFERENCES Users(id),
    title     NVARCHAR(500)  NOT NULL,
    content   NVARCHAR(MAX)  NOT NULL,
    isPinned  BIT            DEFAULT 0,
    imageUrl  NVARCHAR(500),
    createdAt DATETIME       DEFAULT GETDATE(),
    updatedAt DATETIME       DEFAULT GETDATE()
);
GO

-- NoticeReadBy (공지 읽음 여부)
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='NoticeReadBy' AND xtype='U')
CREATE TABLE NoticeReadBy (
    id       INT  IDENTITY(1,1) PRIMARY KEY,
    noticeId INT  NOT NULL REFERENCES Notices(id) ON DELETE CASCADE,
    userId   INT  NOT NULL REFERENCES Users(id),
    UNIQUE (noticeId, userId)
);
GO

-- Posts
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Posts' AND xtype='U')
CREATE TABLE Posts (
    id          INT            IDENTITY(1,1) PRIMARY KEY,
    channelId   INT            NOT NULL REFERENCES Channels(id),
    authorId    INT            NOT NULL REFERENCES Users(id),
    title       NVARCHAR(500)  NOT NULL,
    content     NVARCHAR(MAX)  NOT NULL,
    attachments NVARCHAR(MAX),  -- JSON: [{fileName, fileUrl, mimeType, size}]
    createdAt   DATETIME       DEFAULT GETDATE(),
    updatedAt   DATETIME       DEFAULT GETDATE()
);
GO

-- PostComments (Post.comments 임베디드 배열을 별도 테이블로)
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='PostComments' AND xtype='U')
CREATE TABLE PostComments (
    id        INT           IDENTITY(1,1) PRIMARY KEY,
    postId    INT           NOT NULL REFERENCES Posts(id) ON DELETE CASCADE,
    authorId  INT           NOT NULL REFERENCES Users(id),
    content   NVARCHAR(MAX) NOT NULL,
    createdAt DATETIME      DEFAULT GETDATE(),
    updatedAt DATETIME      DEFAULT GETDATE()
);
GO

-- PostReadBy (게시글 읽음 여부)
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='PostReadBy' AND xtype='U')
CREATE TABLE PostReadBy (
    id     INT  IDENTITY(1,1) PRIMARY KEY,
    postId INT  NOT NULL REFERENCES Posts(id) ON DELETE CASCADE,
    userId INT  NOT NULL REFERENCES Users(id),
    UNIQUE (postId, userId)
);
GO

-- Polls
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Polls' AND xtype='U')
CREATE TABLE Polls (
    id                 INT            IDENTITY(1,1) PRIMARY KEY,
    channelId          INT            NOT NULL REFERENCES Channels(id),
    creatorId          INT            NOT NULL REFERENCES Users(id),
    title              NVARCHAR(500)  NOT NULL,
    options            NVARCHAR(MAX)  NOT NULL,  -- JSON: [{text, count}]
    isMultipleSelection BIT           DEFAULT 0,
    isAnonymous        BIT            DEFAULT 0,
    allowAddOption     BIT            DEFAULT 0,
    expiresAt          DATETIME       NOT NULL,
    status             NVARCHAR(20)   DEFAULT 'active',  -- active | closed
    createdAt          DATETIME       DEFAULT GETDATE()
);
GO

-- PollReadBy (투표 읽음 여부)
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='PollReadBy' AND xtype='U')
CREATE TABLE PollReadBy (
    id     INT  IDENTITY(1,1) PRIMARY KEY,
    pollId INT  NOT NULL REFERENCES Polls(id) ON DELETE CASCADE,
    userId INT  NOT NULL REFERENCES Users(id),
    UNIQUE (pollId, userId)
);
GO

-- Votes
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Votes' AND xtype='U')
CREATE TABLE Votes (
    id              INT           IDENTITY(1,1) PRIMARY KEY,
    pollId          INT           NOT NULL REFERENCES Polls(id),
    userId          INT           NOT NULL REFERENCES Users(id),
    selectedOptions NVARCHAR(MAX) NOT NULL,  -- JSON: ["0", "2"]
    createdAt       DATETIME      DEFAULT GETDATE(),
    UNIQUE (pollId, userId)
);
GO

-- ChatRooms
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='ChatRooms' AND xtype='U')
CREATE TABLE ChatRooms (
    id               INT           IDENTITY(1,1) PRIMARY KEY,
    channelId        INT           NOT NULL REFERENCES Channels(id),
    adminId          INT           NOT NULL REFERENCES Users(id),
    memberId         INT           NOT NULL REFERENCES Users(id),
    lastMessage      NVARCHAR(MAX) DEFAULT '',
    lastMessageAt    DATETIME      DEFAULT GETDATE(),
    unreadCountAdmin INT           DEFAULT 0,
    unreadCountMember INT          DEFAULT 0,
    adminVisible     BIT           DEFAULT 1,
    memberVisible    BIT           DEFAULT 1,
    clearedAtAdmin   DATETIME,
    clearedAtMember  DATETIME,
    createdAt        DATETIME      DEFAULT GETDATE(),
    updatedAt        DATETIME      DEFAULT GETDATE(),
    UNIQUE (adminId, memberId, channelId)
);
GO

-- Messages
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Messages' AND xtype='U')
CREATE TABLE Messages (
    id        INT            IDENTITY(1,1) PRIMARY KEY,
    roomId    INT            NOT NULL REFERENCES ChatRooms(id),
    senderId  INT            NOT NULL REFERENCES Users(id),
    content   NVARCHAR(MAX),
    fileUrl   NVARCHAR(500),
    fileType  NVARCHAR(100),
    fileName  NVARCHAR(500),
    isRead    BIT            DEFAULT 0,
    createdAt DATETIME       DEFAULT GETDATE(),
    updatedAt DATETIME       DEFAULT GETDATE()
);
GO

-- PushSubscriptions
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='PushSubscriptions' AND xtype='U')
CREATE TABLE PushSubscriptions (
    id           INT           IDENTITY(1,1) PRIMARY KEY,
    userId       INT           NOT NULL REFERENCES Users(id),
    subscription NVARCHAR(MAX) NOT NULL,  -- JSON
    createdAt    DATETIME      DEFAULT GETDATE()
);
GO

-- 기본 슈퍼어드민 계정 생성 (없을 경우에만)
IF NOT EXISTS (SELECT 1 FROM Users WHERE username = 'admin')
    INSERT INTO Users (name, username, password, role)
    VALUES (N'최고관리자', 'admin', 'dkfvkrh123', 'superadmin');
GO
