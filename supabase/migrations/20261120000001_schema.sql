-- ECONOM. — schéma initial
-- Montants en centimes (integer). Toutes les tables exposées ont RLS activée.
-- Catégories de données :
--   PUBLIQUES       : providers, offers (vérifiées), offer_sources, merchant_locations, local_deals (vérifiés)
--   PRIVÉES         : profiles, user_preferences, user_contracts, uploaded_documents, document_analyses,
--                     comparison_results, saving_opportunities, realized_savings, favorites, notifications,
--                     referrals, login_history, subscriptions (lecture seule pour l'utilisateur)
--   ADMINISTRATIVES : admins, admin_settings, audit_logs, offer_price_history
--   TECHNIQUES      : stripe_events, subscription_events, usage_quotas, ai_usage_logs, analytics_events, rate_limits

create extension if not exists pgcrypto;

-- ───────────────────────────── Types
create type public.offer_category as enum ('mobile', 'internet', 'electricity', 'gas');
create type public.offer_status as enum ('draft', 'verified', 'archived');
create type public.deal_status as enum ('submitted', 'verified', 'rejected', 'archived');
create type public.saving_status as enum ('potential', 'initiated', 'confirmed', 'observed', 'dismissed');
create type public.billing_status as enum ('free', 'trialing', 'active', 'past_due', 'unpaid', 'canceled', 'incomplete', 'incomplete_expired', 'paused');

-- ───────────────────────────── Administrateurs (jamais modifiable par un client)
create table public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  note text
);
alter table public.admins enable row level security;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.admins a where a.user_id = (select auth.uid()));
$$;

create policy admins_self_read on public.admins for select to authenticated
  using (user_id = (select auth.uid()));

-- ───────────────────────────── Profils
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text check (char_length(display_name) <= 60),
  city text check (char_length(city) <= 80),
  postal_code text check (postal_code is null or postal_code ~ '^[0-9]{5}$'),
  referral_code text not null unique,
  onboarding_done boolean not null default false,
  ai_consent_at timestamptz,
  marketing_consent boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
create policy profiles_select_own on public.profiles for select to authenticated using (id = (select auth.uid()) or public.is_admin());
create policy profiles_update_own on public.profiles for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));
revoke insert, update, delete on public.profiles from anon, authenticated;
grant update (display_name, city, postal_code, onboarding_done, ai_consent_at, marketing_consent) on public.profiles to authenticated;

create table public.user_preferences (
  user_id uuid primary key references auth.users (id) on delete cascade,
  notif_email boolean not null default true,
  notif_push boolean not null default false,
  notif_deals boolean not null default false,
  notif_monthly_summary boolean not null default true,
  analytics_consent boolean not null default false,
  theme text not null default 'volt' check (theme in ('volt', 'mint', 'signal')),
  color_scheme text not null default 'system' check (color_scheme in ('system', 'light', 'dark')),
  updated_at timestamptz not null default now()
);
alter table public.user_preferences enable row level security;
create policy prefs_own on public.user_preferences for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
revoke delete on public.user_preferences from anon, authenticated;

create table public.login_history (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  device text check (char_length(device) <= 40)
);
create index login_history_user_idx on public.login_history (user_id, created_at desc);
alter table public.login_history enable row level security;
create policy login_history_own on public.login_history for select to authenticated using (user_id = (select auth.uid()));
revoke insert, update, delete on public.login_history from anon, authenticated;

-- ───────────────────────────── Facturation ECONOM. Plus (écriture : serveur uniquement)
create table public.subscriptions (
  user_id uuid primary key references auth.users (id) on delete cascade,
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  status public.billing_status not null default 'free',
  price_id text,
  billing_interval text check (billing_interval in ('month', 'year')),
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  bonus_until timestamptz,                -- avantage Plus temporaire (parrainage)
  last_stripe_event_at timestamptz,       -- garde-fou événements désordonnés
  updated_at timestamptz not null default now()
);
alter table public.subscriptions enable row level security;
create policy subscriptions_select_own on public.subscriptions for select to authenticated using (user_id = (select auth.uid()) or public.is_admin());
revoke insert, update, delete on public.subscriptions from anon, authenticated;

