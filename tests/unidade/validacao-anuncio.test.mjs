// Testes unitários das validações do anúncio (RF03, RN03).
// Uso: npm run test:unidade
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  validarAnuncio,
  validarFotos,
  caminhosDeFotosValidos,
  FOTO_TAMANHO_MAXIMO,
} from "../../src/lib/validacao/anuncio.ts";

const valido = {
  titulo: "Sofá de 2 lugares",
  descricao: "Sofá em bom estado, tecido cinza, sem rasgos.",
  categoria: "MOVEIS",
  bairro: "Centro",
  cidade: "Itajaí",
};

const foto = { type: "image/jpeg", size: 1024 * 1024 };
const USUARIO = "6f1c2d3e-0000-4000-8000-000000000001";

test("anúncio válido não retorna erros", () => {
  assert.deepEqual(validarAnuncio(valido), {});
});

test("título com menos de 3 caracteres (após trim) é rejeitado", () => {
  assert.ok(validarAnuncio({ ...valido, titulo: "  So " }).titulo);
});

test("descrição curta é rejeitada", () => {
  assert.ok(validarAnuncio({ ...valido, descricao: "Sofá" }).descricao);
});

test("categoria fora da lista fixa é rejeitada", () => {
  assert.ok(validarAnuncio({ ...valido, categoria: "CARROS" }).categoria);
  assert.ok(validarAnuncio({ ...valido, categoria: "" }).categoria);
});

test("bairro e cidade são obrigatórios", () => {
  const erros = validarAnuncio({ ...valido, bairro: " ", cidade: "" });
  assert.ok(erros.bairro);
  assert.ok(erros.cidade);
});

test("RN03: aceita de 1 a 5 fotos", () => {
  assert.equal(validarFotos([foto]), undefined);
  assert.equal(validarFotos(Array(5).fill(foto)), undefined);
  assert.ok(validarFotos([]));
  assert.ok(validarFotos(Array(6).fill(foto)));
});

test("RN03: aceita apenas JPG, PNG e WebP", () => {
  assert.equal(validarFotos([{ ...foto, type: "image/png" }, { ...foto, type: "image/webp" }]), undefined);
  assert.ok(validarFotos([{ ...foto, type: "image/gif" }]));
  assert.ok(validarFotos([{ ...foto, type: "application/pdf" }]));
});

test("RN03: rejeita foto acima de 5 MB", () => {
  assert.equal(validarFotos([{ ...foto, size: FOTO_TAMANHO_MAXIMO }]), undefined);
  assert.ok(validarFotos([{ ...foto, size: FOTO_TAMANHO_MAXIMO + 1 }]));
});

test("só aceita fotos da pasta do próprio doador", () => {
  assert.ok(caminhosDeFotosValidos([`${USUARIO}/a.jpg`, `${USUARIO}/b.png`], USUARIO));
  assert.ok(!caminhosDeFotosValidos([`outro-usuario/a.jpg`], USUARIO));
  assert.ok(!caminhosDeFotosValidos([`${USUARIO}/../outro/a.jpg`], USUARIO));
  assert.ok(!caminhosDeFotosValidos([], USUARIO));
});
