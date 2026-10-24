// Testes unitários das validações de cadastro e login (RF01, RF02, RN05).
// Uso: npm run test:unidade
import { test } from "node:test";
import assert from "node:assert/strict";
import { validarCadastro, validarLogin, destinoSeguro } from "../../src/lib/validacao/usuario.ts";

const valido = { nome: "Ana Souza", email: "ana@teste.com", senha: "12345678", confirmacao: "12345678" };

test("cadastro válido não retorna erros", () => {
  assert.deepEqual(validarCadastro(valido), {});
});

test("RN05: senha com menos de 8 caracteres é rejeitada", () => {
  const erros = validarCadastro({ ...valido, senha: "1234567", confirmacao: "1234567" });
  assert.ok(erros.senha);
});

test("confirmação de senha diferente é rejeitada", () => {
  assert.ok(validarCadastro({ ...valido, confirmacao: "outra-senha" }).confirmacao);
});

test("e-mail inválido é rejeitado", () => {
  assert.ok(validarCadastro({ ...valido, email: "ana@" }).email);
  assert.ok(validarLogin({ email: "sem-arroba", senha: "x" }).email);
});

test("nome com menos de 2 caracteres (após trim) é rejeitado", () => {
  assert.ok(validarCadastro({ ...valido, nome: "  A " }).nome);
});

test("login exige senha preenchida", () => {
  assert.ok(validarLogin({ email: "ana@teste.com", senha: "" }).senha);
});

test("destino após login aceita apenas caminhos internos", () => {
  assert.equal(destinoSeguro("/perfil"), "/perfil");
  assert.equal(destinoSeguro("https://malicioso.com"), "/");
  assert.equal(destinoSeguro("//malicioso.com"), "/");
  assert.equal(destinoSeguro(null), "/");
});
