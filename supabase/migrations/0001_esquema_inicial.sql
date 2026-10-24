-- =====================================================================
-- DoaLocal — 0001: esquema inicial e políticas de segurança (TS01)
-- Requisitos atendidos: RNF02 (Supabase Auth), RNF03 (RLS em todas as
-- tabelas), RN01, RN02, RN03, RN06 e RN07.
-- Executar no SQL Editor do Supabase.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Tipos enumerados
-- ---------------------------------------------------------------------
create type public.categoria_anuncio as enum (
  'MOVEIS', 'ELETRODOMESTICOS', 'VESTUARIO', 'UTILIDADES_DOMESTICAS', 'OUTROS'
);

-- M13: estados do anúncio reduzidos a DISPONIVEL, DOADO e CANCELADO.
create type public.status_anuncio as enum ('DISPONIVEL', 'DOADO', 'CANCELADO');

create type public.status_chat as enum ('ATIVO', 'ENCERRADO');

-- ---------------------------------------------------------------------
-- Tabelas
-- ---------------------------------------------------------------------

-- Perfil público do usuário. Credenciais (e-mail e hash da senha) ficam
-- exclusivamente em auth.users, gerenciado pelo Supabase Auth (RNF02).
create table public.perfis (
  id        uuid primary key references auth.users (id) on delete cascade,
  nome      text not null check (char_length(trim(nome)) between 2 and 80),
  criado_em timestamptz not null default now()
);

