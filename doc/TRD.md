# TRD — Technical Requirements Document
## Kanban Board

---

## 1. 기술 스택

| 레이어 | 기술 | 비고 |
|--------|------|------|
| 마크업 | HTML5 | 시맨틱 태그, 인증 오버레이 포함 |
| 스타일 | CSS3 | Flexbox, CSS Custom Properties |
| 동작 | Vanilla JavaScript (ES6+) | async/await |
| 인증 | Supabase Auth | Google OAuth / GitHub OAuth / 이메일 |
| DB | Supabase PostgreSQL | RLS로 사용자별 데이터 격리 |
| SDK | `@supabase/supabase-js@2` | CDN (`jsdelivr`) |
| 빌드 도구 | 없음 | 정적 파일 직접 제공 |

---

## 2. 파일 구조

```
kanban/
├── index.html              # 진입점 (인증 오버레이 + 보드)
├── style.css               # 모든 스타일 (인증 UI 포함)
├── script.js               # 모든 동작 로직 (Supabase 연동)
├── supabase_schema.sql     # cards 테이블 생성 + RLS 정책 SQL
├── supabase_cleanup.sql    # 중복 카드 정리 SQL
├── CLAUDE.md
└── doc/
    ├── PRD.md
    ├── TRD.md
    ├── USER_FLOW.md
    ├── DATA_MODEL.md
    ├── DESIGN_SYSTEM.md
    ├── TASKS.md
    └── CODE_CONVENTIONS.md
```

---

## 3. 브라우저 호환성

| 브라우저 | 최소 버전 | 이유 |
|----------|-----------|------|
| Chrome | 80+ | HTML5 Drag & Drop, async/await |
| Firefox | 75+ | 동일 |
| Edge | 80+ | Chromium 기반 |
| Safari | 14+ | Drag & Drop 부분 지원 주의 |
| IE | 미지원 | ES6 / async 미지원 |

---

## 4. HTML 기술 요구사항

- `<!DOCTYPE html>` 및 `lang="ko"` 선언 필수
- Supabase SDK CDN 로드: `<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2">`
- 인증 오버레이(`#auth-overlay`): 기본 표시, 로그인 후 `hidden` 클래스로 숨김
- 헤더: `.user-bar` + `#signout-btn` (로그인 전 `hidden`, 로그인 후 표시)
- 초기 카드는 HTML에 하드코딩하지 않음 — JS `renderBoard(cards)` 가 렌더링
- `<script>` 태그는 `</body>` 직전 배치 (Supabase SDK 먼저, `script.js` 다음)

---

## 5. CSS 기술 요구사항

- CSS 변수(`--var`)로 색상·간격 중앙 관리
- `.hidden` 유틸리티 클래스: `display: none !important`
- 인증 오버레이: `position: fixed; inset: 0; backdrop-filter: blur(6px)`
- `.card`, `.column h2` 에 `user-select: none` — 텍스트 선택 드래그 오작동 방지
- `.drop-indicator` — 드롭 위치 표시선 (2px 인디고 선)
- 미디어 쿼리: `max-width: 768px`에서 컬럼 세로 배치

---

## 6. JavaScript 기술 요구사항

### 6.1 Supabase 클라이언트

```js
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
```

### 6.2 전역 상태 변수

| 변수 | 타입 | 설명 |
|------|------|------|
| `currentUser` | `object \| null` | 로그인한 사용자 정보 (`id`, `name`, `email`) |
| `draggedCard` | `Element \| null` | 드래그 중인 카드 DOM |
| `lastSignedInId` | `string \| null` | 중복 `handleSignedIn` 실행 방지용 |

### 6.3 인증 이벤트 처리

```
sb.auth.onAuthStateChange((_event, session) => {
  session?.user → handleSignedIn(user)   // 로그인
  null          → handleSignedOut()      // 로그아웃
})
```

`onAuthStateChange`는 등록 즉시 현재 세션으로 한 번 실행되므로 `getSession()` 별도 호출 불필요.

