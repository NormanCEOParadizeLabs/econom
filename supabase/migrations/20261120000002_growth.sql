-- ECONOM. — moteur de croissance : parrainage à paliers, attribution, défis, Growth Studio, expériences A/B.

-- ───────────────────────────── Attribution d'acquisition
alter table public.profiles add column acquisition_source text check (char_length(acquisition_source) <= 40);
alter table public.profiles add column acquisition_campaign text check (char_length(acquisition_campaign) <= 60);
alter table public.analytics_events add column campaign text check (char_length(campaign) <= 60);
create index analytics_events_campaign_idx on public.analytics_events (campaign, name) where campaign is not null;

-- ───────────────────────────── Parrainage : anti-fraude et récompenses à paliers
alter table public.referrals add column ip_hash text;            -- empreinte HMAC de l'adresse IP d'inscription (jamais l'IP en clair)
alter table public.referrals add column rejected_reason text;
alter table public.referrals drop constraint referrals_status_check;
update public.referrals set status = 'qualified' where status = 'rewarded';
alter table public.referrals add constraint referrals_status_check check (status in ('pending', 'qualified', 'rejected'));
create index referrals_ip_idx on public.referrals (referrer_id, ip_hash);

alter table public.subscriptions add column bonus_analyses integer not null default 0 check (bonus_analyses >= 0);
alter table public.subscriptions add column advanced_report boolean not null default false;

create table public.referral_rewards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  tier integer not null check (tier > 0),                         -- nombre de filleuls qualifiés atteint
  reward_type text not null check (reward_type in ('bonus_analyses', 'plus_days', 'advanced_report')),
  amount integer not null check (amount > 0),
  granted_at timestamptz not null default now(),
  unique (user_id, tier, reward_type)                             -- une récompense par palier : jamais de doublon
);
alter table public.referral_rewards enable row level security;
create policy referral_rewards_own on public.referral_rewards for select to authenticated using (user_id = (select auth.uid()) or public.is_admin());
revoke insert, update, delete on public.referral_rewards from anon, authenticated;
grant select on public.referral_rewards to authenticated;

insert into public.admin_settings (key, value) values
  ('referral_rewards', '{"tiers": [{"qualified": 1, "type": "bonus_analyses", "amount": 3}, {"qualified": 3, "type": "plus_days", "amount": 7}, {"qualified": 5, "type": "advanced_report", "amount": 1}], "max_qualified_per_month": 15, "max_same_ip": 2, "attribution_days": 30}')
on conflict (key) do nothing;

-- Analyses bonus : utilisées une fois le quota mensuel épuisé.
create or replace function public.consume_bonus_analysis(p_user uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v integer;
begin
  update public.subscriptions set bonus_analyses = bonus_analyses - 1 where user_id = p_user and bonus_analyses > 0 returning bonus_analyses into v;
  return v is not null;
end $$;
create or replace function public.refund_bonus_analysis(p_user uuid)
returns void language sql security definer set search_path = '' as $$
  update public.subscriptions set bonus_analyses = bonus_analyses + 1 where user_id = p_user;
$$;
revoke execute on function public.consume_bonus_analysis(uuid) from public, anon, authenticated;
revoke execute on function public.refund_bonus_analysis(uuid) from public, anon, authenticated;
grant execute on function public.consume_bonus_analysis(uuid) to service_role;
grant execute on function public.refund_bonus_analysis(uuid) to service_role;

-- Attribution atomique d'une récompense (idempotente grâce à la contrainte d'unicité).
create or replace function public.grant_referral_reward(p_user uuid, p_tier integer, p_type text, p_amount integer)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  insert into public.referral_rewards (user_id, tier, reward_type, amount) values (p_user, p_tier, p_type, p_amount)
    on conflict do nothing returning id into v_id;
  if v_id is null then return false; end if;
  if p_type = 'bonus_analyses' then
    update public.subscriptions set bonus_analyses = bonus_analyses + p_amount where user_id = p_user;
  elsif p_type = 'plus_days' then
    -- Avantage temporaire : ne crée ni client ni abonnement Stripe, donc aucun prélèvement possible.
    update public.subscriptions set bonus_until = greatest(coalesce(bonus_until, now()), now()) + make_interval(days => p_amount) where user_id = p_user;
  elsif p_type = 'advanced_report' then
    update public.subscriptions set advanced_report = true where user_id = p_user;
  end if;
  return true;
end $$;
revoke execute on function public.grant_referral_reward(uuid, integer, text, integer) from public, anon, authenticated;
grant execute on function public.grant_referral_reward(uuid, integer, text, integer) to service_role;

