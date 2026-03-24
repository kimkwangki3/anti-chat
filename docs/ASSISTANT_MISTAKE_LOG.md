# Assistant Mistake Log (재발 방지)

## 목적
- 같은 장애를 반복하지 않기 위한 실수 기록과 사전 점검표.
- 기능 추가/배포 전 이 문서를 먼저 확인한다.

## 최근 실수와 원인

1. 한글 깨짐 문자열 반영
- 원인: 파일 인코딩/복사 과정에서 문자열이 깨진 상태로 커밋됨.
- 예방:
  - 한국어 텍스트가 많은 파일은 수정 후 즉시 화면/빌드 확인.
  - 깨진 문자열(`梨`, `?`) 존재 여부를 검색 후 커밋.

2. 서버 반영 여부를 코드 문제와 혼동
- 원인: 로컬 수정은 맞는데 서버가 구버전으로 떠있어 404/실패 발생.
- 예방:
  - 기능 오류 제보 시 먼저 서버 커밋 해시 확인:
    - `git -C C:\apps\anti log -1 --oneline`
    - 최신 원격과 일치 여부 확인 후 디버깅 시작.

3. 보호 라우트 진단 미흡
- 원인: 라우트 존재/미존재를 구분하지 않고 일반 실패로 처리.
- 예방:
  - 보호 라우트는 토큰 없이 호출해 상태코드로 존재 확인:
    - 존재: 보통 `401/403`
    - 미존재: `404`

4. 에러 메시지 가시성 부족
- 원인: 프론트 alert가 일반 문구만 표시해 원인 추적 지연.
- 예방:
  - 사용자 액션 실패 alert에 `server message` 우선 표시.
  - 없으면 `HTTP status`를 함께 표시.

5. Git 락 충돌
- 원인: `git add`와 `git commit`을 병렬 실행하여 `index.lock` 충돌.
- 예방:
  - Git 명령은 순차 실행 (`add -> commit -> push`).
  - 병렬 툴 사용 금지(특히 git 작업).

## 기능별 사전 체크리스트

### A. 최고관리자 회원 관리 변경 전
- [ ] `backend/routes/superadmin.js` 라우트 추가/변경 확인
- [ ] `frontend/src/pages/SuperAdminUsers.jsx` 요청 경로 일치 확인
- [ ] 실패 alert에 HTTP 코드 표시 확인

### B. 최고관리자 1:1 채팅 변경 전
- [ ] `backend/routes/chat.js` `/rooms/superadmin` 존재 확인
- [ ] 중복키(11000) fallback 처리 확인
- [ ] 프론트에서 서버 메시지 출력 확인

### C. 배포 전
- [ ] `npm run build` 성공
- [ ] 커밋 후 원격 push 성공
- [ ] 서버(`C:\apps\anti`) 최신 커밋 반영 확인
- [ ] 포트 확인: `5000`, `3000`

## 운영 진단 명령(Windows)

```powershell
git -C C:\apps\anti log -1 --oneline
git -C C:\apps\anti fetch origin main
git -C C:\apps\anti rev-parse --short HEAD
git -C C:\apps\anti rev-parse --short origin/main

netstat -ano | findstr :5000
netstat -ano | findstr :3000

Get-Content C:\apps\anti\logs\backend.log -Tail 120
Get-Content C:\apps\anti\logs\frontend.log -Tail 120
```

---

## Auto-Append Rule (mandatory)
- If I judge a change as a mistake or omission, I must update this log in the same work cycle.
- I must add:
  - what failed
  - why it failed
  - one concrete prevention check
- I must not close the task before adding the prevention check.

## Newly Added Mistakes (2026-03-14)

6. Missing dependency file in commit (`roleUtils.js`)
- What failed:
  - Build failed on server with `Could not resolve "../../utils/roleUtils"`.
- Why:
  - Import was added in navigation code, but helper file was not included in pushed commit.
- Prevention:
  - Before commit, run `rg -n "from '../../utils/roleUtils|from '../utils/roleUtils'" frontend/src`.
  - Ensure every imported local module exists and is tracked by git:
    - `git status --short`
    - verify required new files are staged.

7. Duplicate blocks in channel settings view
- What failed:
  - Channel-context settings displayed two admin action blocks.
- Why:
  - Global admin quick access block and channel-mode block were rendered together.
- Prevention:
  - For settings changes, validate both routes separately:
    - `/settings` (main profile mode)
    - `/settings?channelId=<ownedChannelId>` (channel mode)
  - Ensure mutually exclusive rendering conditions.

8. Upload error not actionable
- What failed:
  - Avatar and board file uploads failed with generic UI alert.
- Why:
  - Upload middleware errors were not normalized into JSON with detail.
- Prevention:
  - Wrap multer middleware with explicit error response:
    - return `{ message, detail }` on middleware error.
  - In frontend, show `detail` if available.

9. Feature implemented but runtime verification incomplete
- What failed:
  - Code merged but user still saw failures due to runtime behavior differences.
- Why:
  - Build-only verification was done; runtime API path and middleware behavior needed explicit checks.
- Prevention:
  - After upload-related changes, always run:
    - API runtime check from server logs
    - one real UI upload test (avatar + board attachment)
  - If user reports failure, first verify deployed commit hash on server before further patching.

10. Notification sound preview depended on async resume
- What failed:
  - The settings page `SIGNAL TEST` did not ring even though the UI path was wired.
- Why:
  - Audio playback waited on `AudioContext.resume()` before scheduling tones, which can miss the user-gesture window in some browsers.
- Prevention:
  - For click-triggered previews, use a fresh audio context and schedule the tone immediately in the gesture handler.
  - Keep runtime notifications on a separate unlocked path, and verify preview sound before shipping.
