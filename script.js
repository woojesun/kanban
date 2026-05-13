'use strict';

// ══════════════════════════════════════
// Supabase 설정
// ══════════════════════════════════════
const SUPABASE_URL      = 'https://gxhhigbdgnrfoutoxswt.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd4aGhpZ2JkZ25yZm91dG94c3d0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2MDY2MTcsImV4cCI6MjA5NDE4MjYxN30.WZ2eztjS1J1aZX5gGJho8bY0PLdR2xqG0yKJ7KWjgWs';
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ── 전역 상태 ──
let currentUser    = null;
let draggedCard    = null;
let lastSignedInId = null;

// ══════════════════════════════════════
// 인증 UI — 오버레이 / 뷰 전환
// ══════════════════════════════════════

function showAuthOverlay() {
  showLoginView();
  document.getElementById('auth-overlay').classList.remove('hidden');
}

function hideAuthOverlay() {
  document.getElementById('auth-overlay').classList.add('hidden');
}

function showLoginView() {
  document.getElementById('view-login').classList.remove('hidden');
  document.getElementById('view-signup').classList.add('hidden');
  clearAuthMessage();
}

function showSignupView() {
  document.getElementById('view-login').classList.add('hidden');
  document.getElementById('view-signup').classList.remove('hidden');
  clearAuthMessage();
}

function setAuthMessage(msg, isError = false) {
  const el = document.getElementById('auth-message');
  el.textContent = msg;
  el.className   = 'auth-message ' + (isError ? 'is-error' : 'is-success');
}

function clearAuthMessage() {
  const el = document.getElementById('auth-message');
  el.textContent = '';
  el.className   = 'auth-message';
}

// ══════════════════════════════════════
// 사용자 바
// ══════════════════════════════════════

function renderUserBar(user) {
  document.querySelector('.user-avatar').textContent = user.name.charAt(0).toUpperCase();
  document.querySelector('.user-name').textContent   = user.name;
  document.querySelector('.user-badge').textContent  = '로그인됨';
  document.querySelector('.user-bar').classList.remove('hidden');
  document.getElementById('signout-btn').classList.remove('hidden');
}

function clearUserBar() {
  document.querySelector('.user-bar').classList.add('hidden');
  document.getElementById('signout-btn').classList.add('hidden');
}

// ══════════════════════════════════════
// 비밀번호 유효성 검사
// 9~20자, 영문자 + 숫자 + 특수문자 필수
// ══════════════════════════════════════

function validatePassword(pw) {
  if (pw.length < 9 || pw.length > 20) return '비밀번호는 9~20자여야 합니다.';
  if (!/[A-Za-z]/.test(pw))            return '영문자를 포함해야 합니다.';
  if (!/[0-9]/.test(pw))               return '숫자를 포함해야 합니다.';
  if (!/[^A-Za-z0-9]/.test(pw))        return '특수문자를 포함해야 합니다.';
  return null;
}

// ══════════════════════════════════════
// Supabase DB — 카드 불러오기 / 저장
// ══════════════════════════════════════

async function loadCards(userId) {
  const { data, error } = await sb
    .from('cards')
    .select('*')
    .eq('user_id', userId)
    .order('order');

  if (error) {
    console.error('카드 불러오기 실패:', error.message);
    return [];
  }

  if (!data || data.length === 0) {
    return await insertInitialCards(userId);
  }

  return data;
}

async function insertInitialCards(userId) {
  const initial = [
    { text: '요구사항 분석', column_id: 'todo',        user_id: userId, order: 0 },
    { text: 'API 설계',      column_id: 'todo',        user_id: userId, order: 1 },
    { text: '테스트 작성',   column_id: 'todo',        user_id: userId, order: 2 },
    { text: 'UI 디자인',     column_id: 'in-progress', user_id: userId, order: 0 },
    { text: '백엔드 개발',   column_id: 'in-progress', user_id: userId, order: 1 },
    { text: '프로젝트 세팅', column_id: 'done',        user_id: userId, order: 0 },
    { text: 'DB 스키마 설계',column_id: 'done',        user_id: userId, order: 1 },
  ];

  const { data, error } = await sb.from('cards').insert(initial).select();
  if (error) {
    console.error('초기 카드 삽입 실패:', error.message);
    return [];
  }
  return data;
}

