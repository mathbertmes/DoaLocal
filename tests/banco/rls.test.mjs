// Roteiro de teste automatizado das políticas RLS e regras de negócio (RNF03).
// Executa as migrações em um PostgreSQL embarcado (PGlite) com um stub do
// Supabase Auth e verifica o que cada usuário consegue ler e alterar.
// Uso: npm run test:banco
import { test, before } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";

const RAIZ = fileURLToPath(new URL("../../", import.meta.url));
const A = "00000000-0000-0000-0000-00000000000a";
const B = "00000000-0000-0000-0000-00000000000b";
const C = "00000000-0000-0000-0000-00000000000c";

let db;

// Executa SQL como um usuário autenticado (ou anônimo, se id for null).
async function como(id, sql, params = []) {
  await db.exec("reset role;");
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [id ?? ""]);
  await db.exec(id ? "set role authenticated;" : "set role anon;");
  try {
    return await db.query(sql, params);
  } finally {
    await db.exec("reset role;");
  }
}

async function falha(promessa, mensagem) {
  await assert.rejects(promessa, undefined, mensagem);
}

const novoAnuncio = (doador, titulo = "Sofá de 3 lugares") =>
  como(
    doador,
    `insert into public.anuncios (doador_id, titulo, descricao, categoria, bairro, cidade, fotos)
     values ($1, $2, 'Sofá em bom estado, retirar no local.', 'MOVEIS', 'Centro', 'Itajaí', '{a.jpg}')
     returning id`,
    [doador, titulo],
  ).then((r) => r.rows[0].id);

before(async () => {
  db = new PGlite();
  await db.exec(readFileSync(join(RAIZ, "tests/banco/supabase-stub.sql"), "utf8"));
  const pasta = join(RAIZ, "supabase/migrations");
  for (const arquivo of readdirSync(pasta).filter((f) => f.endsWith(".sql")).sort()) {
    await db.exec(readFileSync(join(pasta, arquivo), "utf8"));
  }
  for (const [id, nome] of [[A, "Ana"], [B, "Bruno"], [C, "Carla"]]) {
    await db.query(
      "insert into auth.users (id, email, raw_user_meta_data) values ($1, $2, $3)",
      [id, `${nome.toLowerCase()}@teste.com`, JSON.stringify({ nome })],
    );
  }
});

test("RF01: perfil é criado automaticamente no cadastro", async () => {
  const { rows } = await como(A, "select nome from public.perfis where id = $1", [A]);
  assert.equal(rows[0].nome, "Ana");
});

test("RN03: anúncio exige de 1 a 5 fotos", async () => {
  await falha(
    como(A, `insert into public.anuncios (doador_id, titulo, descricao, categoria, bairro, cidade, fotos)
             values ($1, 'Mesa', 'Mesa de madeira maciça.', 'MOVEIS', 'Centro', 'Itajaí', '{}')`, [A]),
    "sem fotos deveria falhar",
  );
  await falha(
    como(A, `insert into public.anuncios (doador_id, titulo, descricao, categoria, bairro, cidade, fotos)
             values ($1, 'Mesa', 'Mesa de madeira maciça.', 'MOVEIS', 'Centro', 'Itajaí', '{1,2,3,4,5,6}')`, [A]),
    "6 fotos deveria falhar",
  );
});

test("RNF03: usuário não publica anúncio em nome de outro", async () => {
  await falha(como(A,
    `insert into public.anuncios (doador_id, titulo, descricao, categoria, bairro, cidade, fotos)
     values ($1, 'Falso', 'Anúncio em nome de outra pessoa.', 'OUTROS', 'Centro', 'Itajaí', '{a.jpg}')`, [B]));
});

test("RNF03 / RN07: usuário B não altera anúncio de A", async () => {
  const id = await novoAnuncio(A, "Geladeira");
  const r = await como(B, "update public.anuncios set titulo = 'Hackeado' where id = $1", [id]);
  assert.equal(r.affectedRows, 0);
  const { rows } = await como(A, "select titulo from public.anuncios where id = $1", [id]);
  assert.equal(rows[0].titulo, "Geladeira");
});

