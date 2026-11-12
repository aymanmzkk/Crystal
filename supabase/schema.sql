-- Crystal: cuentas, roles y datos en Supabase.
-- Cómo usarlo: en Supabase abre SQL Editor, pega TODO este archivo y pulsa Run. Se puede ejecutar más de una vez.

-- ───────────── Perfiles: uno por cuenta ─────────────
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  name text not null default '',
  role text not null default 'user' check (role in ('user', 'admin')),
  status text not null default 'active' check (status in ('active', 'blocked')),
  created_at timestamptz not null default now(),
  last_seen_at timestamptz
);

-- ¿El usuario que hace la consulta es admin? (security definer para no entrar en bucle con las reglas)
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin' and status = 'active');
$$;

-- ¿Está activo (no bloqueado)?
create or replace function public.is_active()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and status = 'active');
$$;

-- Al registrarse se crea su perfil. La PRIMERA cuenta de todas es la admin.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'name', ''),
    case when exists (select 1 from public.profiles where role = 'admin') then 'user' else 'admin' end
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;

-- Cada uno ve su perfil; el admin ve todos
drop policy if exists "profiles_select" on public.profiles;
create policy "profiles_select" on public.profiles
  for select using (id = auth.uid() or public.is_admin());

-- Cada uno puede cambiar su nombre y su última conexión (no su rol ni su estado: lo comprueba el trigger de abajo)
drop policy if exists "profiles_update_self" on public.profiles;
create policy "profiles_update_self" on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

-- El admin puede bloquear o desbloquear
drop policy if exists "profiles_update_admin" on public.profiles;
create policy "profiles_update_admin" on public.profiles
  for update using (public.is_admin());

-- Nadie que no sea admin puede cambiarse el rol o el estado. Y el admin no puede bloquearse a sí mismo.
create or replace function public.protect_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (new.role is distinct from old.role or new.status is distinct from old.status) then
    if not public.is_admin() then
      raise exception 'Solo el admin puede cambiar roles o bloquear cuentas';
    end if;
    if new.id = auth.uid() then
      raise exception 'No puedes cambiar tu propio rol ni bloquearte';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_protect on public.profiles;
create trigger profiles_protect
  before update on public.profiles
  for each row execute function public.protect_profile();

-- ───────────── Datos de la app (para la sincronización) ─────────────
-- Cada registro de la app (tarea, evento, viaje...) es una fila: tabla + id + datos en JSON.
create table if not exists public.records (
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  table_name text not null,
  id text not null,
  data jsonb not null,
  updated_at bigint not null,
  deleted_at bigint not null default 0,
  primary key (user_id, table_name, id)
);

create index if not exists records_user_updated on public.records (user_id, updated_at);

alter table public.records enable row level security;

-- Cada uno lee y escribe solo lo suyo (y solo si no está bloqueado). El admin puede LEER lo de todos.
drop policy if exists "records_select" on public.records;
create policy "records_select" on public.records
  for select using ((user_id = auth.uid() and public.is_active()) or public.is_admin());

drop policy if exists "records_write" on public.records;
create policy "records_write" on public.records
  for all using (user_id = auth.uid() and public.is_active()) with check (user_id = auth.uid() and public.is_active());

-- ───────────── Estadísticas para el panel de admin (sin ver datos) ─────────────
create or replace function public.admin_stats()
returns table (user_id uuid, records bigint, bytes bigint, last_change bigint)
language sql
stable
security definer
set search_path = public
as $$
  select r.user_id, count(*), coalesce(sum(pg_column_size(r.data)), 0)::bigint, max(r.updated_at)
  from public.records r
  where public.is_admin()
  group by r.user_id;
$$;
