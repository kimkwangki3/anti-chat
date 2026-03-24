-- 채널별 DB 스키마 (채널 생성 시 자동 실행)
-- 이 파일은 각 채널의 전용 DB에 Users 테이블을 생성합니다

IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Users' AND xtype='U')
CREATE TABLE Users (
    id               INT            IDENTITY(1,1) PRIMARY KEY,
    name             NVARCHAR(100)  NOT NULL,
    username         NVARCHAR(100)  NOT NULL UNIQUE,
    password         NVARCHAR(255)  NOT NULL,
    nickname         NVARCHAR(100),
    profileImage     NVARCHAR(500),
    gender           NVARCHAR(10)   DEFAULT 'none',
    birthdate        NVARCHAR(20),
    phone            NVARCHAR(50),
    memo             NVARCHAR(MAX)  DEFAULT '',
    recommender      NVARCHAR(100),
    registrationIp   NVARCHAR(100),
    role             NVARCHAR(20)   DEFAULT 'member',   -- admin | member
    isOnline         BIT            DEFAULT 0,
    presenceStatus   NVARCHAR(20)   DEFAULT 'offline',  -- online | idle | offline
    lastLoginIp      NVARCHAR(100),
    lastLoginAt      DATETIME,
    lastLogoutAt     DATETIME,
    status           NVARCHAR(20)   DEFAULT 'approved', -- approved | suspended | pending
    isChatBlocked    BIT            DEFAULT 0,
    currentSessionId NVARCHAR(100),
    agreedToPrivacy  BIT            DEFAULT 0,
    createdAt        DATETIME       DEFAULT GETDATE(),
    updatedAt        DATETIME       DEFAULT GETDATE()
);
GO

IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='LoginHistory' AND xtype='U')
CREATE TABLE LoginHistory (
    id          INT            IDENTITY(1,1) PRIMARY KEY,
    userId      INT            NOT NULL,
    ip          NVARCHAR(100),
    userAgent   NVARCHAR(500),
    loginAt     DATETIME       DEFAULT GETDATE(),
    logoutAt    DATETIME       NULL
);
GO
