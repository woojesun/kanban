# Design System
## Kanban Board

---

## 1. 색상 (Color Palette)

CSS 변수로 정의하여 `style.css` 상단에 선언.

```css
:root {
  /* 배경 */
  --color-bg-page:          #f0f2f5;   /* 전체 페이지 배경 */
  --color-bg-header:        #1e1e2e;   /* 헤더 배경 */

  /* 컬럼 */
  --color-col-todo:         #dbeafe;   /* To-Do 컬럼 배경 (파랑 계열) */
  --color-col-progress:     #fef9c3;   /* In Progress 컬럼 배경 (노랑 계열) */
  --color-col-done:         #dcfce7;   /* Done 컬럼 배경 (초록 계열) */

  /* 컬럼 헤더 강조 */
  --color-col-todo-hd:      #3b82f6;
  --color-col-progress-hd:  #eab308;
  --color-col-done-hd:      #22c55e;

  /* 카드 */
  --color-card-bg:          #ffffff;
  --color-card-shadow:      rgba(0, 0, 0, 0.08);

  /* 드래그 상태 */
  --color-drag-over:        #c7d2fe;   /* 드롭 가능 컬럼 강조 (보라 계열) */

  /* 텍스트 */
  --color-text-primary:     #1e293b;
  --color-text-muted:       #64748b;
  --color-text-header:      #f8fafc;

  /* 버튼 */
  --color-btn-bg:           #e2e8f0;
  --color-btn-hover:        #cbd5e1;

  /* 사용자 바 */
  --color-user-bar-bg:      rgba(255, 255, 255, 0.08);
  --color-user-avatar:      #6366f1;
  --color-user-badge:       #f59e0b;

  /* 간격 */
  --space-xs:  4px;
  --space-sm:  8px;
  --space-md:  16px;
  --space-lg:  24px;
  --space-xl:  40px;
}
```

> `--color-card-hover`는 CSS 변수 대신 `.card:hover`의 `box-shadow`로 구현됨.
> 드롭 인디케이터 색상(`#6366f1`)은 `--color-user-avatar`와 동일 값 사용.

---

## 2. 타이포그래피 (Typography)

| 역할 | 태그 / 클래스 | 크기 | 굵기 | 색상 |
|------|--------------|------|------|------|
| 페이지 제목 | `header h1` | 1.25rem | 700 | `--color-text-header` |
| 사용자 이름 | `.user-name` | 0.875rem | 500 | `--color-text-header` |
| 사용자 배지 | `.user-badge` | 0.6875rem | 600 | `--color-user-badge` |
| 컬럼 제목 | `.column h2` | 0.9375rem | 700 | 컬럼 헤더 색상 |
| 카드 본문 | `.card` | 0.875rem | 400 | `--color-text-primary` |
| 버튼 텍스트 | `.add-btn` | 0.8125rem | 500 | `--color-text-muted` |

- 폰트 패밀리: `'Segoe UI', system-ui, -apple-system, sans-serif`
- 줄간격(line-height): 기본 `1.5`

---

## 3. 간격 (Spacing)

| 변수 | 값 | 용도 |
|------|----|------|
| `--space-xs` | `4px` | 아이콘/인라인 갭 |
| `--space-sm` | `8px` | 카드 내부 패딩 |
| `--space-md` | `16px` | 컬럼 패딩, 카드 간 갭 |
| `--space-lg` | `24px` | 보드 패딩, 컬럼 간 갭 |
| `--space-xl` | `40px` | 헤더 높이 보정 |

---

## 4. 테두리 및 그림자 (Border & Shadow)

```css
/* 카드 */
border-radius: 8px;
box-shadow: 0 1px 3px var(--color-card-shadow);

/* 컬럼 */
border-radius: 12px;

/* 드래그 오버 강조 */
outline: 2px dashed var(--color-drag-over);
outline-offset: -2px;

/* 사용자 아바타 */
border-radius: 50%;
width: 32px;
height: 32px;
```

---

## 5. 컴포넌트 스펙

### `header`

```
display: flex
justify-content: space-between
align-items: center
padding: 0 var(--space-lg)
height: 56px
background: --color-bg-header
position: sticky / top: 0 / z-index: 10
```

### `.user-bar` (헤더 우측 — 사용자 정보 영역)

```
display: flex
align-items: center
gap: var(--space-sm)
padding: var(--space-xs) var(--space-sm)
background: --color-user-bar-bg
border-radius: 20px
```

구성 요소:
- `.user-avatar` : 32×32px 원형, 이니셜 (JS가 `user.name.charAt(0).toUpperCase()` 설정)
- `.user-name` : 사용자 표시 이름
- `.user-badge` : `"Guest"` 또는 `"로그인됨"` 텍스트

### `.column`

```
display: flex / flex-direction: column / flex: 1
min-width: 280px / max-width: 360px / min-height: 400px
padding: var(--space-md)
border-radius: 12px
background: 컬럼별 색상
gap: var(--space-sm)
```

### `.card`

```
padding: var(--space-sm) var(--space-md)
border-radius: 8px
background: --color-card-bg
cursor: grab
transition: box-shadow 0.15s, opacity 0.15s, transform 0.1s
word-break: break-word
user-select: none / -webkit-user-select: none   ← 텍스트 선택 드래그 오작동 방지
```

상태별 스타일:
- `:hover` → `box-shadow: 0 3px 8px`, `transform: translateY(-1px)`
- `.dragging` → `opacity: 0.4`, `cursor: grabbing`, `transform: none`

### `.drop-indicator`

드래그 중 삽입 위치를 알려주는 가로선. JS `showDropIndicator()`가 동적으로 생성·제거.

```
height: 2px
background: #6366f1   (인디고/보라)
border-radius: 2px
pointer-events: none   ← 드래그 이벤트에 간섭하지 않도록
flex-shrink: 0
```

### `.add-btn`

```
width: 100%
padding: var(--space-sm)
border: none
border-radius: 8px
background: --color-btn-bg
cursor: pointer
font-size: 0.8125rem / font-weight: 500
text-align: left
transition: background 0.15s
```

상태별:
- `:hover` → `background: --color-btn-hover`

---

## 6. 반응형 브레이크포인트

| 브레이크포인트 | 레이아웃 변화 |
|----------------|----------|
| `> 768px` | 컬럼 가로 배치, `.user-bar` 전체 표시 |
| `≤ 768px` | 컬럼 세로 배치(`flex-direction: column`), `max-width: 100%`, `.user-name` 숨김 |
