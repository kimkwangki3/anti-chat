-- 채널별 로그인 페이지 기능: Channels 테이블에 로그인 페이지 커스터마이즈 컬럼 추가
-- 실행: .20 서버 마스터 DB(anti_chat)에서 1회 실행
-- (cardColor 컬럼은 기존에 있으면 테마색으로 재사용)

IF COL_LENGTH('Channels', 'loginLogo') IS NULL
    ALTER TABLE Channels ADD loginLogo NVARCHAR(500) NULL;        -- 로그인 화면 아이콘/로고 URL
GO
IF COL_LENGTH('Channels', 'loginTitle') IS NULL
    ALTER TABLE Channels ADD loginTitle NVARCHAR(100) NULL;       -- 로그인 화면 제목/환영 문구
GO
IF COL_LENGTH('Channels', 'loginDomain') IS NULL
    ALTER TABLE Channels ADD loginDomain NVARCHAR(255) NULL;      -- 이 채널 로그인에 연결할 커스텀 도메인(host)
GO
IF COL_LENGTH('Channels', 'cardColor') IS NULL
    ALTER TABLE Channels ADD cardColor NVARCHAR(20) NULL;         -- 테마 색상(이미 있으면 무시됨)
GO