-- Droits Premium : source de vérité unique, évaluée côté base.
create or replace function public.has_plus(uid uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.subscriptions s
    where s.user_id = uid and (
      (s.status in ('active', 'trialing', 'past_due') and (s.current_period_end is null or s.current_period_end > now() - interval '3 days'))
      or (s.bonus_until is not null and s.bonus_until > now())
    )
  );
$$;
revoke execute on function public.has_plus(uuid) from public, anon;
grant execute on function public.has_plus(uuid) to authenticated, service_role;

create or replace function public.my_plan()
returns text language sql stable security definer set search_path = '' as $$
  select case when public.has_plus((select auth.uid())) then 'plus' else 'free' end;
$$;
revoke execute on function public.my_plan() from public, anon;
grant execute on function public.my_plan() to authenticated;

create table public.stripe_events (
  id text primary key,                    -- evt_…  → idempotence
  type text not null,
  stripe_created timestamptz not null,
  status text not null default 'processing' check (status in ('processing', 'processed', 'failed', 'ignored')),
  error text,
  received_at timestamptz not null default now(),
  processed_at timestamptz
);
alter table public.stripe_events enable row level security;
create policy stripe_events_admin on public.stripe_events for select to authenticated using (public.is_admin());
revoke insert, update, delete on public.stripe_events from anon, authenticated;

create table public.subscription_events (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users (id) on delete set null,
  stripe_event_id text references public.stripe_events (id) on delete set null,
  type text not null,
  from_status public.billing_status,
  to_status public.billing_status,
  amount_cents integer,
  created_at timestamptz not null default now()
);
create index subscription_events_user_idx on public.subscription_events (user_id, created_at desc);
alter table public.subscription_events enable row level security;
create policy subscription_events_read on public.subscription_events for select to authenticated using (user_id = (select auth.uid()) or public.is_admin());
revoke insert, update, delete on public.subscription_events from anon, authenticated;

-- ───────────────────────────── Quotas et limitation de débit
create table public.usage_quotas (
  user_id uuid not null references auth.users (id) on delete cascade,
  period date not null,                   -- 1er jour du mois (UTC)
  kind text not null check (kind in ('ai_analysis', 'ai_chat')),
  used integer not null default 0 check (used >= 0),
  primary key (user_id, period, kind)
);
alter table public.usage_quotas enable row level security;
create policy usage_quotas_own on public.usage_quotas for select to authenticated using (user_id = (select auth.uid()));
revoke insert, update, delete on public.usage_quotas from anon, authenticated;

-- Consommation atomique : renvoie true si une unité a pu être réservée.
create or replace function public.consume_quota(p_user uuid, p_kind text, p_limit integer)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_period date := date_trunc('month', now() at time zone 'utc')::date; v_used integer;
begin
  insert into public.usage_quotas (user_id, period, kind, used) values (p_user, v_period, p_kind, 0)
    on conflict do nothing;
  update public.usage_quotas set used = used + 1
    where user_id = p_user and period = v_period and kind = p_kind and used < p_limit
    returning used into v_used;
  return v_used is not null;
end $$;
create or replace function public.refund_quota(p_user uuid, p_kind text)
returns void language sql security definer set search_path = '' as $$
  update public.usage_quotas set used = greatest(used - 1, 0)
  where user_id = p_user and kind = p_kind and period = date_trunc('month', now() at time zone 'utc')::date;
$$;
revoke execute on function public.consume_quota(uuid, text, integer) from public, anon, authenticated;
revoke execute on function public.refund_quota(uuid, text) from public, anon, authenticated;
grant execute on function public.consume_quota(uuid, text, integer) to service_role;
grant execute on function public.refund_quota(uuid, text) to service_role;

