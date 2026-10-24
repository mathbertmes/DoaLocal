import { connection } from "next/server";
import { createClient } from "./server";

export type UsuarioAtual = { id: string; email: string; nome: string };

// Retorna o usuário autenticado (validando o JWT) com o nome do perfil,
// ou null para visitantes.
export async function obterUsuarioAtual(): Promise<UsuarioAtual | null> {
  // A validação do token compara a expiração com a hora atual (Date.now),
  // então a leitura precisa acontecer no momento da requisição, e não no
  // pré-render (exigência do Cache Components do Next.js 16).
  await connection();
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims) return null;

  const { data: perfil } = await supabase
    .from("perfis")
    .select("nome")
    .eq("id", claims.sub)
    .maybeSingle();

  return {
    id: claims.sub,
    email: String(claims.email ?? ""),
    nome: perfil?.nome ?? "Usuário",
  };
}
