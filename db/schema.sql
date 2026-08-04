-- Minhas Finanças — schema para Neon (Postgres). Rodar no SQL Editor do Neon.

create table users (
  id uuid primary key default gen_random_uuid(),
  login text not null unique,
  created_at timestamptz not null default now()
);

create table months (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  month text not null,
  meta numeric not null default 0,
  created_at timestamptz not null default now(),
  unique (user_id, month)
);

create table transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  month text not null,
  type text not null check (type in ('entrada', 'fixo', 'variavel')),
  descricao text not null,
  valor numeric not null check (valor > 0),
  categoria text,
  dia_vencimento int check (dia_vencimento between 1 and 31),
  pago boolean not null default false,
  created_at timestamptz not null default now()
);

create table cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  nome text not null,
  dia_fechamento int not null check (dia_fechamento between 1 and 28),
  dia_vencimento int not null check (dia_vencimento between 1 and 28),
  limite numeric
);

create table card_purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  card_id uuid not null references cards(id) on delete cascade,
  descricao text not null,
  valor_total numeric not null check (valor_total > 0),
  parcelas int not null default 1 check (parcelas >= 1),
  data_compra date not null,
  categoria text not null,
  created_at timestamptz not null default now()
);

create table card_invoice_payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  card_id uuid not null references cards(id) on delete cascade,
  month text not null,
  pago boolean not null default true,
  unique (user_id, card_id, month)
);

create table budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  month text not null,
  categoria text not null,
  limite numeric not null check (limite >= 0),
  unique (user_id, month, categoria)
);

-- grupos de orçamento (ex.: 50% Essenciais, 30% Não essenciais, 20% Investimentos)
-- não são por mês: valem até o usuário mudar, como os cartões
create table budget_groups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  nome text not null,
  percentual numeric not null check (percentual >= 0 and percentual <= 100),
  categorias text[] not null default '{}',
  ordem int not null default 0,
  unique (user_id, nome)
);

-- gastos enviados pelo Telegram aguardando escolha de categoria (botões)
create table telegram_pending (
  id uuid primary key default gen_random_uuid(),
  chat_id bigint not null,
  tipo text not null check (tipo in ('gasto', 'entrada')),
  descricao text not null,
  valor numeric not null check (valor > 0),
  dia int not null,
  month text not null,
  created_at timestamptz not null default now()
);

create index idx_transactions_user_month on transactions (user_id, month);
create index idx_budgets_user_month on budgets (user_id, month);
create index idx_purchases_user on card_purchases (user_id);
create index idx_budget_groups_user on budget_groups (user_id);
