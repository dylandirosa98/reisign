-- Support tickets table
create table support_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  company_id uuid references companies(id),
  subject text not null,
  message text not null,
  category text default 'general',
  status text default 'open',
  created_at timestamptz default now()
);

alter table support_tickets enable row level security;

create policy "Users can view own tickets" on support_tickets
  for select using (auth.uid() = user_id);

create policy "Users can create tickets" on support_tickets
  for insert with check (auth.uid() = user_id);