### 6.4 경쟁 조건 방지 (Race Condition Guard)

OAuth 리다이렉트 중 `onAuthStateChange`가 여러 번 발생하는 것에 대한 처리:

```js
// 1. 동일 사용자 중복 실행 방지
if (lastSignedInId === user.id) return;
lastSignedInId = user.id;

// 2. await 전에 userId 로컬 고정
const userId = user.id;

// 3. await 완료 후 stale 체크
if (currentUser?.id !== userId) return;
```

### 6.5 함수 목록

| 함수 | 시그니처 | 역할 |
|------|----------|------|
| `showAuthOverlay` | `()` | 인증 오버레이 표시 |
| `hideAuthOverlay` | `()` | 인증 오버레이 숨김 |
| `setAuthMessage` | `(msg, isError)` | 오버레이 내 메시지 표시 |
| `renderUserBar` | `(user)` | 헤더 사용자 정보 렌더링 |
| `clearUserBar` | `()` | 헤더 사용자 정보 초기화 |
| `loadCards` | `async (userId)` | Supabase DB에서 카드 조회, 없으면 초기 삽입 |
| `insertInitialCards` | `async (userId)` | 첫 로그인 시 초기 카드 7개 삽입 |
| `saveCards` | `async ()` | DOM 상태를 Supabase DB에 upsert |
| `createCard` | `(text, cardId, userId)` | 카드 DOM 생성 (cardId = Supabase UUID) |
| `renderBoard` | `(cards)` | flat 배열을 받아 보드 DOM 렌더링 |
| `getDragAfterElement` | `(cardList, y)` | 마우스 Y 기준 삽입 위치 계산 |
| `showDropIndicator` | `(cardList, afterEl)` | 드롭 위치 표시선 렌더링 |
| `removeDropIndicator` | `()` | 드롭 위치 표시선 제거 |
| `addDragEvents` | `(card)` | 카드에 dragstart·dragend 바인딩 |
| `addColumnEvents` | `(column)` | 컬럼에 dragover·dragenter·dragleave·drop 바인딩 |
| `bindAddButtons` | `()` | 카드 추가 버튼 click 바인딩 (async, DB insert) |
| `handleSignedIn` | `async (user)` | 로그인 처리 (경쟁 조건 방지 포함) |
| `handleSignedOut` | `()` | 로그아웃 처리 |
| `bindAuthButtons` | `()` | 인증 버튼 이벤트 바인딩 |
| `init` | `()` | 앱 초기화 |

### 6.6 Supabase DB 연동

| 작업 | Supabase 쿼리 |
|------|---------------|
| 카드 조회 | `sb.from('cards').select('*').eq('user_id', userId).order('order')` |
| 초기 카드 삽입 | `sb.from('cards').insert([...]).select()` |
| 카드 이동·순서변경 저장 | `sb.from('cards').upsert(cards, { onConflict: 'id' })` |
| 카드 추가 | `sb.from('cards').insert({...}).select().single()` |

---

## 7. Supabase DB 스키마

```sql
create table cards (
  id         uuid primary key default gen_random_uuid(),
  text       text not null,
  column_id  text not null check (column_id in ('todo', 'in-progress', 'done')),
  user_id    uuid not null references auth.users(id) on delete cascade,
  "order"    int  not null default 0,
  created_at timestamptz default now()
);

alter table cards enable row level security;
-- RLS 정책 4개: select / insert / update / delete 각각 auth.uid() = user_id 조건
```

---

## 8. 성능 요구사항

| 항목 | 기준 |
|------|------|
| 초기 로딩 | 1초 이내 |
| 드래그 응답 | 프레임 드롭 없음 (60fps) |
| 파일 크기 | HTML < 5KB, CSS < 10KB, JS < 15KB |

---

## 9. 접근성 요구사항

- 포커스 가시성: `outline` 제거 시 대체 스타일 적용
- 버튼은 `<button>` 태그 사용
- 인증 입력 필드에 `autocomplete` 속성 적용
