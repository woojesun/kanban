'use strict';

// ══════════════════════════════════════
// Supabase 설정
// Settings > API 에서 복사해 교체하세요
// ══════════════════════════════════════
const SUPABASE_URL      = 'https://gxhhigbdgnrfoutoxswt.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd4aGhpZ2JkZ25yZm91dG94c3d0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2MDY2MTcsImV4cCI6MjA5NDE4MjYxN30.WZ2eztjS1J1aZX5gGJho8bY0PLdR2xqG0yKJ7KWjgWs';
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ── 전역 상태 ──
let currentUser    = null;
let draggedCard    = null;
let lastSignedInId = null;   // 중복 실행 방지용

// ══════════════════════════════════════
// 인증 UI
// ══════════════════════════════════════

function showAuthOverlay() {
  document.getElementById('auth-overlay').classList.remove('hidden');
}

function hideAuthOverlay() {
  document.getElementById('auth-overlay').classList.add('hidden');
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

  // 처음 로그인한 사용자 → 초기 카드 삽입
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

// 현재 DOM 상태를 읽어 전체 카드를 upsert (이동·순서변경 후 호출)
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

// cardId: Supabase가 생성한 UUID
function createCard(text, cardId, userId) {
  const card = document.createElement('div');
  card.className      = 'card';
  card.draggable      = true;
  card.dataset.cardId = cardId;
  card.dataset.userId = userId;
  card.textContent    = text;
  return card;
}

// cards: Supabase에서 받은 flat 배열 [{ id, text, column_id, user_id, order }, ...]
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

      // DB에 먼저 삽입 → UUID 반환받아 DOM에 사용
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
  // 동일 사용자로 이미 초기화됐으면 재실행 방지
  if (lastSignedInId === user.id) return;
  lastSignedInId = user.id;

  // async 작업 전에 userId를 로컬에 고정
  // (await 중 currentUser가 교체돼도 이 userId는 바뀌지 않음)
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

  // await 완료 후 다른 사용자로 교체됐으면 렌더링 중단
  if (currentUser?.id !== userId) return;

  renderBoard(cards);
  hideAuthOverlay();
}

function handleSignedOut() {
  currentUser    = null;
  lastSignedInId = null;   // 로그아웃 시 초기화 → 재로그인 허용
  clearUserBar();
  document.querySelectorAll('.card-list').forEach(cl => { cl.innerHTML = ''; });
  showAuthOverlay();
}

// ══════════════════════════════════════
// 인증 버튼 바인딩
// ══════════════════════════════════════

function bindAuthButtons() {
  const redirectTo = window.location.href.replace(/[?#].*$/, '');

  document.getElementById('btn-google').addEventListener('click', () => {
    clearAuthMessage();
    sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo } });
  });

  document.getElementById('btn-github').addEventListener('click', () => {
    clearAuthMessage();
    sb.auth.signInWithOAuth({ provider: 'github', options: { redirectTo } });
  });

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

  document.getElementById('signup-btn').addEventListener('click', async () => {
    clearAuthMessage();
    const email    = document.getElementById('email-input').value.trim();
    const password = document.getElementById('password-input').value;
    if (!email || !password) {
      setAuthMessage('이메일과 비밀번호를 입력해주세요.', true);
      return;
    }
    const { error } = await sb.auth.signUp({ email, password });
    if (error) setAuthMessage(error.message, true);
    else       setAuthMessage('확인 이메일을 발송했습니다. 받은편지함을 확인해주세요.');
  });

  document.getElementById('signout-btn').addEventListener('click', () => {
    sb.auth.signOut();
  });
}

// ══════════════════════════════════════
// 초기화
// ══════════════════════════════════════

function init() {
  sb.auth.onAuthStateChange((_event, session) => {
    if (session?.user) handleSignedIn(session.user);
    else               handleSignedOut();
  });

  document.querySelectorAll('.column').forEach(addColumnEvents);
  bindAddButtons();
  bindAuthButtons();
}

document.addEventListener('DOMContentLoaded', init);
