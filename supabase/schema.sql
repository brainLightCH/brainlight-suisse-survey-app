-- brainLight Suisse — Séances : schéma Supabase (Postgres)
-- À exécuter une fois dans Supabase → SQL Editor → New query → Run.
-- Idempotent : peut être ré-exécuté sans dupliquer les objets.

-- ============================================================
-- Table sessions
-- ============================================================
create table if not exists sessions (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('showcase', 'event', 'energy_days', 'expo')),
  event_name text not null,
  company_name text,
  sector text,
  phase text not null default 'before' check (phase in ('before', 'after')),
  active_numbers jsonb not null default '[]'::jsonb,
  is_active boolean not null default true,
  notes text,
  station int not null default 0,
  send_results_email boolean not null default false,
  created_at timestamptz not null default now(),
  closed_at timestamptz
);

-- Migration : ajoute les colonnes aux bases déjà créées avant leur introduction.
alter table sessions add column if not exists notes text;
alter table sessions add column if not exists station int not null default 0;
-- Si true : un email de résultats est envoyé au participant après sa
-- soumission "après" (activé automatiquement pour les séances Expo).
alter table sessions add column if not exists send_results_email boolean not null default false;

-- Migration : élargit la contrainte de type existante pour autoriser 'expo'
-- (sans effet si la table vient d'être créée avec la liste déjà à jour).
alter table sessions drop constraint if exists sessions_type_check;
alter table sessions add constraint sessions_type_check
  check (type in ('showcase', 'event', 'energy_days', 'expo'));

-- Une seule session active à la fois PAR STATION. station = 0 est le mode
-- coach normal (Showcase / Event / Energy Days) : une seule séance active
-- au total, comme avant. station 1 à 4 sont les fauteuils expo (salons,
-- voir /expo/[station]) : chacun a sa propre séance active, indépendante
-- des 3 autres fauteuils et du mode coach — jusqu'à 5 séances actives en
-- parallèle au total (1 coach + 4 fauteuils expo).
drop index if exists sessions_single_active_idx;
create unique index if not exists sessions_single_active_per_station_idx
  on sessions (station)
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
  usage_likelihood int check (usage_likelihood is null or usage_likelihood between 0 and 10),
  prenom text,
  nom text,
  email text,
  telephone text,
  entreprise text,
  adresse text,
  lang text,
  email_consent boolean not null default false,
  email_sent_at timestamptz,
  crm_sent_at timestamptz,
  created_at timestamptz not null default now(),
  unique (session_id, phase, participant_number)
);

-- Migration : ajoute les colonnes aux bases déjà créées avant leur introduction.
-- Energy Days uniquement, phase "après" : probabilité (0-10) que la personne
-- utiliserait ce dispositif si présent dans son entreprise.
alter table responses add column if not exists usage_likelihood int;
-- Adresse complète (avec pays) : Expo uniquement, phase "avant".
alter table responses add column if not exists adresse text;
-- Langue choisie par le participant ('fr' ou 'de') : toutes les séances.
alter table responses add column if not exists lang text;
-- Consentement explicite à recevoir les résultats par email, et horodatage
-- de l'envoi (null = pas encore envoyé). Portés par la ligne qui contient
-- l'adresse email (la ligne "avant" pour Expo).
alter table responses add column if not exists email_consent boolean not null default false;
alter table responses add column if not exists email_sent_at timestamptz;
-- Horodatage de l'envoi de la fiche lead vers Odoo CRM (par email vers
-- l'alias Odoo). null = pas (encore) envoyée : évite les doublons et permet
-- de repérer les fiches dont l'envoi aurait échoué.
alter table responses add column if not exists crm_sent_at timestamptz;

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
  delta_fatigue_physique numeric,
  notes text
);

-- Migration : ajoute la colonne aux bases déjà créées avant son introduction.
alter table history add column if not exists notes text;

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
