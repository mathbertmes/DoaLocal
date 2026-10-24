import { Suspense } from "react";
import Link from "next/link";
import { obterUsuarioAtual } from "@/lib/supabase/usuario-atual";
import { sair } from "@/app/(auth)/actions";

// O logotipo faz parte do shell estático; a área do usuário lê a sessão
// (cookies) e por isso é carregada por streaming dentro do Suspense.
export function Cabecalho() {
  return (
    <header className="border-b border-zinc-200 bg-white">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
        <Link href="/" className="font-semibold text-emerald-700 text-lg">
          DoaLocal
        </Link>
        <Suspense fallback={<div className="h-8 w-32 rounded-md bg-zinc-100" aria-hidden />}>
          <MenuUsuario />
        </Suspense>
      </div>
    </header>
  );
}

async function MenuUsuario() {
  const usuario = await obterUsuarioAtual();

  return (
    <nav className="flex items-center gap-3 text-sm">
      {usuario ? (
        <>
          <Link href="/perfil" className="text-zinc-700 hover:text-emerald-700">
            Olá, {usuario.nome.split(" ")[0]}
          </Link>
          <form action={sair}>
            <button type="submit" className="text-zinc-500 hover:text-zinc-900">
              Sair
            </button>
          </form>
        </>
      ) : (
        <>
          <Link href="/login" className="text-zinc-700 hover:text-emerald-700">
            Entrar
          </Link>
          <Link
            href="/cadastro"
            className="rounded-md bg-emerald-700 px-3 py-1.5 font-medium text-white hover:bg-emerald-800"
          >
            Criar conta
          </Link>
        </>
      )}
    </nav>
  );
}