async function saveCards() {
  if (!currentUser) return;

  const cards = [];
  document.querySelectorAll('.column').forEach(col => {
    col.querySelectorAll('.card').forEach((card, idx) => {
      cards.push({
        id:        card.dataset.cardId,
        text:      card.textContent,
        column_id: col.id,
        user_id:   currentUser.id,
        order:     idx,
      });
    });
  });

  if (!cards.length) return;

  const { error } = await sb
    .from('cards')
    .upsert(cards, { onConflict: 'id' });

  if (error) console.error('카드 저장 실패:', error.message);
}

// ══════════════════════════════════════
// 카드 생성 / 보드 렌더링
// ══════════════════════════════════════

function createCard(text, cardId, userId) {
  const card = document.createElement('div');
  card.className      = 'card';
  card.draggable      = true;
  card.dataset.cardId = cardId;
  card.dataset.userId = userId;
  card.textContent    = text;
  return card;
}

function renderBoard(cards) {
  document.querySelectorAll('.card-list').forEach(cl => { cl.innerHTML = ''; });

  [...cards]
    .sort((a, b) => a.order - b.order)
    .forEach(cardData => {
      const column = document.getElementById(cardData.column_id);
      if (!column) return;
      const card = createCard(cardData.text, cardData.id, cardData.user_id);
      addDragEvents(card);
      column.querySelector('.card-list').appendChild(card);
    });
}

// ══════════════════════════════════════
// 드롭 위치 계산 / 인디케이터
// ══════════════════════════════════════

function getDragAfterElement(cardList, y) {
  const cards = [...cardList.querySelectorAll('.card:not(.dragging)')];
  return cards.reduce((closest, card) => {
    const box    = card.getBoundingClientRect();
    const offset = y - box.top - box.height / 2;
    if (offset < 0 && offset > closest.offset) {
      return { offset, element: card };
    }
    return closest;
  }, { offset: Number.NEGATIVE_INFINITY }).element;
}

function showDropIndicator(cardList, afterElement) {
  removeDropIndicator();
  const line = document.createElement('div');
  line.className = 'drop-indicator';
  if (afterElement) cardList.insertBefore(line, afterElement);
  else              cardList.appendChild(line);
}

function removeDropIndicator() {
  document.querySelectorAll('.drop-indicator').forEach(el => el.remove());
}

// ══════════════════════════════════════
// 드래그 이벤트
// ══════════════════════════════════════

function addDragEvents(card) {
  card.addEventListener('dragstart', e => {
    if (e.target !== card) { e.preventDefault(); return; }
    draggedCard = card;
    requestAnimationFrame(() => card.classList.add('dragging'));
  });

  card.addEventListener('dragend', () => {
    card.classList.remove('dragging');
    draggedCard = null;
    removeDropIndicator();
  });
}

function addColumnEvents(column) {
  const cardList = column.querySelector('.card-list');

  column.addEventListener('dragover', e => {
    e.preventDefault();
    if (!draggedCard) return;
    showDropIndicator(cardList, getDragAfterElement(cardList, e.clientY));
  });

  column.addEventListener('dragenter', e => {
    e.preventDefault();
    if (!draggedCard) return;
    column.classList.add('drag-over');
  });

  column.addEventListener('dragleave', e => {
    if (!column.contains(e.relatedTarget)) {
      column.classList.remove('drag-over');
      removeDropIndicator();
    }
  });

  column.addEventListener('drop', async e => {
    column.classList.remove('drag-over');
    removeDropIndicator();
    if (!draggedCard || !currentUser) return;

    const afterElement = getDragAfterElement(cardList, e.clientY);
    if (afterElement) cardList.insertBefore(draggedCard, afterElement);
    else              cardList.appendChild(draggedCard);

    await saveCards();
  });
}

function bindAddButtons() {
  document.querySelectorAll('.add-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!currentUser) return;

      const column   = btn.closest('.column');
      const cardList = column.querySelector('.card-list');
      const text     = prompt('카드 내용을 입력하세요');
      if (!text || !text.trim()) return;

      const order = cardList.querySelectorAll('.card').length;

      const { data, error } = await sb
        .from('cards')
        .insert({
          text:      text.trim(),
          column_id: column.id,
          user_id:   currentUser.id,
          order,
        })
        .select()
        .single();

      if (error) {
        alert('카드 추가에 실패했습니다: ' + error.message);
        return;
      }

      const card = createCard(data.text, data.id, data.user_id);
      addDragEvents(card);
      cardList.appendChild(card);
    });
  });
}

// ══════════════════════════════════════
// 인증 상태 처리
// ══════════════════════════════════════