-- ───────────────────────────── Défis ECONOM. (privés)
create table public.challenges (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  title text not null check (char_length(title) between 3 and 80),
  goal_cents integer not null check (goal_cents between 1000 and 10000000),
  invite_token text not null unique default encode(extensions.gen_random_bytes(12), 'hex'),
  created_at timestamptz not null default now()
);
create table public.challenge_members (
  challenge_id uuid not null references public.challenges (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  nickname text not null check (char_length(nickname) between 1 and 30),
  share_amounts boolean not null default true,   -- false : le membre participe sans montrer ses montants
  joined_at timestamptz not null default now(),
  primary key (challenge_id, user_id)
);
create index challenge_members_user_idx on public.challenge_members (user_id);
alter table public.challenges enable row level security;
alter table public.challenge_members enable row level security;

create or replace function public.is_challenge_member(p_challenge uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.challenge_members m where m.challenge_id = p_challenge and m.user_id = (select auth.uid()));
$$;
revoke execute on function public.is_challenge_member(uuid) from public, anon;
grant execute on function public.is_challenge_member(uuid) to authenticated, service_role;

create policy challenges_member_read on public.challenges for select to authenticated using (public.is_challenge_member(id));
create policy challenges_owner_delete on public.challenges for delete to authenticated using (owner_id = (select auth.uid()));
create policy challenge_members_read on public.challenge_members for select to authenticated using (public.is_challenge_member(challenge_id));
create policy challenge_members_update_self on public.challenge_members for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy challenge_members_leave on public.challenge_members for delete to authenticated using (user_id = (select auth.uid()));
revoke insert, update, delete on public.challenges, public.challenge_members from anon, authenticated;
grant select, delete on public.challenges to authenticated;
grant select, delete on public.challenge_members to authenticated;
grant update (nickname, share_amounts) on public.challenge_members to authenticated;

-- Synthèse d'un défi : uniquement des totaux par participant, jamais le détail des contrats ou dépenses.
create or replace function public.challenge_summary(p_challenge uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_challenge_member(p_challenge) then raise exception 'FORBIDDEN' using errcode = '42501'; end if;
  return (
    select jsonb_build_object(
      'members', coalesce(jsonb_agg(jsonb_build_object(
        'nickname', m.nickname,
        'is_me', m.user_id = (select auth.uid()),
        'is_owner', m.user_id = c.owner_id,
        'shares', m.share_amounts,
        'diagnostics', (select count(*) from public.comparison_results r where r.user_id = m.user_id and r.created_at >= c.created_at),
        'potential_cents', case when m.share_amounts then (select coalesce(sum(o.net_saving_cents), 0) from public.saving_opportunities o where o.user_id = m.user_id and o.status in ('potential', 'initiated') and o.net_saving_cents > 0) else null end,
        'confirmed_monthly_cents', case when m.share_amounts then (select coalesce(sum(s.monthly_cents), 0) from public.realized_savings s where s.user_id = m.user_id) else null end
      ) order by m.joined_at), '[]'::jsonb)
    )
    from public.challenge_members m join public.challenges c on c.id = m.challenge_id
    where m.challenge_id = p_challenge
  );
end $$;
revoke execute on function public.challenge_summary(uuid) from public, anon;
grant execute on function public.challenge_summary(uuid) to authenticated;

-- ───────────────────────────── Growth Studio (administration uniquement)
create table public.growth_accounts (
  id uuid primary key default gen_random_uuid(),
  platform text not null check (platform in ('tiktok', 'instagram', 'youtube', 'autre')),
  handle text not null check (char_length(handle) between 1 and 60),
  followers integer check (followers is null or followers >= 0),
  notes text check (char_length(notes) <= 600),
  created_at timestamptz not null default now(),
  unique (platform, handle)
);
create table public.growth_creators (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 80),
  platform text not null check (platform in ('tiktok', 'instagram', 'youtube', 'autre')),
  handle text check (char_length(handle) <= 60),
  kind text not null default 'ugc' check (kind in ('ugc', 'sans_visage', 'interne', 'micro_influence')),
  is_paid boolean not null default false,
  rate_cents integer check (rate_cents is null or rate_cents >= 0),
  status text not null default 'prospect' check (status in ('prospect', 'actif', 'en_pause', 'termine')),
  notes text check (char_length(notes) <= 1000),
  created_at timestamptz not null default now()
);
create table public.growth_hooks (
  id uuid primary key default gen_random_uuid(),
  text text not null check (char_length(text) between 3 and 200),
  template_key text,
  status text not null default 'a_tester' check (status in ('a_tester', 'teste', 'gagnant', 'abandonne')),
  notes text check (char_length(notes) <= 400),
  created_at timestamptz not null default now()
);
create table public.growth_scripts (
  id uuid primary key default gen_random_uuid(),
  template_key text not null,
  title text not null check (char_length(title) <= 160),
  content jsonb not null,                    -- script structuré généré puis relu
  needs_review boolean not null default true,
  review_notes text,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);
create table public.growth_contents (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 160),
  platform text not null check (platform in ('tiktok', 'instagram', 'youtube', 'autre')),
  url text check (url is null or url ~ '^https://'),
  creator_id uuid references public.growth_creators (id) on delete set null,
  account_id uuid references public.growth_accounts (id) on delete set null,
  script_id uuid references public.growth_scripts (id) on delete set null,
  template_key text,
  hook text check (char_length(hook) <= 200),
  format text check (char_length(format) <= 60),
  campaign text not null unique check (campaign ~ '^[a-z0-9-]{3,60}$'),   -- utm_campaign du lien d'attribution
  is_paid_partnership boolean not null default false,                    -- doit être signalé dans la publication
  cost_cents integer not null default 0 check (cost_cents >= 0),
  status text not null default 'brouillon' check (status in ('brouillon', 'publie', 'archive')),
  published_at date,
  views integer not null default 0 check (views >= 0),
  likes integer not null default 0 check (likes >= 0),
  shares integer not null default 0 check (shares >= 0),
  comments integer not null default 0 check (comments >= 0),
  created_at timestamptz not null default now()
);
create table public.experiments (
  key text primary key check (key ~ '^[a-z0-9_]{3,40}$'),
  description text not null check (char_length(description) <= 300),
  -- Les variantes ne portent que sur des libellés, emplacements ou récompenses : jamais sur un montant calculé.
  variants jsonb not null check (jsonb_typeof(variants) = 'array' and jsonb_array_length(variants) between 2 and 4),
  goal_event text not null,
  status text not null default 'draft' check (status in ('draft', 'running', 'stopped')),
  created_at timestamptz not null default now()
);
do $$ declare t text; begin
  foreach t in array array['growth_accounts', 'growth_creators', 'growth_hooks', 'growth_scripts', 'growth_contents', 'experiments'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy %I on public.%I for all to authenticated using (public.is_admin()) with check (public.is_admin())', t || '_admin', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
  end loop;
end $$;
create policy experiments_public_running on public.experiments for select to anon, authenticated using (status = 'running');
grant select on public.experiments to anon;

insert into public.experiments (key, description, variants, goal_event, status) values
  ('result_share_cta', 'Libellé du bouton de partage sur l''écran de résultat', '[{"key": "partager", "label": "Partager mon résultat"}, {"key": "montrer", "label": "Montrer à mes proches"}]', 'savings_card_generated', 'running'),
  ('result_invite_position', 'Emplacement du bouton « Faire économiser un proche »', '[{"key": "hero", "label": "Dans le bloc résultat"}, {"key": "after_offers", "label": "Après la liste des offres"}]', 'share_completed', 'draft');

-- ───────────────────────────── Indicateurs de croissance
create or replace function public.growth_metrics(p_days integer default 30)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare since timestamptz := now() - make_interval(days => greatest(1, least(p_days, 365)));
  ev jsonb; diag integer; attributed integer; qualified integer; signups integer; sharers integer;
begin
  if not (public.is_admin() or (select auth.role()) = 'service_role') then raise exception 'FORBIDDEN' using errcode = '42501'; end if;
  select coalesce(jsonb_object_agg(name, c), '{}'::jsonb) into ev from (select name, count(*) c from public.analytics_events where created_at >= since group by name) t;
  diag := coalesce((ev ->> 'diagnostic_completed')::integer, 0);
  select count(*) into attributed from public.referrals where created_at >= since;
  select count(*) into qualified from public.referrals where status = 'qualified' and qualified_at >= since;
  select count(*) into signups from public.profiles where created_at >= since;
  select count(distinct referrer_id) into sharers from public.referrals where created_at >= since;
  return jsonb_build_object(
    'days', p_days, 'events', ev,
    'diagnostics', diag,
    'cards_generated', coalesce((ev ->> 'savings_card_generated')::integer, 0),
    'share_sheet_opened', coalesce((ev ->> 'share_sheet_opened')::integer, 0),
    'share_completed', coalesce((ev ->> 'share_completed')::integer, 0),
    'link_copied', coalesce((ev ->> 'share_link_copied')::integer, 0),
    'referral_link_opened', coalesce((ev ->> 'referral_link_opened')::integer, 0),
    'signups', signups,
    'referral_signups', attributed,
    'referral_qualified', qualified,
    'referral_rejected', (select count(*) from public.referrals where status = 'rejected' and created_at >= since),
    'rewards_granted', (select count(*) from public.referral_rewards where granted_at >= since),
    'rewards_by_type', (select coalesce(jsonb_object_agg(reward_type, c), '{}'::jsonb) from (select reward_type, count(*) c from public.referral_rewards where granted_at >= since group by reward_type) t),
    'referee_activation_rate', case when attributed > 0 then round(qualified::numeric / attributed, 3) else null end,
    -- Coefficient viral estimé : nouveaux inscrits attribués au parrainage par inscrit de la période.
    'viral_coefficient', case when signups > 0 then round(attributed::numeric / signups, 3) else null end,
    'active_referrers', sharers,
    'premium_viewed', coalesce((ev ->> 'premium_viewed')::integer, 0) + coalesce((ev ->> 'premium_paywall_viewed')::integer, 0),
    'premium_converted', (select count(*) from public.subscription_events where to_status in ('active', 'trialing') and from_status not in ('active', 'trialing', 'past_due') and created_at >= since),
    'challenges_created', (select count(*) from public.challenges where created_at >= since),
    'challenge_joins', (select count(*) from public.challenge_members where joined_at >= since),
    'retention', (
      select jsonb_object_agg('d' || n, case when cohort > 0 then round(back::numeric / cohort, 3) else null end)
      from (
        select n,
          (select count(*) from public.profiles p where p.created_at <= now() - make_interval(days => n) and p.created_at >= now() - make_interval(days => n + 60)) cohort,
          (select count(*) from public.profiles p where p.created_at <= now() - make_interval(days => n) and p.created_at >= now() - make_interval(days => n + 60)
             and (exists (select 1 from public.login_history l where l.user_id = p.id and l.created_at >= p.created_at + make_interval(days => n))
               or exists (select 1 from public.analytics_events e where e.user_id = p.id and e.created_at >= p.created_at + make_interval(days => n)))) back
        from unnest(array[1, 7, 30]) n
      ) r
    ),
    'by_campaign', (
      select coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb) from (
        select c.id, c.title, c.campaign, c.platform, c.cost_cents, c.views, c.is_paid_partnership, cr.name creator,
          (select count(*) from public.analytics_events e where e.campaign = c.campaign and e.name = 'app_opened') visits,
          (select count(*) from public.analytics_events e where e.campaign = c.campaign and e.name = 'diagnostic_completed') diagnostics,
          (select count(*) from public.profiles p where p.acquisition_campaign = c.campaign) signups,
          (select count(*) from public.referrals r join public.profiles p on p.id = r.referrer_id where p.acquisition_campaign = c.campaign and r.status = 'qualified') referrals_qualified,
          (select count(*) from public.subscriptions s join public.profiles p on p.id = s.user_id where p.acquisition_campaign = c.campaign and s.status in ('active', 'trialing')) premium
        from public.growth_contents c left join public.growth_creators cr on cr.id = c.creator_id
        order by c.created_at desc limit 200
      ) t
    )
  );
