-- document_shares: real persistence for document metadata, tags, and share links (TASK-CRD-4).
--
-- 1. ALTER TABLE documents to add metadata (jsonb) and tags (text[]) columns.
-- 2. CREATE TABLE document_share_links with full RLS.

-- ── 1. Extend documents table ──────────────────────────────────────────────────

alter table public.documents
  add column if not exists metadata jsonb,
  add column if not exists tags     text[];

-- ── 2. Share-link table ────────────────────────────────────────────────────────

create table if not exists public.document_share_links (
  id              uuid        primary key default gen_random_uuid(),
  document_id     uuid        not null references public.documents(id) on delete cascade,
  user_id         uuid        not null references public.profiles(id) on delete cascade,
  recipients      text[]      not null default '{}',
  permissions     text        not null default 'view' check (permissions in ('view', 'download')),
  url             text        not null,
  expires_at      timestamptz not null,
  created_at      timestamptz not null default now()
);

alter table public.document_share_links enable row level security;

-- Only the owning user may read their own share links.
create policy "document_share_links: owner select"
  on public.document_share_links for select
  using (auth.uid() = user_id);

-- Only the owning user may create share links for their documents.
create policy "document_share_links: owner insert"
  on public.document_share_links for insert
  with check (auth.uid() = user_id);

-- Owners may update their own share links (e.g. extend expiry).
create policy "document_share_links: owner update"
  on public.document_share_links for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Owners may revoke (delete) their own share links.
create policy "document_share_links: owner delete"
  on public.document_share_links for delete
  using (auth.uid() = user_id);

-- Index to speed up the common look-up: list all share links for a document.
create index if not exists document_share_links_document_id_idx
  on public.document_share_links (document_id);

-- Index for the user-scoped queries.
create index if not exists document_share_links_user_id_idx
  on public.document_share_links (user_id);
