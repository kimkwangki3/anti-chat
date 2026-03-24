-- 멀티테넌트 마이그레이션
-- 서버의 anti_chat DB에서 실행

USE anti_chat;
GO

-- Channels 테이블에 databaseName 컬럼 추가
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('Channels') AND name='databaseName')
    ALTER TABLE Channels ADD databaseName NVARCHAR(100) NULL;
GO

-- 콘텐츠 테이블의 Users FK 제약 제거 (per-channel DB 유저를 참조하기 위함)
IF EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name='FK__Notices__authorI__' OR name LIKE '%Notices%author%')
    ALTER TABLE Notices DROP CONSTRAINT IF EXISTS FK__Notices__authorI__3C69FB99;
GO
IF EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name LIKE '%Posts%author%')
    ALTER TABLE Posts DROP CONSTRAINT IF EXISTS FK__Posts__authorId__3D5E1FD2;
GO
IF EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name LIKE '%PostComments%author%')
    ALTER TABLE PostComments DROP CONSTRAINT IF EXISTS FK__PostComme__author__3E52440B;
GO
IF EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name LIKE '%Polls%creator%')
    ALTER TABLE Polls DROP CONSTRAINT IF EXISTS FK__Polls__creatorId__3F466844;
GO
IF EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name LIKE '%ChatRooms%admin%')
    ALTER TABLE ChatRooms DROP CONSTRAINT IF EXISTS FK__ChatRooms__adminI__40058253;
GO
IF EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name LIKE '%ChatRooms%member%')
    ALTER TABLE ChatRooms DROP CONSTRAINT IF EXISTS FK__ChatRooms__member__40F9A68C;
GO
IF EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name LIKE '%Messages%sender%')
    ALTER TABLE Messages DROP CONSTRAINT IF EXISTS FK__Messages__senderI__41EDCAC5;
GO
IF EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name LIKE '%Votes%userId%')
    ALTER TABLE Votes DROP CONSTRAINT IF EXISTS FK__Votes__userId__42E1EEFE;
GO
IF EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name LIKE '%NoticeReadBy%userId%')
    ALTER TABLE NoticeReadBy DROP CONSTRAINT IF EXISTS FK__NoticeRea__userId__43D61337;
GO
IF EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name LIKE '%PostReadBy%userId%')
    ALTER TABLE PostReadBy DROP CONSTRAINT IF EXISTS FK__PostReadB__userId__44CA3770;
GO
IF EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name LIKE '%PollReadBy%userId%')
    ALTER TABLE PollReadBy DROP CONSTRAINT IF EXISTS FK__PollReadB__userId__45BE5BA9;
GO
IF EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name LIKE '%PushSubscriptions%userId%')
    ALTER TABLE PushSubscriptions DROP CONSTRAINT IF EXISTS FK__PushSubsc__userId__46B27FE2;
GO

-- FK 전체 삭제 (이름 불확실한 경우 대비)
DECLARE @sql NVARCHAR(MAX) = '';
SELECT @sql += 'ALTER TABLE ' + OBJECT_NAME(parent_object_id) + ' DROP CONSTRAINT ' + name + ';' + CHAR(10)
FROM sys.foreign_keys
WHERE referenced_object_id = OBJECT_ID('Users')
  AND OBJECT_NAME(parent_object_id) IN ('Notices','Posts','PostComments','Polls','ChatRooms','Messages','Votes','NoticeReadBy','PostReadBy','PollReadBy','PushSubscriptions','ChannelMembers');
IF LEN(@sql) > 0 EXEC(@sql);
GO

PRINT '멀티테넌트 마이그레이션 완료';
GO
