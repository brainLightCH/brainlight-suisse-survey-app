-- brainLight Suisse — Séances : schéma Supabase (Postgres)
-- À exécuter une fois dans Supabase → SQL Editor → New query → Run.
-- Idempotent : peut être ré-exécuté sans dupliquer les objets.

-- ============================================================
-- Table sessions
-- ============================================================
create table if not exists sessions (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('showcase', 'event', 'energy_days')),
  event_name text not null,
  company_name text,
  sector text,
  phase text not null default 'before' check (phase in ('before', 'after')),
  active_numbers jsonb not null default '[]'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  closed_at timestamptz
);

-- Une seule session active à la fois.
create unique index if not exists sessions_single_active_idx
  on sessions ((is_active))
  where is_active;

-- ============================================================
-- Table responses
-- ============================================================
create table if not exists responses (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions (id) on delete cascade,
  phase text not null check (phase in ('before', 'after')),
  participant_number int not null check (participant_number between 1 and 15),
  stress int not null check (stress between 1 and 10),
  fatigue_nerveuse int not null check (fatigue_nerveuse between 1 and 10),
  fatigue_physique int not null check (fatigue_physique between 1 and 10),
  lead_optin boolean not null default false,
  prenom text,
  nom text,
  email text,
  telephone text,
  entreprise text,
  created_at timestamptz not null default now(),
  unique (session_id, phase, participant_number)
);

create index if not exists responses_session_idx on responses (session_id);

-- ============================================================
-- Table history
-- ============================================================
create table if not exists history (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null,
  type text not null,
  event_name text not null,
  company_name text,
  sector text,
  closed_at timestamptz not null default now(),
  matched_count int not null default 0,
  leads_count int not null default 0,
  delta_stress numeric,
  delta_fatigue_nerveuse numeric,
  delta_fatigue_physique numeric
);

create index if not exists history_sector_idx on history (sector);
create index if not exists history_company_idx on history (company_name);
create index if not exists history_type_idx on history (type);
create index if not exists history_closed_at_idx on history (closed_at);

-- ============================================================
-- Row Level Security
-- ============================================================
-- Architecture V1 : le site Next.js n'accède jamais à Supabase depuis le
-- navigateur. Toutes les lectures/écritures (formulaire participant,
-- dashboard coach, statistiques) passent par les routes API du serveur
-- Next.js, qui utilisent la clé "service role" (secrète, jamais exposée au
-- client) — celle-ci contourne RLS par conception.
--
-- RLS reste activé sur les 3 tables avec ZÉRO politique pour les rôles
-- publics (anon / authenticated) : c'est un refus par défaut. Si la clé
-- publique ("anon key") venait à être utilisée un jour côté navigateur
-- (V2), aucune donnée — et en particulier aucune coordonnée de contact
-- (prenom, nom, email, telephone, entreprise dans `responses`) — ne serait
-- accessible tant qu'aucune politique n'est explicitement ajoutée.

alter table sessions enable row level security;
alter table responses enable row level security;
alter table history enable row level security;

-- Aucune politique n'est créée pour anon/authenticated : accès refusé par
-- défaut pour ces rôles sur les 3 tables. Le rôle "service_role" utilisé
-- par les routes API du serveur contourne RLS (BYPASSRLS), donc l'app
-- continue de fonctionner normalement.
