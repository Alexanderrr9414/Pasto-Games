-- Ejecuta este archivo en el SQL Editor de tu proyecto Supabase.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  avatar_path text,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.profiles add column if not exists full_name text;
alter table public.profiles add column if not exists avatar_path text;

create table if not exists public.games (
  id text primary key,
  name text not null
);

create table if not exists public.user_game_access (
  user_id uuid not null references public.profiles(id) on delete cascade,
  game_id text not null references public.games(id) on delete cascade,
  granted_at timestamptz not null default now(),
  primary key (user_id, game_id)
);

create table if not exists public.game_leaderboard (
  user_id uuid not null references public.profiles(id) on delete cascade,
  game_id text not null references public.games(id) on delete cascade,
  display_name text not null,
  score integer not null check (score >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, game_id)
);

create table if not exists public.game_requests (
  user_id uuid not null references public.profiles(id) on delete cascade,
  game_id text not null references public.games(id) on delete cascade,
  requested_at timestamptz not null default now(),
  primary key (user_id, game_id)
);

insert into public.games (id, name)
values
  ('tres-en-raya', 'Tres en raya'),
  ('snake', 'Snake'),
  ('memoria', 'Memoria'),
  ('piedra-papel-tijera', 'Piedra, papel o tijera'),
  ('adivina-numero', 'Adivina el número'),
  ('quiz', 'Quiz relámpago'),
  ('reaccion', 'Reto de reacción'),
  ('simon', 'Simón dice'),
  ('pong', 'Pong'),
  ('aventura-plataformas', 'Aventura de plataformas'),
  ('rompe-ladrillos', 'Rompe ladrillos'),
  ('buscaminas', 'Buscaminas'),
  ('2048', '2048'),
  ('defensa-espacial', 'Defensa espacial')
on conflict (id) do update set name = excluded.name;

-- Solo devuelve si la cuenta que inició sesión es administradora.
create or replace function public.is_current_user_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and is_admin = true
  );
$$;

revoke all on function public.is_current_user_admin() from public, anon;
grant execute on function public.is_current_user_admin() to authenticated;

-- Solo guarda puntuaciones del propio jugador y conserva su mejor resultado.
create or replace function public.submit_game_score(p_game_id text, p_score integer)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_player_id uuid := (select auth.uid());
  current_player_name text;
begin
  if current_player_id is null then
    raise exception 'Debes iniciar sesión para guardar puntuaciones.';
  end if;

  if p_score is null or p_score < 0 then
    raise exception 'La puntuación no es válida.';
  end if;

  if not exists (
    select 1 from public.user_game_access
    where user_id = current_player_id and game_id = p_game_id
  ) then
    raise exception 'No tienes permiso para guardar puntuaciones de este juego.';
  end if;

  if (p_game_id = 'tres-en-raya' and p_score <> 1)
    or (p_game_id = 'memoria' and p_score < 1)
    or (p_game_id = 'snake' and p_score > 400)
    or (p_game_id = 'piedra-papel-tijera' and p_score > 10)
    or (p_game_id = 'adivina-numero' and (p_score < 1 or p_score > 7))
    or (p_game_id = 'quiz' and p_score > 10)
    or (p_game_id = 'reaccion' and p_score > 1000)
    or (p_game_id = 'simon' and (p_score < 1 or p_score > 20))
    or (p_game_id = 'pong' and p_score > 9)
    or (p_game_id = 'aventura-plataformas' and p_score > 2000)
    or (p_game_id = 'rompe-ladrillos' and p_score > 400)
    or (p_game_id = 'buscaminas' and p_score > 3600)
    or (p_game_id = '2048' and (p_score < 2 or p_score > 2048))
    or (p_game_id = 'defensa-espacial' and p_score > 100000)
    or p_game_id not in (
      'tres-en-raya', 'snake', 'memoria', 'piedra-papel-tijera',
      'adivina-numero', 'quiz', 'reaccion', 'simon', 'pong',
      'aventura-plataformas', 'rompe-ladrillos', 'buscaminas', '2048',
      'defensa-espacial'
    ) then
    raise exception 'La puntuación no es válida para este juego.';
  end if;

  select coalesce(nullif(trim(full_name), ''), 'Jugador')
  into current_player_name
  from public.profiles
  where id = current_player_id;

  insert into public.game_leaderboard (user_id, game_id, display_name, score, updated_at)
  values (current_player_id, p_game_id, current_player_name, p_score, now())
  on conflict (user_id, game_id) do update set
    display_name = excluded.display_name,
    score = case
      when p_game_id = 'tres-en-raya'
        then public.game_leaderboard.score + excluded.score
      when p_game_id in ('memoria', 'adivina-numero', 'buscaminas')
        then least(public.game_leaderboard.score, excluded.score)
      else greatest(public.game_leaderboard.score, excluded.score)
    end,
    updated_at = now();
end;
$$;

revoke all on function public.submit_game_score(text, integer) from public, anon;
grant execute on function public.submit_game_score(text, integer) to authenticated;

