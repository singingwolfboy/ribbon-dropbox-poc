--! Previous: sha1:fbd6ffb5be53e7e0bfc63929a52cfc13e698c5f0
--! Hash: sha1:f1fc274937714000b6780d01802b35168d891c78

--! split: 1-current.sql
drop function if exists app_hidden.current_user_dropbox_details;
create function app_hidden.current_user_dropbox_details() returns json as $$
  SELECT uas.details
  FROM app_private.user_authentication_secrets AS uas
  JOIN app_public.user_authentications AS ua
  ON uas.user_authentication_id = ua.id
  WHERE ua.user_id = app_public.current_user_id()
$$ language sql stable security definer set search_path to pg_catalog, public, pg_temp;
comment on function app_hidden.current_user_dropbox_details() is
  E'Handy method to get the Dropbox auth tokens for the current user.';

drop table if exists app_public.offers;
drop table if exists app_public.clients;

create table app_public.clients (
  id               serial primary key,
  user_id          uuid not null default app_public.current_user_id() references app_public.users(id) on delete cascade,
  name             text not null,
  slug             citext not null unique,
  dropbox_preapproval_file_request_id
                   text,
  has_preapproval  boolean not null default false,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
alter table app_public.clients enable row level security;
create index on app_public.clients (user_id);

create trigger _100_timestamps before insert or update on app_public.clients for each row execute procedure app_private.tg__timestamps();

grant
  select,
  insert (name, slug),
  update (name, slug, dropbox_preapproval_file_request_id, has_preapproval),
  delete
on app_public.clients to :DATABASE_VISITOR;

create policy select_own on app_public.clients for select using (user_id = app_public.current_user_id());
create policy manage_own on app_public.clients for all using (user_id = app_public.current_user_id());
create policy manage_as_admin on app_public.clients for all using (exists (select 1 from app_public.users where is_admin is true and id = app_public.current_user_id()));

comment on table app_public.clients is 'A client working with this agent.';
comment on column app_public.clients.slug is 'A unique value for the URL.';
comment on column app_public.clients.dropbox_preapproval_file_request_id is E'@omit';

CREATE TRIGGER _200_add_dropbox AFTER INSERT ON app_public.clients FOR EACH ROW EXECUTE FUNCTION app_private.tg__add_job('client__add_to_dropbox');

create or replace function app_private.tg__before_client_delete__add_job() returns trigger as $$
begin
  perform graphile_worker.add_job(tg_argv[0], json_build_object(
    'id', OLD.id,
    'user_id', OLD.user_id,
    'name', OLD.name,
    'slug', OLD.slug,
    'dropbox_preapproval_file_request_id', OLD.dropbox_preapproval_file_request_id
  ));
  return OLD;
end;
$$ language plpgsql volatile security definer set search_path to pg_catalog, public, pg_temp;
comment on function app_private.tg__before_client_delete__add_job() is
  E'Useful shortcut to create a job on client delete. Pass the task name as the first trigger argument.';

CREATE TRIGGER _200_remove_dropbox BEFORE DELETE ON app_public.clients FOR EACH ROW EXECUTE FUNCTION app_private.tg__before_client_delete__add_job('client__remove_from_dropbox');


create table app_public.offers (
  id               serial primary key,
  client_id        int not null references app_public.clients(id) on delete cascade,
  "address"        text not null,
  slug             citext not null unique,
  amount           money not null check (amount::numeric > 0),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
alter table app_public.offers enable row level security;
create index on app_public.offers (client_id);

create trigger _100_timestamps before insert or update on app_public.offers for each row execute procedure app_private.tg__timestamps();

grant
  select,
  insert (client_id, "address", slug, amount),
  update (amount),
  delete
on app_public.offers to :DATABASE_VISITOR;

create policy select_own on app_public.offers for select using (
  client_id IN (select id from app_public.clients where user_id = app_public.current_user_id())
);
create policy manage_own on app_public.offers for all using (
  client_id IN (select id from app_public.clients where user_id = app_public.current_user_id())
);
create policy manage_as_admin on app_public.offers for all using (exists (select 1 from app_public.users where is_admin is true and id = app_public.current_user_id()));

comment on table app_public.offers is 'An offer on a property, on behalf of a client.';
comment on column app_public.offers.address is 'The address of the property. Since this is a proof of concept, this may not be a valid address.';
comment on column app_public.offers.slug is 'A unique value for the URL.';
comment on column app_public.offers.amount is 'The amount the client is willing to pay for the property, in US dollars.';