test("RN02 / RF04: visitante anônimo vê apenas anúncios disponíveis", async () => {
  const id = await novoAnuncio(A, "Cadeira cancelada");
  await como(A, "update public.anuncios set status = 'CANCELADO' where id = $1", [id]);
  const { rows } = await como(null, "select id, status from public.anuncios");
  assert.ok(rows.length > 0);
  assert.ok(rows.every((r) => r.status === "DISPONIVEL"));
  assert.ok(!rows.some((r) => r.id === id));
});

test("RN01: doador não abre chat no próprio anúncio", async () => {
  const id = await novoAnuncio(A, "Estante");
  await falha(como(A, "insert into public.chats (anuncio_id, doador_id, recebedor_id) values ($1, $2, $2)", [id, A]));
});

test("RN06: um chat por recebedor em cada anúncio", async () => {
  const id = await novoAnuncio(A, "Micro-ondas");
  await como(B, "insert into public.chats (anuncio_id, doador_id, recebedor_id) values ($1, $2, $3)", [id, A, B]);
  await falha(como(B, "insert into public.chats (anuncio_id, doador_id, recebedor_id) values ($1, $2, $3)", [id, A, B]));
});

test("RNF03: usuário C não lê o chat nem as mensagens entre A e B", async () => {
  const anuncio = await novoAnuncio(A, "Fogão");
  const { rows } = await como(B,
    "insert into public.chats (anuncio_id, doador_id, recebedor_id) values ($1, $2, $3) returning id", [anuncio, A, B]);
  const chat = rows[0].id;
  await como(B, "insert into public.mensagens (chat_id, remetente_id, conteudo) values ($1, $2, 'Olá, ainda está disponível?')", [chat, B]);

  assert.equal((await como(C, "select * from public.chats where id = $1", [chat])).rows.length, 0);
  assert.equal((await como(C, "select * from public.mensagens where chat_id = $1", [chat])).rows.length, 0);
  assert.equal((await como(A, "select * from public.mensagens where chat_id = $1", [chat])).rows.length, 1);
  await falha(como(C, "insert into public.mensagens (chat_id, remetente_id, conteudo) values ($1, $2, 'intruso')", [chat, C]));
});

test("RF09 / M11: marcar como doado arquiva os chats e bloqueia novas mensagens", async () => {
  const anuncio = await novoAnuncio(A, "Berço");
  const { rows } = await como(B,
    "insert into public.chats (anuncio_id, doador_id, recebedor_id) values ($1, $2, $3) returning id", [anuncio, A, B]);
  const chat = rows[0].id;

  await como(A, "update public.anuncios set status = 'DOADO' where id = $1", [anuncio]);

  const status = (await como(B, "select status from public.chats where id = $1", [chat])).rows[0].status;
  assert.equal(status, "ENCERRADO");
  await falha(como(B, "insert into public.mensagens (chat_id, remetente_id, conteudo) values ($1, $2, 'oi')", [chat, B]));
  await falha(como(A, "update public.anuncios set status = 'DISPONIVEL' where id = $1", [anuncio]),
    "anúncio doado não pode voltar a disponível");
  await falha(como(C, "insert into public.chats (anuncio_id, doador_id, recebedor_id) values ($1, $2, $3)", [anuncio, A, C]),
    "anúncio doado não aceita novos interessados");
});

test("RF10 / RN07: somente o doador encerra o chat", async () => {
  const anuncio = await novoAnuncio(A, "Tapete");
  const { rows } = await como(B,
    "insert into public.chats (anuncio_id, doador_id, recebedor_id) values ($1, $2, $3) returning id", [anuncio, A, B]);
  const chat = rows[0].id;

  const r = await como(B, "update public.chats set status = 'ENCERRADO' where id = $1", [chat]);
  assert.equal(r.affectedRows, 0);
  await como(A, "update public.chats set status = 'ENCERRADO' where id = $1", [chat]);
  assert.equal((await como(A, "select status from public.chats where id = $1", [chat])).rows[0].status, "ENCERRADO");
  const anuncioStatus = (await como(A, "select status from public.anuncios where id = $1", [anuncio])).rows[0].status;
  assert.equal(anuncioStatus, "DISPONIVEL");
});