-- Mantiene actualizado el nombre que se muestra en las clasificaciones.
create or replace function public.update_leaderboard_player_name()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.game_leaderboard
  set display_name = coalesce(nullif(trim(new.full_name), ''), 'Jugador')
  where user_id = new.id;
  return new;
end;
$$;

revoke all on function public.update_leaderboard_player_name() from public, anon, authenticated;

drop trigger if exists update_leaderboard_name_after_profile_change on public.profiles;
create trigger update_leaderboard_name_after_profile_change
after update of full_name on public.profiles
for each row
when (old.full_name is distinct from new.full_name)
execute function public.update_leaderboard_player_name();

-- Crea un perfil cuando alguien se registra y actualiza el correo si cambia.
create or replace function public.create_or_update_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data ->> 'full_name')
  on conflict (id) do update
    set email = excluded.email,
        full_name = coalesce(excluded.full_name, public.profiles.full_name);
  return new;
end;
$$;

revoke all on function public.create_or_update_profile() from public, anon, authenticated;

drop trigger if exists create_profile_after_signup on auth.users;
create trigger create_profile_after_signup
after insert on auth.users
for each row execute function public.create_or_update_profile();

drop trigger if exists update_profile_after_email_change on auth.users;
create trigger update_profile_after_email_change
after update of email on auth.users
for each row
when (old.email is distinct from new.email)
execute function public.create_or_update_profile();

-- También incorpora las cuentas que ya existían antes de instalar este archivo.
insert into public.profiles (id, email, full_name, created_at)
select id, email, raw_user_meta_data ->> 'full_name', created_at
from auth.users
where email is not null
on conflict (id) do update
  set email = excluded.email,
      full_name = coalesce(excluded.full_name, public.profiles.full_name);

alter table public.profiles enable row level security;
alter table public.games enable row level security;
alter table public.user_game_access enable row level security;
alter table public.game_leaderboard enable row level security;
alter table public.game_requests enable row level security;

drop policy if exists "Users can see their own profile; admins can see all" on public.profiles;
create policy "Users can see their own profile; admins can see all"
on public.profiles for select to authenticated
using (id = (select auth.uid()) or (select public.is_current_user_admin()));

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
on public.profiles for update to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

drop policy if exists "Signed-in users can see the game catalog" on public.games;
create policy "Signed-in users can see the game catalog"
on public.games for select to authenticated
using (true);

drop policy if exists "Users can see their own game access; admins can see all" on public.user_game_access;
create policy "Users can see their own game access; admins can see all"
on public.user_game_access for select to authenticated
using (user_id = (select auth.uid()) or (select public.is_current_user_admin()));

drop policy if exists "Players can see scores for games they can play" on public.game_leaderboard;
create policy "Players can see scores for games they can play"
on public.game_leaderboard for select to authenticated
using (
  (select public.is_current_user_admin())
  or exists (
    select 1 from public.user_game_access
    where user_id = (select auth.uid())
      and game_id = game_leaderboard.game_id
  )
);

drop policy if exists "Admins can grant game access" on public.user_game_access;
create policy "Admins can grant game access"
on public.user_game_access for insert to authenticated
with check ((select public.is_current_user_admin()));

drop policy if exists "Admins can remove game access" on public.user_game_access;
create policy "Admins can remove game access"
on public.user_game_access for delete to authenticated
using ((select public.is_current_user_admin()));

drop policy if exists "Users can see their own requests; admins can see all" on public.game_requests;
create policy "Users can see their own requests; admins can see all"
on public.game_requests for select to authenticated
using (user_id = (select auth.uid()) or (select public.is_current_user_admin()));

drop policy if exists "Users can request their own games" on public.game_requests;
create policy "Users can request their own games"
on public.game_requests for insert to authenticated
with check (
  user_id = (select auth.uid())
  and not exists (
    select 1 from public.user_game_access
    where user_id = (select auth.uid())
      and game_id = game_requests.game_id
  )
);

drop policy if exists "Admins can remove game requests" on public.game_requests;
create policy "Admins can remove game requests"
on public.game_requests for delete to authenticated
using ((select public.is_current_user_admin()));

revoke all on public.profiles, public.games, public.user_game_access, public.game_leaderboard, public.game_requests from anon, authenticated;
grant select on public.profiles, public.games to authenticated;
grant update (full_name, avatar_path) on public.profiles to authenticated;
grant select, insert, delete on public.user_game_access to authenticated;
grant select on public.game_leaderboard to authenticated;
grant select, insert, delete on public.game_requests to authenticated;

-- Fotos de perfil públicas para mostrarlas en el portal; solo el propietario puede cambiarlas.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  2097152,
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Anyone can view profile pictures" on storage.objects;
create policy "Anyone can view profile pictures"
on storage.objects for select to public
using (bucket_id = 'avatars');

drop policy if exists "Users can upload their own profile picture" on storage.objects;
create policy "Users can upload their own profile picture"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "Users can delete their own profile pictures" on storage.objects;
create policy "Users can delete their own profile pictures"
on storage.objects for delete to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);
