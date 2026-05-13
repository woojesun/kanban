# Tasks — AI Agent 작업 목록
## Kanban Board

> 모든 태스크 완료. 구현 기록 문서로 활용.

---

## Phase 1: 기반 구조 ✅

### TASK-01: index.html ✅
- 헤더(`.user-bar`, `#signout-btn`) + 3컬럼 보드 구조
- 인증 오버레이(`#auth-overlay`): Google/GitHub/이메일 버튼, 폼
- Supabase SDK CDN + `script.js` 로드 (body 맨 아래)
- 초기 카드 HTML 하드코딩 없음

### TASK-02: style.css — 레이아웃 및 헤더 ✅
- CSS 변수 전체 선언 (`:root`)
- 헤더, `.user-bar`, `.signout-btn`, `.board`, `.column` 스타일
- 컬럼별 배경색 (`#todo`, `#in-progress`, `#done`)

### TASK-03: style.css — 카드·버튼·인증 UI ✅
- `.card`: `user-select: none`, hover/dragging 상태
- `.drop-indicator`: 2px 인디고 드롭 위치 표시선
- `.add-btn` 스타일
- `.auth-overlay`, `.auth-card`, `.btn-oauth`, `.btn-google`, `.btn-github`
- `.auth-input`, `.btn-primary`, `.btn-secondary`, `.auth-message`
- 미디어 쿼리 (`max-width: 768px`)

---

## Phase 2: 인터랙션 로직 ✅

### TASK-04: script.js — Supabase 초기화 및 전역 상태 ✅
- `sb = window.supabase.createClient(URL, KEY)`
- `currentUser`, `draggedCard`, `lastSignedInId` 전역 변수

### TASK-05: script.js — 인증 UI 함수 ✅
- `showAuthOverlay()`, `hideAuthOverlay()`
- `setAuthMessage(msg, isError)`, `clearAuthMessage()`
- `renderUserBar(user)`, `clearUserBar()`

### TASK-06: script.js — Supabase DB 저장/불러오기 ✅
- `loadCards(userId)`: SELECT + 없으면 `insertInitialCards` 호출
- `insertInitialCards(userId)`: 초기 7개 카드 INSERT, UUID 반환
- `saveCards()`: 전체 DOM 상태를 UPSERT (카드 이동·순서변경 후 호출)

### TASK-07: script.js — 카드·보드 렌더링 ✅
- `createCard(text, cardId, userId)`: Supabase UUID를 `data-card-id`에 설정
- `renderBoard(cards)`: flat 배열(order 정렬) → DOM 렌더링

### TASK-08: script.js — 드롭 위치 계산 ✅
- `getDragAfterElement(cardList, y)`: 마우스 Y 기준 삽입 위치 계산
- `showDropIndicator(cardList, afterEl)` / `removeDropIndicator()`

### TASK-09: script.js — 드래그 이벤트 ✅
- `addDragEvents(card)`: dragstart(target 검사, rAF로 `.dragging`) / dragend
- `addColumnEvents(column)`: dragover·dragenter·dragleave·drop (async, `saveCards` 호출)
- `bindAddButtons()`: async, DB INSERT → UUID 반환 → DOM 생성

### TASK-10: script.js — 인증 흐름 ✅
- `handleSignedIn(user)`: 경쟁 조건 방지 3단계 가드 포함
- `handleSignedOut()`: `lastSignedInId = null` 리셋
- `bindAuthButtons()`: Google·GitHub OAuth, 이메일 로그인·회원가입, 로그아웃
- `init()`: `onAuthStateChange` 구독 → 컬럼·버튼 이벤트 바인딩

---

## Phase 3: 버그 수정 ✅

### TASK-11: 드래그 오작동 버그 수정 ✅
- `.card`, `.column h2`에 `user-select: none` 추가
- `dragstart`에서 `e.target !== card` 시 취소
- `dragenter/dragover/drop`에 `if (!draggedCard)` 가드 추가

### TASK-12: 경쟁 조건(Race Condition) 수정 ✅
- `lastSignedInId` 변수로 동일 사용자 중복 초기화 방지
- `handleSignedIn`에서 `userId` 로컬 고정 + await 후 stale 체크
- 증상: OAuth 리다이렉트 중 `onAuthStateChange` 중복 발생 → 카드 중복 삽입

---

## Phase 4: 검증 ✅

### TASK-13: 통합 테스트 체크리스트
- [x] 로그인 오버레이 표시 (미인증 상태)
- [x] Google OAuth 로그인 → 보드 표시, 초기 카드 7개
- [x] GitHub OAuth 로그인 → 독립된 보드 (설정에 따라 별도 계정)
- [x] 이메일 회원가입 → 확인 이메일 발송
- [x] 이메일 로그인 → 보드 표시
- [x] 로그아웃 → 오버레이 복귀
- [x] 카드 드래그 → 컬럼 간 이동 → DB 저장
- [x] 같은 컬럼 내 순서 변경 → DB 저장
- [x] 새로고침 후 카드 위치 유지 (Supabase DB)
- [x] 카드 추가 → DB INSERT → 드래그 가능
- [x] 빈 공간 드래그 시 오작동 없음
- [x] 섹션 제목 텍스트 선택·드래그 불가
- [x] 768px 이하 반응형 레이아웃
