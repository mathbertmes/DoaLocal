"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  caminhosDeFotosValidos,
  validarAnuncio,
  type ErrosAnuncio,
} from "@/lib/validacao/anuncio";

export type EstadoAnuncio = {
  erros?: ErrosAnuncio;
  mensagem?: string;
};

const texto = (formData: FormData, campo: string) => String(formData.get(campo) ?? "");

// RF03 — publica o anúncio. As fotos já foram enviadas pelo navegador ao
// Storage (o limite de corpo da requisição não comporta até 5 fotos de 5 MB);
// aqui chegam apenas os caminhos, que são conferidos antes de gravar.
export async function publicarAnuncio(
  _estado: EstadoAnuncio,
  formData: FormData,
): Promise<EstadoAnuncio> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const usuarioId = data?.claims?.sub;
  if (!usuarioId) redirect("/login?next=/anuncios/novo");

  const dados = {
    titulo: texto(formData, "titulo"),
    descricao: texto(formData, "descricao"),
    categoria: texto(formData, "categoria"),
    bairro: texto(formData, "bairro"),
    cidade: texto(formData, "cidade"),
  };
  const fotos = formData.getAll("fotos").map(String);

  const erros = validarAnuncio(dados);
  if (!caminhosDeFotosValidos(fotos, usuarioId)) {
    erros.fotos = "Envie de 1 a 5 fotos.";
  }
  if (Object.keys(erros).length > 0) {
    return { erros };
  }

  // O RLS garante que o doador_id é o do usuário logado e o status inicial
  // é DISPONIVEL; a tabela confere os limites de cada campo (TS01).
  const { error } = await supabase.from("anuncios").insert({
    doador_id: usuarioId,
    titulo: dados.titulo.trim(),
    descricao: dados.descricao.trim(),
    categoria: dados.categoria,
    bairro: dados.bairro.trim(),
    cidade: dados.cidade.trim(),
    fotos,
  });

  if (error) {
    return { mensagem: "Não foi possível publicar o anúncio. Tente novamente." };
  }

  revalidatePath("/");
  redirect("/?publicado=1");
}
