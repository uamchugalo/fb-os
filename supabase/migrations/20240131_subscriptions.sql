-- Tabela de assinaturas
create table subscriptions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) not null,
  status text not null check (status in ('trial', 'active', 'cancelled', 'expired')),
  trial_ends_at timestamp with time zone,
  current_period_ends_at timestamp with time zone,
  mp_subscription_id text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Políticas RLS
alter table subscriptions enable row level security;

create policy "Users can view their own subscription"
  on subscriptions for select
  using (auth.uid() = user_id);

create policy "Users can update their own subscription"
  on subscriptions for update
  using (auth.uid() = user_id);

-- Função para criar assinatura trial
create or replace function create_trial_subscription()
returns void
language plpgsql
security definer
as $$
begin
  insert into subscriptions (
    user_id,
    status,
    trial_ends_at,
    current_period_ends_at
  ) values (
    auth.uid(),
    'trial',
    now() + interval '7 days',
    now() + interval '7 days'
  );
end;
$$;