async function handleSignedIn(user) {
  if (lastSignedInId === user.id) return;
  lastSignedInId = user.id;

  const userId = user.id;

  currentUser = {
    id:    userId,
    name:  user.user_metadata?.full_name
        || user.user_metadata?.user_name
        || user.user_metadata?.name
        || user.email?.split('@')[0]
        || '사용자',
    email: user.email,
  };

  renderUserBar(currentUser);

  const cards = await loadCards(userId);

  if (currentUser?.id !== userId) return;

  renderBoard(cards);
  hideAuthOverlay();
}

function handleSignedOut() {
  currentUser    = null;
  lastSignedInId = null;
  clearUserBar();
  document.querySelectorAll('.card-list').forEach(cl => { cl.innerHTML = ''; });
  showAuthOverlay();
}

// ══════════════════════════════════════
// 인증 버튼 바인딩
// ══════════════════════════════════════

function bindAuthButtons() {
  const redirectTo = window.location.href.replace(/[?#].*$/, '');

  // ── OAuth ──
  document.getElementById('btn-google').addEventListener('click', () => {
    clearAuthMessage();
    sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo } });
  });

  document.getElementById('btn-github').addEventListener('click', () => {
    clearAuthMessage();
    sb.auth.signInWithOAuth({ provider: 'github', options: { redirectTo } });
  });

  // ── 로그인 폼 ──
  document.getElementById('email-form').addEventListener('submit', async e => {
    e.preventDefault();
    clearAuthMessage();
    const email    = document.getElementById('email-input').value.trim();
    const password = document.getElementById('password-input').value;
    if (!email || !password) {
      setAuthMessage('이메일과 비밀번호를 입력해주세요.', true);
      return;
    }
    const { error } = await sb.auth.signInWithPassword({ email, password });
    if (error) setAuthMessage(error.message, true);
  });

  // ── 회원가입 뷰 전환 ──
  document.getElementById('goto-signup-btn').addEventListener('click', () => {
    showSignupView();
  });

  document.getElementById('back-btn').addEventListener('click', () => {
    showLoginView();
  });

  // ── 회원가입 폼 ──
  document.getElementById('signup-form').addEventListener('submit', async e => {
    e.preventDefault();
    clearAuthMessage();

    const name     = document.getElementById('signup-name').value.trim();
    const email    = document.getElementById('signup-email').value.trim();
    const password = document.getElementById('signup-password').value;
    const confirm  = document.getElementById('signup-confirm').value;

    if (!name) {
      setAuthMessage('사용자 이름을 입력해주세요.', true);
      return;
    }
    if (!email) {
      setAuthMessage('이메일을 입력해주세요.', true);
      return;
    }

    const pwError = validatePassword(password);
    if (pwError) {
      setAuthMessage(pwError, true);
      return;
    }

    if (password !== confirm) {
      setAuthMessage('비밀번호가 일치하지 않습니다.', true);
      return;
    }

    const { data, error } = await sb.auth.signUp({
      email,
      password,
      options: { data: { full_name: name } },
    });

    if (error) {
      setAuthMessage(error.message, true);
      return;
    }

    if (data.session) {
      // 이메일 확인 불필요 설정 → 즉시 로그인 (onAuthStateChange가 처리)
      setAuthMessage('회원가입이 완료되었습니다!');
    } else {
      // 이메일 확인 필요 설정
      setAuthMessage('확인 이메일을 발송했습니다. 이메일 확인 후 로그인해주세요.');
      setTimeout(() => {
        showLoginView();
        // 로그인 폼에 이메일 자동 입력
        document.getElementById('email-input').value = email;
      }, 2500);
    }
  });

  // ── 로그아웃 ──
  document.getElementById('signout-btn').addEventListener('click', () => {
    sb.auth.signOut();
  });
}

// ══════════════════════════════════════
// 초기화
// ══════════════════════════════════════

function init() {
  // onAuthStateChange 등록 — INITIAL_SESSION 이벤트로 현재 세션을 즉시 확인.
  // 오버레이가 hidden으로 시작하므로, 세션이 없을 때만 handleSignedOut이 오버레이를 표시.
  // 이 방식으로 새로고침 시 로그인 팝업 깜박임을 방지.
  sb.auth.onAuthStateChange((_event, session) => {
    if (session?.user) handleSignedIn(session.user);
    else               handleSignedOut();
  });

  document.querySelectorAll('.column').forEach(addColumnEvents);
  bindAddButtons();
  bindAuthButtons();
}

document.addEventListener('DOMContentLoaded', init);
