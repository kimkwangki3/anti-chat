-- Channels 테이블에 외부 DB 동기화 컬럼 추가
USE anti_chat;
GO

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('Channels') AND name='linkedServer')
    ALTER TABLE Channels ADD linkedServer NVARCHAR(200) NULL;
GO
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('Channels') AND name='linkedDb')
    ALTER TABLE Channels ADD linkedDb NVARCHAR(100) NULL;
GO
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('Channels') AND name='syncEnabled')
    ALTER TABLE Channels ADD syncEnabled BIT NOT NULL DEFAULT 0;
GO
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('Channels') AND name='lastSyncAt')
    ALTER TABLE Channels ADD lastSyncAt DATETIME NULL;
GO

PRINT '동기화 컬럼 추가 완료';
GO
