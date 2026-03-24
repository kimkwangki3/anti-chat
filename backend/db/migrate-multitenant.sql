-- 멀티테넌트 마이그레이션
-- 서버의 anti_chat DB에서 실행

USE anti_chat;
GO

-- Channels 테이블에 databaseName 컬럼 추가
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('Channels') AND name='databaseName')
    ALTER TABLE Channels ADD databaseName NVARCHAR(100) NULL;
GO

-- Users 테이블을 참조하는 FK 제약 전부 동적으로 제거
DECLARE @sql NVARCHAR(MAX) = '';
SELECT @sql += 'ALTER TABLE [' + OBJECT_NAME(parent_object_id) + '] DROP CONSTRAINT [' + name + '];' + CHAR(10)
FROM sys.foreign_keys
WHERE referenced_object_id = OBJECT_ID('Users');
IF LEN(@sql) > 0 EXEC(@sql);
GO

PRINT '멀티테넌트 마이그레이션 완료';
GO