create table public.rate_limits (
  key text not null,
  window_start timestamptz not null,
  count integer not null default 0,
  primary key (key, window_start)
);
alter table public.rate_limits enable row level security;
revoke all on public.rate_limits from anon, authenticated;

create or replace function public.hit_rate_limit(p_key text, p_max integer, p_window_seconds integer)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_start timestamptz := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds); v_count integer;
begin
  insert into public.rate_limits (key, window_start, count) values (p_key, v_start, 1)
    on conflict (key, window_start) do update set count = public.rate_limits.count + 1
    returning count into v_count;
  return v_count <= p_max;
end $$;
revoke execute on function public.hit_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.hit_rate_limit(text, integer, integer) to service_role;

-- ───────────────────────────── Catalogue : fournisseurs et offres
create table public.providers (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]{2,40}$'),
  name text not null check (char_length(name) between 1 and 60),
  website text check (website is null or website ~ '^https://'),
  created_at timestamptz not null default now()
);
alter table public.providers enable row level security;
create policy providers_public_read on public.providers for select to anon, authenticated using (true);
create policy providers_admin_write on public.providers for all to authenticated using (public.is_admin()) with check (public.is_admin());

create table public.offers (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.providers (id) on delete restrict,
  category public.offer_category not null,
  name text not null check (char_length(name) between 1 and 120),
  -- Prix
  monthly_cents integer not null check (monthly_cents >= 0),
  intro_months integer not null default 0 check (intro_months between 0 and 48),
  after_cents integer not null check (after_cents >= 0),       -- prix après la période promotionnelle
  commitment_months integer not null default 0 check (commitment_months between 0 and 48),
  activation_fee_cents integer not null default 0 check (activation_fee_cents >= 0),
  sim_fee_cents integer not null default 0 check (sim_fee_cents >= 0),
  termination_fee_cents integer not null default 0 check (termination_fee_cents >= 0),
  -- Mobile
  data_gb numeric(8, 2) check (data_gb is null or data_gb >= 0),
  roaming_gb numeric(8, 2) check (roaming_gb is null or roaming_gb >= 0),
  five_g boolean not null default false,
  host_network text check (host_network is null or host_network in ('Orange', 'SFR', 'Bouygues Telecom', 'Free')),
  -- Internet
  technology text check (technology is null or technology in ('fibre', 'adsl', 'box-4g-5g', 'cable')),
  download_mbps integer check (download_mbps is null or download_mbps > 0),
  upload_mbps integer check (upload_mbps is null or upload_mbps > 0),
  has_tv boolean not null default false,
  has_phone boolean not null default false,
  -- Énergie et autres paramètres spécifiques (puissance kVA, option tarifaire, prix kWh…)
  attrs jsonb not null default '{}'::jsonb,
  -- Conditions et transparence
  conditions text check (char_length(conditions) <= 1200),
  promo_conditions text check (char_length(promo_conditions) <= 600),
  url text not null check (url ~ '^https://'),
  is_partner boolean not null default false,   -- relation commerciale : toujours affichée
  is_demo boolean not null default false,      -- données de démonstration : jamais publiques
  status public.offer_status not null default 'draft',
  verified_at date,
  valid_until date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint offers_verified_has_dates check (status <> 'verified' or (verified_at is not null and valid_until is not null)),
  constraint offers_intro_consistent check (intro_months > 0 or after_cents = monthly_cents)
);
create index offers_public_idx on public.offers (category, status, valid_until);
create index offers_provider_idx on public.offers (provider_id);
alter table public.offers enable row level security;
create policy offers_public_read on public.offers for select to anon, authenticated
  using (status = 'verified' and not is_demo and valid_until >= current_date);
create policy offers_admin_all on public.offers for all to authenticated using (public.is_admin()) with check (public.is_admin());

