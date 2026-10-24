import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { FormularioCadastro } from "./formulario-cadastro";
import { obterUsuarioAtual } from "@/lib/supabase/usuario-atual";

export const metadata: Metadata = { title: "Criar conta | DoaLocal" };

export default function CadastroPage() {
  return (
    <section className="mx-auto w-full max-w-sm flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Criar conta</h1>
        <p className="text-sm text-zinc-600">Cadastre-se para doar itens ou receber doações.</p>
      </div>
      <Suspense fallback={<div className="h-80 rounded-md bg-zinc-100" aria-hidden />}>
        <ConteudoCadastro />
      </Suspense>
      <p className="text-sm text-zinc-600">
        Já tem conta?{" "}
        <Link href="/login" className="font-medium text-emerald-700 hover:underline">
          Entrar
        </Link>
      </p>
    </section>
  );
}

async function ConteudoCadastro() {
  if (await obterUsuarioAtual()) {
    redirect("/");
  }
  return <FormularioCadastro />;
}
