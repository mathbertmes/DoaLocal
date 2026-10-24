"use client";

import { useActionState } from "react";
import { cadastrar, type EstadoFormulario } from "../actions";
import { Campo } from "@/components/campo";
import { SENHA_TAMANHO_MINIMO } from "@/lib/validacao/usuario";

const estadoInicial: EstadoFormulario = {};

export function FormularioCadastro() {
  const [estado, acao, enviando] = useActionState(cadastrar, estadoInicial);

  return (
    <form action={acao} className="flex flex-col gap-4" noValidate>
      <Campo
        rotulo="Nome"
        name="nome"
        autoComplete="name"
        required
        defaultValue={estado.valores?.nome}
        erro={estado.erros?.nome}
      />
      <Campo
        rotulo="E-mail"
        name="email"
        type="email"
        autoComplete="email"
        required
        defaultValue={estado.valores?.email}
        erro={estado.erros?.email}
      />
      <Campo
        rotulo={`Senha (mínimo ${SENHA_TAMANHO_MINIMO} caracteres)`}
        name="senha"
        type="password"
        autoComplete="new-password"
        minLength={SENHA_TAMANHO_MINIMO}
        required
        erro={estado.erros?.senha}
      />
      <Campo
        rotulo="Confirme a senha"
        name="confirmacao"
        type="password"
        autoComplete="new-password"
        required
        erro={estado.erros?.confirmacao}
      />

      {estado.mensagem && (
        <p aria-live="polite" className="rounded-md bg-zinc-100 px-3 py-2 text-sm text-zinc-700">
          {estado.mensagem}
        </p>
      )}

      <button
        type="submit"
        disabled={enviando}
        className="h-10 rounded-md bg-emerald-700 font-medium text-white hover:bg-emerald-800 disabled:opacity-60"
      >
        {enviando ? "Cadastrando..." : "Criar conta"}
      </button>
    </form>
  );
}