create table public.offer_sources (
  id uuid primary key default gen_random_uuid(),
  offer_id uuid not null references public.offers (id) on delete cascade,
  url text not null check (url ~ '^https://'),
  label text check (char_length(label) <= 120),
  evidence text check (char_length(evidence) <= 400),
  checked_at date not null default current_date,
  created_at timestamptz not null default now()
);
create index offer_sources_offer_idx on public.offer_sources (offer_id);
alter table public.offer_sources enable row level security;
create policy offer_sources_public_read on public.offer_sources for select to anon, authenticated
  using (exists (select 1 from public.offers o where o.id = offer_id));  -- hérite de la visibilité de l'offre
create policy offer_sources_admin_all on public.offer_sources for all to authenticated using (public.is_admin()) with check (public.is_admin());

create table public.offer_price_history (
  id bigint generated always as identity primary key,
  offer_id uuid not null references public.offers (id) on delete cascade,
  monthly_cents integer not null,
  intro_months integer not null,
  after_cents integer not null,
  status public.offer_status not null,
  valid_until date,
  changed_by uuid,
  changed_at timestamptz not null default now()
);
create index offer_price_history_offer_idx on public.offer_price_history (offer_id, changed_at desc);
alter table public.offer_price_history enable row level security;
create policy offer_price_history_admin on public.offer_price_history for select to authenticated using (public.is_admin());
revoke insert, update, delete on public.offer_price_history from anon, authenticated;

create or replace function public.tg_offers_history()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  new.updated_at := now();
  if tg_op = 'INSERT' or (old.monthly_cents, old.intro_months, old.after_cents, old.status, old.valid_until)
     is distinct from (new.monthly_cents, new.intro_months, new.after_cents, new.status, new.valid_until) then
    insert into public.offer_price_history (offer_id, monthly_cents, intro_months, after_cents, status, valid_until, changed_by)
    values (new.id, new.monthly_cents, new.intro_months, new.after_cents, new.status, new.valid_until, (select auth.uid()));
  end if;
  return new;
end $$;
create trigger offers_touch before update on public.offers for each row execute function public.tg_offers_history();
create or replace function public.tg_offers_history_insert()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.offer_price_history (offer_id, monthly_cents, intro_months, after_cents, status, valid_until, changed_by)
  values (new.id, new.monthly_cents, new.intro_months, new.after_cents, new.status, new.valid_until, (select auth.uid()));
  return new;
end $$;
create trigger offers_history_insert after insert on public.offers for each row execute function public.tg_offers_history_insert();

-- ───────────────────────────── Contrats et abonnements personnels de l'utilisateur
create table public.user_contracts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  category text not null check (category in ('telephone', 'internet', 'streaming', 'musique', 'sport', 'logiciels', 'services', 'energie', 'assurance', 'autre')),
  price_cents integer not null check (price_cents between 0 and 10000000),
  frequency text not null default 'monthly' check (frequency in ('weekly', 'monthly', 'quarterly', 'yearly')),
  next_charge_date date,
  commitment_end date,
  renewal_date date,
  cancellation_terms text check (char_length(cancellation_terms) <= 600),
  manage_url text check (manage_url is null or manage_url ~ '^https://'),
  notes text check (char_length(notes) <= 1000),
  reminder_days integer check (reminder_days is null or reminder_days between 0 and 60),
  to_review boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index user_contracts_user_idx on public.user_contracts (user_id, active);
create index user_contracts_reminder_idx on public.user_contracts (next_charge_date) where active and reminder_days is not null;
alter table public.user_contracts enable row level security;
create policy user_contracts_own on public.user_contracts for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Limite de la formule gratuite appliquée en base (l'interface n'est pas le seul verrou).
create or replace function public.tg_contract_limit()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_count integer; v_limit integer;
begin
  if public.has_plus(new.user_id) then return new; end if;
  select coalesce((value ->> 'free_contracts')::integer, 1) into v_limit from public.admin_settings where key = 'plan_limits';
  v_limit := coalesce(v_limit, 1);
  select count(*) into v_count from public.user_contracts where user_id = new.user_id and active;
  if v_count >= v_limit then
    raise exception 'PLAN_LIMIT_CONTRACTS' using errcode = 'P0001', hint = 'ECONOM. Plus requis pour suivre davantage d''abonnements.';
  end if;
  return new;
