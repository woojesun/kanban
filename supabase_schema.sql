-- ══════════════════════════════════════
-- Kanban Board - Supabase Schema
-- Supabase Dashboard > SQL Editor 에서 실행
-- ══════════════════════════════════════

create table if not exists cards (
  id         uuid primary key default gen_random_uuid(),
  text       text not null,
  column_id  text not null check (column_id in ('todo', 'in-progress', 'done')),
  user_id    uuid not null references auth.users(id) on delete cascade,
  "order"    int  not null default 0,
  created_at timestamptz default now()
);

-- 사용자 본인의 카드만 접근 가능 (Row Level Security)
alter table cards enable row level security;

create policy "본인 카드만 조회"
  on cards for select
  using (auth.uid() = user_id);

create policy "본인 카드만 추가"
  on cards for insert
  with check (auth.uid() = user_id);

create policy "본인 카드만 수정"
  on cards for update
  using (auth.uid() = user_id);

create policy "본인 카드만 삭제"
  on cards for delete
  using (auth.uid() = user_id);
