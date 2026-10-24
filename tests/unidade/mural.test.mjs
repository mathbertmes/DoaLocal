// Testes unitários das regras do mural (RF04, RF05).
// Uso: npm run test:unidade
import { test } from "node:test";
import assert from "node:assert/strict";
import { lerFiltros, padraoBusca, bairrosDisponiveis, rotuloCategoria } from "../../src/lib/mural.ts";

test("sem parâmetros, o mural não aplica filtros", () => {
  assert.deepEqual(lerFiltros({}), { busca: "", categoria: "", bairro: "" });
});

test("lê busca, categoria e bairro da URL, sem espaços nas pontas", () => {
  assert.deepEqual(lerFiltros({ q: "  sofá ", categoria: "MOVEIS", bairro: " Centro " }), {
    busca: "sofá",
    categoria: "MOVEIS",
    bairro: "Centro",
  });
});

test("categoria fora da lista fixa é ignorada", () => {
  assert.equal(lerFiltros({ categoria: "CARROS" }).categoria, "");
});

test("parâmetro repetido usa só o primeiro valor", () => {
  assert.equal(lerFiltros({ q: ["mesa", "cadeira"] }).busca, "mesa");
});

test("busca muito longa é cortada em 100 caracteres", () => {
  assert.equal(lerFiltros({ q: "a".repeat(500) }).busca.length, 100);
});

test("a busca procura o termo em qualquer parte do título", () => {
  assert.equal(padraoBusca("mesa"), "%mesa%");
});

test("% e _ digitados são tratados como texto, não como curinga", () => {
  assert.equal(padraoBusca("50%_off"), "%50\\%\\_off%");
});

test("bairros aparecem uma vez só, em ordem alfabética", () => {
  assert.deepEqual(bairrosDisponiveis(["Centro", "fazenda", " centro ", "Fazenda", "", "Cordeiros"]), [
    "Centro",
    "Cordeiros",
    "fazenda",
  ]);
});

test("rótulo da categoria em português", () => {
  assert.equal(rotuloCategoria("UTILIDADES_DOMESTICAS"), "Utilidades domésticas");
});