end $$;
revoke execute on function public.growth_metrics(integer) from public, anon;
grant execute on function public.growth_metrics(integer) to authenticated, service_role;

create or replace function public.experiment_results(p_key text)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare goal text;
begin
  if not (public.is_admin() or (select auth.role()) = 'service_role') then raise exception 'FORBIDDEN' using errcode = '42501'; end if;
  select goal_event into goal from public.experiments where key = p_key;
  return (
    select coalesce(jsonb_object_agg(variant, jsonb_build_object('exposed', exposed, 'converted', converted)), '{}'::jsonb)
    from (
      select props ->> ('exp_' || p_key) variant,
        count(*) filter (where name = 'experiment_exposed') exposed,
        count(*) filter (where name = goal) converted
      from public.analytics_events where props ? ('exp_' || p_key) group by 1
    ) t
  );
end $$;
revoke execute on function public.experiment_results(text) from public, anon;
grant execute on function public.experiment_results(text) to authenticated, service_role;

alter table public.notifications drop constraint notifications_kind_check;
alter table public.notifications add constraint notifications_kind_check check (kind in ('charge_reminder', 'renewal', 'promo_end', 'better_offer', 'deal_expiring', 'monthly_summary', 'billing', 'referral', 'challenge', 'system'));
grant all on all tables in schema public to service_role;