end $$;

-- ───────────────────────────── Documents et analyses IA
create table public.uploaded_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  mime text not null check (mime in ('image/jpeg', 'image/png', 'image/webp', 'application/pdf')),
  size_bytes integer not null check (size_bytes > 0),
  -- Le fichier n'est PAS conservé : traité en mémoire puis écarté. Seules ces métadonnées subsistent.
  retention text not null default 'not_stored' check (retention in ('not_stored')),
  created_at timestamptz not null default now()
);
create index uploaded_documents_user_idx on public.uploaded_documents (user_id, created_at desc);
alter table public.uploaded_documents enable row level security;
create policy uploaded_documents_own on public.uploaded_documents for select to authenticated using (user_id = (select auth.uid()));
create policy uploaded_documents_delete_own on public.uploaded_documents for delete to authenticated using (user_id = (select auth.uid()));
revoke insert, update on public.uploaded_documents from anon, authenticated;

create table public.document_analyses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  document_id uuid references public.uploaded_documents (id) on delete set null,
  doc_type text not null,
  extraction jsonb not null,              -- sortie du modèle validée par schéma (sans IBAN ni identité)
  confidence text not null check (confidence in ('faible', 'moyenne', 'elevee')),
  validated_data jsonb,                   -- champs corrigés et confirmés par l'utilisateur
  validated_at timestamptz,
  created_at timestamptz not null default now()
);
create index document_analyses_user_idx on public.document_analyses (user_id, created_at desc);
alter table public.document_analyses enable row level security;
create policy document_analyses_select_own on public.document_analyses for select to authenticated using (user_id = (select auth.uid()));
create policy document_analyses_delete_own on public.document_analyses for delete to authenticated using (user_id = (select auth.uid()));
revoke insert, update on public.document_analyses from anon, authenticated;

create table public.ai_usage_logs (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users (id) on delete set null,
  kind text not null check (kind in ('analysis', 'chat')),
  model text not null,
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  cost_micro_usd bigint not null default 0,
  status text not null check (status in ('ok', 'error', 'refused', 'invalid_output', 'timeout')),
  latency_ms integer,
  created_at timestamptz not null default now()
);
create index ai_usage_logs_created_idx on public.ai_usage_logs (created_at desc);
alter table public.ai_usage_logs enable row level security;
create policy ai_usage_logs_admin on public.ai_usage_logs for select to authenticated using (public.is_admin());
revoke insert, update, delete on public.ai_usage_logs from anon, authenticated;

-- ───────────────────────────── Comparaisons et économies
create table public.comparison_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  category public.offer_category not null,
  months integer not null check (months in (12, 24)),
  input jsonb not null,
  results jsonb not null,                 -- instantané des offres et calculs au moment de la comparaison
  best_net_saving_cents integer,
  created_at timestamptz not null default now()
);
create index comparison_results_user_idx on public.comparison_results (user_id, created_at desc);
alter table public.comparison_results enable row level security;
create policy comparison_results_select_own on public.comparison_results for select to authenticated using (user_id = (select auth.uid()));
create policy comparison_results_delete_own on public.comparison_results for delete to authenticated using (user_id = (select auth.uid()));
revoke insert, update on public.comparison_results from anon, authenticated;

create table public.saving_opportunities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  comparison_id uuid references public.comparison_results (id) on delete set null,
  offer_id uuid references public.offers (id) on delete set null,
  category text not null,
  title text not null check (char_length(title) <= 160),
  months integer not null check (months in (12, 24)),
  net_saving_cents integer not null,
  monthly_saving_cents integer not null,
  status public.saving_status not null default 'potential',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index saving_opportunities_user_idx on public.saving_opportunities (user_id, status);
