"use client";

import { useActionState } from "react";
import { entrar, type EstadoFormulario } from "../actions";
import { Campo } from "@/components/campo";

const estadoInicial: EstadoFormulario = {};

export function FormularioLogin({ destino }: { destino?: string }) {
  const [estado, acao, enviando] = useActionState(entrar, estadoInicial);

  return (
    <form action={acao} className="flex flex-col gap-4" noValidate>
      <input type="hidden" name="next" value={destino ?? "/"} />
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
        rotulo="Senha"
        name="senha"
        type="password"
        autoComplete="current-password"
        required
        erro={estado.erros?.senha}
      />

      {estado.mensagem && (
        <p aria-live="polite" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {estado.mensagem}
        </p>
      )}

      <button
        type="submit"
        disabled={enviando}
        className="h-10 rounded-md bg-emerald-700 font-medium text-white hover:bg-emerald-800 disabled:opacity-60"
      >
        {enviando ? "Entrando..." : "Entrar"}
      </button>
    </form>
  );
}
