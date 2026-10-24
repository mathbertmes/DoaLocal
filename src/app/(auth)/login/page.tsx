import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { FormularioLogin } from "./formulario-login";
import { obterUsuarioAtual } from "@/lib/supabase/usuario-atual";
import { destinoSeguro } from "@/lib/validacao/usuario";

export const metadata: Metadata = { title: "Entrar | DoaLocal" };

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <section className="mx-auto w-full max-w-sm flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Entrar</h1>
        <p className="text-sm text-zinc-600">Acesse sua conta para doar ou demonstrar interesse.</p>
      </div>
      <Suspense fallback={<div className="h-56 rounded-md bg-zinc-100" aria-hidden />}>
        <ConteudoLogin searchParams={searchParams} />
      </Suspense>
      <p className="text-sm text-zinc-600">
        Ainda não tem conta?{" "}
        <Link href="/cadastro" className="font-medium text-emerald-700 hover:underline">
          Cadastre-se
        </Link>
      </p>
    </section>
  );
}

async function ConteudoLogin({ searchParams }: Pick<PageProps<"/login">, "searchParams">) {
  const { next } = await searchParams;
  const destino = destinoSeguro(typeof next === "string" ? next : undefined);

  // Usuário já autenticado não precisa ver o formulário.
  if (await obterUsuarioAtual()) {
    redirect(destino);
  }

  return <FormularioLogin destino={destino} />;
}