alter table public.saving_opportunities enable row level security;
create policy saving_opportunities_select_own on public.saving_opportunities for select to authenticated using (user_id = (select auth.uid()));
create policy saving_opportunities_update_own on public.saving_opportunities for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy saving_opportunities_delete_own on public.saving_opportunities for delete to authenticated using (user_id = (select auth.uid()));
revoke insert, update on public.saving_opportunities from anon, authenticated;
grant update (status, updated_at) on public.saving_opportunities to authenticated;

create table public.realized_savings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  opportunity_id uuid references public.saving_opportunities (id) on delete set null,
  label text not null check (char_length(label) between 1 and 120),
  monthly_cents integer not null check (monthly_cents between 1 and 1000000),
  kind text not null check (kind in ('confirmed', 'observed')),   -- déclarée par l'utilisateur / constatée sur facture
  started_on date not null default current_date,
  created_at timestamptz not null default now()
);
create index realized_savings_user_idx on public.realized_savings (user_id);
alter table public.realized_savings enable row level security;
create policy realized_savings_own on public.realized_savings for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- ───────────────────────────── Bons plans locaux
create table public.merchant_locations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 100),
  address text not null check (char_length(address) between 3 and 200),
  postal_code text not null check (postal_code ~ '^[0-9]{5}$'),
  city text not null check (char_length(city) between 1 and 80),
  lat double precision not null check (lat between -90 and 90),
  lon double precision not null check (lon between -180 and 180),
  phone text check (char_length(phone) <= 20),
  website text check (website is null or website ~ '^https://'),
  created_at timestamptz not null default now()
);
create index merchant_locations_geo_idx on public.merchant_locations (lat, lon);
alter table public.merchant_locations enable row level security;
create policy merchants_admin_all on public.merchant_locations for all to authenticated using (public.is_admin()) with check (public.is_admin());

create table public.local_deals (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchant_locations (id) on delete cascade,
  title text not null check (char_length(title) between 3 and 120),
  category text not null check (category in ('alimentation', 'restaurants', 'shopping', 'loisirs', 'activites', 'services', 'beaute', 'sport', 'etudiants', 'promotions')),
  description text check (char_length(description) <= 800),
  deal_label text not null check (char_length(deal_label) between 1 and 60),
  conditions text check (char_length(conditions) <= 600),
  valid_from date,
  valid_until date,                        -- null = offre permanente, revérifiée régulièrement
  source_url text not null check (source_url ~ '^https://'),
  use_url text check (use_url is null or use_url ~ '^https://'),
  verified_at date,
  recheck_by date,
  status public.deal_status not null default 'submitted',
  is_sponsored boolean not null default false,
  is_demo boolean not null default false,
  submitted_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint deals_verified_has_date check (status <> 'verified' or (verified_at is not null and recheck_by is not null))
);
create index local_deals_public_idx on public.local_deals (status, category);
alter table public.local_deals enable row level security;
create policy deals_public_read on public.local_deals for select to anon, authenticated
  using (status = 'verified' and not is_demo and (valid_until is null or valid_until >= current_date) and recheck_by >= current_date);
create policy deals_admin_all on public.local_deals for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy merchants_public_read on public.merchant_locations for select to anon, authenticated
  using (exists (select 1 from public.local_deals d where d.merchant_id = merchant_locations.id));

create table public.favorites (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  kind text not null check (kind in ('deal', 'offer')),
  ref_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (user_id, kind, ref_id)
);
alter table public.favorites enable row level security;
create policy favorites_own on public.favorites for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- ───────────────────────────── Notifications, parrainage
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('charge_reminder', 'renewal', 'promo_end', 'better_offer', 'deal_expiring', 'monthly_summary', 'billing', 'referral', 'system')),
  title text not null check (char_length(title) <= 120),
  body text check (char_length(body) <= 500),
  link text check (link is null or link ~ '^/'),
  dedupe_key text,
  read_at timestamptz,
  emailed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, dedupe_key)
);
create index notifications_user_idx on public.notifications (user_id, created_at desc);
alter table public.notifications enable row level security;
create policy notifications_select_own on public.notifications for select to authenticated using (user_id = (select auth.uid()));
create policy notifications_update_own on public.notifications for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy notifications_delete_own on public.notifications for delete to authenticated using (user_id = (select auth.uid()));
revoke insert, update on public.notifications from anon, authenticated;
grant update (read_at) on public.notifications to authenticated;

