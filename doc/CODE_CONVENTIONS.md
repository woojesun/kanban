# Code Conventions
## Kanban Board

---

## 1. 공통

- 들여쓰기: **스페이스 2칸**
- 파일 인코딩: **UTF-8**
- 줄 끝: **LF** (CRLF 금지)
- 파일 끝 빈 줄: **1개**
- 주석: 동작 자체보다 **이유(Why)**가 불분명한 경우에만 작성

---

## 2. 다중 사용자 원칙 (최우선 규칙)

> v2.0 Supabase 연동 시 구조 변경을 최소화하기 위해 아래 규칙을 반드시 지킨다.

1. **모든 데이터 함수는 `userId` 파라미터를 받는다.**
   - `createCard(text, userId)` ← userId 없이 호출 금지
   - `saveToStorage(userId)` ← userId 없이 호출 금지

2. **localStorage 키는 반드시 userId를 포함한다.**
   ```js
   // Good
   localStorage.setItem(`kanban-${userId}`, JSON.stringify(data));

   // Bad
   localStorage.setItem('kanban-data', JSON.stringify(data));
   ```

3. **카드 DOM에는 `data-user-id` 속성을 항상 설정한다.**
   ```html
   <!-- Good -->
   <div class="card" draggable="true" data-card-id="card-1" data-user-id="guest">...</div>

   <!-- Bad -->
   <div class="card" draggable="true">...</div>
   ```

4. **`currentUser` 객체를 직접 하드코딩하지 않는다.** 항상 변수를 통해 참조한다.
   ```js
   // Good
   createCard(text, currentUser.id);

   // Bad
   createCard(text, 'guest');
   ```

---

## 3. HTML

### 네이밍
- 클래스: `kebab-case` (`card-list`, `add-btn`, `drag-over`, `user-bar`)
- ID: `kebab-case` (`todo`, `in-progress`, `done`)
- data 속성: `data-kebab-case` (`data-card-id`, `data-user-id`)
- 속성 따옴표: **쌍따옴표** (`class="card"`)

### 구조 규칙
- 시맨틱 태그 우선 (`<section>`, `<header>`, `<main>`, `<button>`)
- 인라인 스타일 금지 (`style=""` 사용 불가)
- `<script>` 는 `</body>` 바로 앞에만 위치
- 초기 카드는 HTML에 하드코딩하지 않고 JS가 렌더링

### 예시
```html
<!-- Good -->
<header data-user-id="guest">
  <h1>Kanban Board</h1>
  <div class="user-bar">
    <div class="user-avatar">G</div>
    <span class="user-name">게스트</span>
    <span class="user-badge">Guest</span>
  </div>
</header>

<section class="column" id="todo">
  <h2 class="column-title">To-Do</h2>
  <div class="card-list"></div>
  <button class="add-btn">+ 카드 추가</button>
</section>

<!-- Bad -->
<div id="Todo" style="background: blue;">
  <div class="card">하드코딩된 카드</div>  ← JS 렌더링이 덮어씀
</div>
```

---

## 4. CSS

### 네이밍
- 선택자: `kebab-case` (`.card-list`, `.drag-over`, `.user-bar`)
- 상태 클래스: 동작 직관적 이름 (`.dragging`, `.drag-over`)

### 선언 순서 (컴포넌트 내)
1. `display`, `position`, `flex`/`grid` 관련
2. `width`, `height`, `padding`, `margin`
3. `background`, `border`, `border-radius`
4. `color`, `font`, `text-*`
5. `cursor`, `transition`, `opacity`

### 규칙
- CSS 변수는 `:root`에 선언, 하드코딩 금지
- `!important` 금지
- 매직 넘버 금지 (변수 또는 주석으로 설명)
- 미디어 쿼리는 파일 하단에 모아서 작성

### 예시
```css
/* Good */
.user-bar {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-xs) var(--space-sm);
  background: var(--color-user-bar-bg);
  border-radius: 20px;
}

.card {
  display: flex;
  padding: var(--space-sm) var(--space-md);
  background: var(--color-card-bg);
  border-radius: 8px;
  cursor: grab;
  transition: box-shadow 0.15s;
}

/* Bad */
.card {
  background: #fff !important;
  padding: 8px 16px;
}
```

---

## 5. JavaScript

### 네이밍
- 변수/함수: `camelCase` (`draggedCard`, `addDragEvents`, `currentUser`)
- 상수: `UPPER_SNAKE_CASE` (`const STORAGE_KEY_PREFIX = 'kanban'`)
- DOM 요소 변수: 접두사 없이 역할 명시 (`const cardList = column.querySelector(...)`)
- Boolean 변수: `is`, `has`, `can` 접두사 (`isDragging`)

### 함수 규칙
- 함수 하나는 역할 하나
- 함수명은 동사로 시작 (`createCard`, `saveToStorage`, `renderBoard`)
- 화살표 함수: 콜백에서 사용, 최상위 함수는 `function` 선언식 사용
- 데이터 조작 함수는 항상 `userId`를 마지막 파라미터 앞에 위치

### 변수 선언
- `const` 기본, 재할당 필요 시 `let`
- `var` 금지

### 이벤트 핸들러
- 익명 함수 직접 작성 가능 (간단한 경우)
- 재사용되는 핸들러는 명명 함수로 분리

### 예시
```js
// Good
function createCard(text, userId) {
  const card = document.createElement('div');
  card.className = 'card';
  card.draggable = true;
  card.dataset.userId = userId;
  card.textContent = text;
  return card;
}

function saveToStorage(userId) {
  const state = serializeBoardState();
  localStorage.setItem(`kanban-${userId}`, JSON.stringify(state));
}

// Bad
function createCard(text) {          // userId 파라미터 누락
  var c = document.createElement('div');
  c.innerHTML = text;                 // textContent 대신 innerHTML 사용 금지
  localStorage.setItem('kanban-data', '...');  // userId 없는 키
  return c;
}
```

### 파일 구조 순서
```js
'use strict';

// 1. 상수 (STORAGE_KEY_PREFIX 등)
// 2. 전역 상태 변수 (currentUser, draggedCard)
// 3. 사용자 헬퍼 (renderUserBar)
// 4. 저장/불러오기 함수 (saveToStorage, loadFromStorage, getInitialData)
// 5. 카드/보드 렌더링 함수 (createCard, renderBoard)
// 6. 드롭 위치 계산 함수 (getDragAfterElement, showDropIndicator, removeDropIndicator)
// 7. 이벤트 바인딩 함수 (addDragEvents, addColumnEvents, bindAddButtons)
// 8. 초기화 함수 (init)
// 9. 진입점 (DOMContentLoaded)
```

---

## 6. Git 커밋 메시지

```
feat: userId 기반 localStorage 저장 구현
feat: 다중 사용자 대비 createCard userId 파라미터 추가
fix: 드래그 오버 클래스 누적 버그 수정
style: user-bar 컴포넌트 스타일 추가
refactor: addDragEvents 함수 분리
docs: TASKS.md 체크리스트 업데이트
```

- 형식: `<type>: <한글 설명>`
- type: `feat`, `fix`, `style`, `refactor`, `docs`, `chore`
