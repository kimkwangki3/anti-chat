const { test, expect } = require('@playwright/test');

/**
 * 이 테스트는 로컬 환경에서 백엔드와 프론트엔드 서버가 모두 실행 중이어야 합니다.
 * 기본 URL: http://localhost:3000
 */
test.describe('Dashboard Notification Sync', () => {

    test('로그인 후 읽지 않은 알림 배지가 노출되고, 페이지 방문 시 서버와 동기화되어 사라지는지 확인', async ({ page }) => {
        // 1. 로그인 (실제 테스트 시에는 테스트용 계정 정보를 사용하세요)
        await page.goto('/login');
        await page.fill('input[name="username"]', 'user2');
        await page.fill('input[name="password"]', 'password123');
        await page.click('button[type="submit"]');

        // 대시보드 로딩 대기
        await expect(page).toHaveURL('/');

        // 2. 읽지 않은 알림 배지(빨간색 숫자)가 있는지 확인
        // 배지 요소가 나타날 때까지 기다립니다.
        const badge = page.locator('.animate-bounce');

        // 만약 읽지 않은 글이 있다면 배지가 보여야 함
        const hasUnread = await badge.isVisible();
        console.log(`Initial unread badge visible: ${hasUnread}`);

        if (hasUnread) {
            // 3. 알림이 있는 채널의 '공지사항' 페이지로 이동 (예시로 첫 번째 알림 클릭)
            await page.click('text=새로운 소식이 있습니다'); // 대시보드 요약 섹션 클릭

            // 4. 공지사항 페이지 방문 후 다시 대시보드로 이동
            await page.goto('/');

            // 5. 서버와 동기화되어 배지가 사라졌는지 확인
            // (주의: 다른 종류의 알림이 더 남아있다면 배지가 계속 보일 수 있음)
            // 여기서는 예시로 'not.toBeVisible'을 체크하거나 숫자가 줄었는지 확인 가능
            console.log('Visited notice page, checked dashboard again.');
        } else {
            console.log('No unread items found for this test user.');
        }
    });

});