create table public.referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_id uuid not null references auth.users (id) on delete cascade,
  referred_id uuid not null unique references auth.users (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'qualified', 'rewarded', 'rejected')),
  created_at timestamptz not null default now(),
  qualified_at timestamptz,
  check (referrer_id <> referred_id)
);
create index referrals_referrer_idx on public.referrals (referrer_id, status);
alter table public.referrals enable row level security;
-- Le parrain voit ses filleuls (statut et date uniquement côté interface), jamais leurs données.
create policy referrals_select_own on public.referrals for select to authenticated
  using (referrer_id = (select auth.uid()) or referred_id = (select auth.uid()));
revoke insert, update, delete on public.referrals from anon, authenticated;

-- ───────────────────────────── Analytics produit, audit, paramètres
create table public.analytics_events (
  id bigint generated always as identity primary key,
  name text not null check (name ~ '^[a-z_]{3,40}$'),
  user_id uuid references auth.users (id) on delete set null,
  anon_id text check (char_length(anon_id) <= 40),
  source text check (char_length(source) <= 40),
  props jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index analytics_events_name_idx on public.analytics_events (name, created_at desc);
create index analytics_events_user_idx on public.analytics_events (user_id, created_at desc);
alter table public.analytics_events enable row level security;
create policy analytics_admin on public.analytics_events for select to authenticated using (public.is_admin());
revoke insert, update, delete on public.analytics_events from anon, authenticated;

create table public.audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid references auth.users (id) on delete set null,
  action text not null,
  entity text,
  entity_id text,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index audit_logs_created_idx on public.audit_logs (created_at desc);
alter table public.audit_logs enable row level security;
create policy audit_admin on public.audit_logs for select to authenticated using (public.is_admin());
revoke insert, update, delete on public.audit_logs from anon, authenticated;

create table public.admin_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid
);
alter table public.admin_settings enable row level security;
create policy admin_settings_admin on public.admin_settings for all to authenticated using (public.is_admin()) with check (public.is_admin());

insert into public.admin_settings (key, value) values
  ('plan_limits', '{"free_ai_analyses": 3, "plus_ai_analyses": 20, "free_ai_chat": 15, "plus_ai_chat": 200, "free_contracts": 1}'),
  ('ai_budget', '{"monthly_cap_usd": 50, "alert_ratio": 0.8, "max_document_bytes": 4000000}'),
  ('referral', '{"qualified_needed": 3, "bonus_days": 30}'),
  ('energy_comparator', '{"public": false}');

create trigger user_contracts_limit before insert on public.user_contracts for each row execute function public.tg_contract_limit();

