# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## 프로젝트 개요

Supabase Auth + DB를 사용하는 칸반 보드. 빌드 도구, 패키지 매니저 없음.
브라우저에서 `index.html`을 직접 열거나 로컬 서버를 통해 사용한다.

---

## 실행

```bash
# 로컬 서버 (OAuth 리다이렉트 때문에 직접 파일 열기 불가)
python3 -m http.server 8080
# → http://localhost:8080
```

---

## 파일 구조

```
index.html              ← 진입점. 인증 오버레이 + 보드. 카드 HTML 하드코딩 없음
style.css               ← 모든 스타일. CSS 변수는 :root에만 선언
script.js               ← 모든 로직. 아래 순서로 구성됨:
                            1. Supabase 클라이언트 초기화 (SUPABASE_URL, SUPABASE_ANON_KEY)
                            2. 전역 상태 (currentUser, draggedCard, lastSignedInId)
                            3. 인증 UI (showAuthOverlay, hideAuthOverlay, setAuthMessage)
                            4. 사용자 바 (renderUserBar, clearUserBar)
                            5. Supabase DB (loadCards, insertInitialCards, saveCards)
                            6. 카드/보드 (createCard, renderBoard)
                            7. 드롭 위치 계산 (getDragAfterElement, showDropIndicator, removeDropIndicator)
                            8. 드래그 이벤트 (addDragEvents, addColumnEvents, bindAddButtons)
                            9. 인증 처리 (handleSignedIn, handleSignedOut, bindAuthButtons)
                            10. 초기화 (init, DOMContentLoaded)
supabase_schema.sql     ← cards 테이블 생성 + RLS 정책 (Supabase SQL Editor에서 실행)
supabase_cleanup.sql    ← 중복 카드 정리 SQL
doc/                    ← 설계 문서 (PRD, TRD, USER_FLOW, DATA_MODEL, DESIGN_SYSTEM, TASKS, CODE_CONVENTIONS)
```

---

## Supabase 설정

`script.js` 상단 두 값 교체:
```js
const SUPABASE_URL      = 'https://YOUR_PROJECT_ID.supabase.co';
const SUPABASE_ANON_KEY = 'YOUR_ANON_KEY';
```

필요한 Supabase 설정:
1. `supabase_schema.sql` 실행 (cards 테이블 + RLS)
2. Authentication → URL Configuration → Site URL + Redirect URL 등록
3. Authentication → Providers → Google / GitHub 활성화 (Client ID/Secret 입력)

---

## 핵심 설계 원칙

### 다중 사용자 데이터 격리
- 모든 카드는 `user_id` (Supabase UUID)로 소유자 식별
- RLS 정책: `auth.uid() = user_id` → 본인 카드만 접근 가능
- 카드 추가 시 DB INSERT → UUID 반환 → DOM에 설정 (클라이언트 생성 ID 사용 안 함)

### 경쟁 조건 방지 (Race Condition Guard)
OAuth 리다이렉트 중 `onAuthStateChange`가 여러 번 발생하는 문제 처리:
```js
// handleSignedIn 내부
if (lastSignedInId === user.id) return;  // 중복 실행 차단
lastSignedInId = user.id;
const userId = user.id;                  // await 전에 로컬 고정
const cards = await loadCards(userId);
if (currentUser?.id !== userId) return;  // stale 체크
```

### 카드 저장 시점
- 카드 이동·순서변경: drop 이벤트 후 `saveCards()` (전체 UPSERT)
- 카드 추가: `bindAddButtons`에서 DB INSERT 후 반환된 UUID로 DOM 생성

---

## 참조 문서

| 문서 | 내용 |
|------|------|
| `doc/PRD.md` | 기능 요구사항 (F-01 ~ F-13) |
| `doc/TRD.md` | 기술 스택, 함수 목록, Supabase 쿼리 |
| `doc/DATA_MODEL.md` | DB 스키마, 데이터 흐름, 인증 방식 |
| `doc/DESIGN_SYSTEM.md` | CSS 변수, 컴포넌트 스펙 |
| `doc/USER_FLOW.md` | 인증 흐름, 드래그 시퀀스 다이어그램 |
| `doc/TASKS.md` | 구현 기록 및 검증 체크리스트 |
| `doc/CODE_CONVENTIONS.md` | 네이밍, 다중 사용자 규칙 |