create table public.anuncios (
  id            uuid primary key default gen_random_uuid(),
  doador_id     uuid not null references public.perfis (id) on delete cascade,
  titulo        text not null check (char_length(trim(titulo)) between 3 and 100),
  descricao     text not null check (char_length(trim(descricao)) between 10 and 2000),
  categoria     public.categoria_anuncio not null,
  bairro        text not null check (char_length(trim(bairro)) between 2 and 80),
  cidade        text not null check (char_length(trim(cidade)) between 2 and 80),
  -- RN03: de 1 a 5 fotos (caminhos no Supabase Storage).
  fotos         text[] not null check (cardinality(fotos) between 1 and 5),
  status        public.status_anuncio not null default 'DISPONIVEL',
  publicado_em  timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index anuncios_status_publicado_idx on public.anuncios (status, publicado_em desc);
create index anuncios_doador_idx on public.anuncios (doador_id);

create table public.chats (
  id           uuid primary key default gen_random_uuid(),
  anuncio_id   uuid not null references public.anuncios (id) on delete cascade,
  doador_id    uuid not null references public.perfis (id) on delete cascade,
  recebedor_id uuid not null references public.perfis (id) on delete cascade,
  status       public.status_chat not null default 'ATIVO',
  iniciado_em  timestamptz not null default now(),
  -- RN06: no máximo um chat por recebedor em cada anúncio.
  constraint chats_anuncio_recebedor_unico unique (anuncio_id, recebedor_id),
  -- RN01: o doador não abre chat no próprio anúncio.
  constraint chats_doador_diferente_recebedor check (doador_id <> recebedor_id)
);

create index chats_doador_idx on public.chats (doador_id);
create index chats_recebedor_idx on public.chats (recebedor_id);

create table public.mensagens (
  id           uuid primary key default gen_random_uuid(),
  chat_id      uuid not null references public.chats (id) on delete cascade,
  remetente_id uuid not null references public.perfis (id) on delete cascade,
  -- M10: somente texto, até 1000 caracteres.
  conteudo     text not null check (char_length(trim(conteudo)) between 1 and 1000),
  enviada_em   timestamptz not null default now(),
  lida         boolean not null default false
);

create index mensagens_chat_idx on public.mensagens (chat_id, enviada_em);

-- ---------------------------------------------------------------------
-- Funções auxiliares
-- ---------------------------------------------------------------------

-- Indica se o usuário autenticado participa do chat. SECURITY DEFINER
-- evita recursão de RLS quando usada dentro das políticas.
create or replace function public.participa_do_chat(p_chat_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.chats c
    where c.id = p_chat_id
      and (select auth.uid()) in (c.doador_id, c.recebedor_id)
  );
$$;

-- Indica se o usuário autenticado é recebedor em algum chat do anúncio.
-- Usada na política de leitura de anúncios sem consultar chats sob RLS
-- (a política de chats consulta anúncios, o que causaria recursão).
create or replace function public.recebedor_do_anuncio(p_anuncio_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.chats c
    where c.anuncio_id = p_anuncio_id
      and c.recebedor_id = (select auth.uid())
  );
$$;

-- ---------------------------------------------------------------------
-- Gatilhos
-- ---------------------------------------------------------------------

-- Cria o perfil automaticamente quando um usuário se cadastra (RF01).
-- O nome é enviado nos metadados do signUp.
create or replace function public.criar_perfil_novo_usuario()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.perfis (id, nome)
  values (new.id, coalesce(nullif(trim(new.raw_user_meta_data ->> 'nome'), ''), 'Usuário'));
  return new;
end;
$$;

create trigger ao_criar_usuario
  after insert on auth.users
  for each row execute function public.criar_perfil_novo_usuario();

-- Garante as transições válidas do anúncio (M13) e impede alterar
-- anúncios já finalizados.
create or replace function public.validar_alteracao_anuncio()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.status <> 'DISPONIVEL' then
    raise exception 'Anúncio % não pode mais ser alterado (status %).', old.id, old.status;
  end if;

  if new.doador_id <> old.doador_id or new.publicado_em <> old.publicado_em then
    raise exception 'Doador e data de publicação não podem ser alterados.';
  end if;

  new.atualizado_em := now();
  return new;
end;
$$;

create trigger antes_de_alterar_anuncio
  before update on public.anuncios
  for each row execute function public.validar_alteracao_anuncio();

-- RF09 / M11: ao marcar como DOADO (ou CANCELADO), arquiva todos os chats.
create or replace function public.arquivar_chats_do_anuncio()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status <> 'DISPONIVEL' and old.status = 'DISPONIVEL' then
    update public.chats set status = 'ENCERRADO'
    where anuncio_id = new.id and status = 'ATIVO';
  end if;
  return new;
end;
$$;

create trigger apos_finalizar_anuncio
  after update of status on public.anuncios
  for each row execute function public.arquivar_chats_do_anuncio();

-- Chat: apenas a transição ATIVO -> ENCERRADO é permitida (RF10).
create or replace function public.validar_alteracao_chat()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.anuncio_id <> old.anuncio_id or new.doador_id <> old.doador_id
     or new.recebedor_id <> old.recebedor_id or new.iniciado_em <> old.iniciado_em then
    raise exception 'Somente o status do chat pode ser alterado.';
  end if;

  if old.status = 'ENCERRADO' and new.status = 'ATIVO' then
    raise exception 'Chat encerrado não pode ser reaberto.';
  end if;

  return new;
end;
$$;

create trigger antes_de_alterar_chat
  before update on public.chats
  for each row execute function public.validar_alteracao_chat();

-- Mensagem: após o envio, só o campo "lida" pode mudar (RF07).
create or replace function public.validar_alteracao_mensagem()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.chat_id <> old.chat_id or new.remetente_id <> old.remetente_id
     or new.conteudo <> old.conteudo or new.enviada_em <> old.enviada_em then
    raise exception 'Somente o campo "lida" da mensagem pode ser alterado.';
  end if;
  return new;
end;
$$;

create trigger antes_de_alterar_mensagem
  before update on public.mensagens
  for each row execute function public.validar_alteracao_mensagem();

-- ---------------------------------------------------------------------
-- Row Level Security (RNF03)
-- ---------------------------------------------------------------------
alter table public.perfis    enable row level security;
alter table public.anuncios  enable row level security;
alter table public.chats     enable row level security;
alter table public.mensagens enable row level security;

-- perfis: nome é público (exibido nos anúncios, M07); cada um edita o seu.
create policy "perfis: leitura pública"
  on public.perfis for select
  to anon, authenticated
  using (true);

create policy "perfis: usuário altera o próprio perfil"
  on public.perfis for update
  to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- anuncios: o mural mostra apenas DISPONIVEL (RN02); o doador vê todos os
-- seus (RF11); participantes de chat veem o anúncio mesmo após a doação.
create policy "anuncios: leitura de disponíveis, próprios ou com chat"
  on public.anuncios for select
  to anon, authenticated
  using (
    status = 'DISPONIVEL'
    or doador_id = (select auth.uid())
    or public.recebedor_do_anuncio(id)
  );

create policy "anuncios: usuário publica como doador"
  on public.anuncios for insert
  to authenticated
  with check (doador_id = (select auth.uid()) and status = 'DISPONIVEL');

-- RN07: somente o doador altera o anúncio.
create policy "anuncios: somente o doador altera"
  on public.anuncios for update
  to authenticated
  using (doador_id = (select auth.uid()))
  with check (doador_id = (select auth.uid()));

-- chats: visíveis apenas aos dois participantes.
create policy "chats: leitura pelos participantes"
  on public.chats for select
  to authenticated
  using ((select auth.uid()) in (doador_id, recebedor_id));

-- RF06 + RN01 + RN02: o recebedor abre o chat apenas em anúncio disponível
-- de outra pessoa, e o doador_id precisa ser o doador real do anúncio.
create policy "chats: recebedor abre chat em anúncio disponível"
  on public.chats for insert
  to authenticated
  with check (
    recebedor_id = (select auth.uid())
    and exists (
      select 1 from public.anuncios a
      where a.id = anuncio_id
        and a.doador_id = chats.doador_id
        and a.doador_id <> (select auth.uid())
        and a.status = 'DISPONIVEL'
    )
  );

-- RF10 + RN07: somente o doador encerra o chat.
create policy "chats: somente o doador encerra"
  on public.chats for update
  to authenticated
  using (doador_id = (select auth.uid()))
  with check (doador_id = (select auth.uid()));

-- mensagens: leitura pelos participantes do chat.
create policy "mensagens: leitura pelos participantes"
  on public.mensagens for select
  to authenticated
  using (public.participa_do_chat(chat_id));

-- Envio apenas em chat ATIVO e como o próprio remetente.
create policy "mensagens: participante envia em chat ativo"
  on public.mensagens for insert
  to authenticated
  with check (
    remetente_id = (select auth.uid())
    and public.participa_do_chat(chat_id)
    and exists (select 1 from public.chats c where c.id = chat_id and c.status = 'ATIVO')
  );

-- O destinatário marca como lida mensagens que recebeu.
create policy "mensagens: destinatário marca como lida"
  on public.mensagens for update
  to authenticated
  using (remetente_id <> (select auth.uid()) and public.participa_do_chat(chat_id))
  with check (remetente_id <> (select auth.uid()) and public.participa_do_chat(chat_id));