-- ───────────────────────────── Création automatique du profil
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_code text;
begin
  loop
    v_code := upper(substr(translate(encode(extensions.gen_random_bytes(8), 'base64'), '+/=0OIl1', 'XYZABCDE'), 1, 8));
    exit when not exists (select 1 from public.profiles where referral_code = v_code);
  end loop;
  insert into public.profiles (id, display_name, referral_code)
  values (new.id, nullif(left(coalesce(new.raw_user_meta_data ->> 'display_name', ''), 60), ''), v_code);
  insert into public.user_preferences (user_id) values (new.id);
  insert into public.subscriptions (user_id) values (new.id);
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- ───────────────────────────── Vues d'agrégats pour l'administration (lecture service_role)
create or replace function public.admin_metrics()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if not (public.is_admin() or (select auth.role()) = 'service_role') then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'users_total', (select count(*) from public.profiles),
    'users_7d', (select count(*) from public.profiles where created_at > now() - interval '7 days'),
    'active_30d', (select count(distinct user_id) from public.analytics_events where user_id is not null and created_at > now() - interval '30 days'),
    'plus_active', (select count(*) from public.subscriptions where status in ('active', 'trialing')),
    'plus_past_due', (select count(*) from public.subscriptions where status = 'past_due'),
    'plus_canceling', (select count(*) from public.subscriptions where status = 'active' and cancel_at_period_end),
    'plus_canceled', (select count(*) from public.subscriptions where status = 'canceled'),
    'revenue_paid_cents_30d', (select coalesce(sum(amount_cents), 0) from public.subscription_events where type = 'invoice.paid' and created_at > now() - interval '30 days'),
    'comparisons_30d', (select count(*) from public.analytics_events where name = 'comparison_completed' and created_at > now() - interval '30 days'),
    'ai_calls_30d', (select count(*) from public.ai_usage_logs where created_at > now() - interval '30 days'),
    'ai_errors_30d', (select count(*) from public.ai_usage_logs where status <> 'ok' and created_at > now() - interval '30 days'),
    'ai_input_tokens_30d', (select coalesce(sum(input_tokens), 0) from public.ai_usage_logs where created_at > now() - interval '30 days'),
    'ai_output_tokens_30d', (select coalesce(sum(output_tokens), 0) from public.ai_usage_logs where created_at > now() - interval '30 days'),
    'ai_cost_micro_usd_month', (select coalesce(sum(cost_micro_usd), 0) from public.ai_usage_logs where created_at >= date_trunc('month', now())),
    'potential_savings_cents', (select coalesce(sum(net_saving_cents), 0) from public.saving_opportunities where status = 'potential' and net_saving_cents > 0),
    'confirmed_monthly_cents', (select coalesce(sum(monthly_cents), 0) from public.realized_savings),
    'offers_verified', (select count(*) from public.offers where status = 'verified' and valid_until >= current_date and not is_demo),
    'offers_expiring_7d', (select count(*) from public.offers where status = 'verified' and valid_until between current_date and current_date + 7),
    'offers_expired', (select count(*) from public.offers where status = 'verified' and valid_until < current_date),
    'deals_verified', (select count(*) from public.local_deals where status = 'verified' and not is_demo),
    'deals_pending', (select count(*) from public.local_deals where status = 'submitted'),
    'events_by_name_30d', (select coalesce(jsonb_object_agg(name, c), '{}'::jsonb) from (select name, count(*) c from public.analytics_events where created_at > now() - interval '30 days' group by name) t),
    'signups_by_source_30d', (select coalesce(jsonb_object_agg(coalesce(source, 'direct'), c), '{}'::jsonb) from (select source, count(*) c from public.analytics_events where name = 'account_created' and created_at > now() - interval '30 days' group by source) t)
  );
end $$;
revoke execute on function public.admin_metrics() from public, anon;
grant execute on function public.admin_metrics() to authenticated, service_role;

-- ───────────────────────────── Privilèges explicites (ne dépend pas des privilèges par défaut du projet)
grant usage on schema public to anon, authenticated, service_role;
grant select on public.providers, public.offers, public.offer_sources, public.merchant_locations, public.local_deals to anon, authenticated;
grant select on public.profiles, public.user_preferences, public.login_history, public.subscriptions, public.subscription_events,
  public.usage_quotas, public.uploaded_documents, public.document_analyses, public.comparison_results, public.saving_opportunities,
  public.notifications, public.referrals, public.admins, public.stripe_events, public.ai_usage_logs, public.analytics_events,
  public.audit_logs, public.offer_price_history to authenticated;
grant insert, update on public.user_preferences to authenticated;
grant select, insert, update, delete on public.user_contracts, public.realized_savings, public.favorites to authenticated;
grant delete on public.uploaded_documents, public.document_analyses, public.comparison_results, public.saving_opportunities, public.notifications to authenticated;
grant select, insert, update, delete on public.providers, public.offers, public.offer_sources, public.merchant_locations, public.local_deals, public.admin_settings to authenticated;
grant all on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;
