"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  destinoSeguro,
  validarCadastro,
  validarLogin,
  type ErrosCampos,
} from "@/lib/validacao/usuario";

export type EstadoFormulario = {
  erros?: ErrosCampos;
  mensagem?: string;
  valores?: { nome?: string; email?: string };
};

const texto = (formData: FormData, campo: string) => String(formData.get(campo) ?? "");

// RF01 — cadastro com nome, e-mail e senha. O hash da senha é feito pelo
// Supabase Auth (RNF02); o perfil é criado pelo gatilho do banco.
export async function cadastrar(
  _estado: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  const dados = {
    nome: texto(formData, "nome"),
    email: texto(formData, "email").trim().toLowerCase(),
    senha: texto(formData, "senha"),
    confirmacao: texto(formData, "confirmacao"),
  };
  const valores = { nome: dados.nome, email: dados.email };

  const erros = validarCadastro(dados);
  if (Object.keys(erros).length > 0) {
    return { erros, valores };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: dados.email,
    password: dados.senha,
    options: { data: { nome: dados.nome.trim() } },
  });

  if (error) {
    // RN05: e-mail único.
    if (error.code === "user_already_exists") {
      return { erros: { email: "Este e-mail já está cadastrado." }, valores };
    }
    if (error.code === "email_address_invalid") {
      return { erros: { email: "Este e-mail não é aceito. Verifique o endereço." }, valores };
    }
    if (error.code === "over_email_send_rate_limit") {
      return { mensagem: "Muitas tentativas de cadastro. Aguarde alguns minutos e tente novamente.", valores };
    }
    if (error.code === "weak_password") {
      return { erros: { senha: "Senha fraca. Use ao menos 8 caracteres." }, valores };
    }
    return { mensagem: "Não foi possível concluir o cadastro. Tente novamente.", valores };
  }

  // Se a confirmação de e-mail estiver ativa no Supabase, não há sessão ainda.
  if (!data.session) {
    return { mensagem: "Cadastro realizado! Confirme seu e-mail para entrar.", valores };
  }

  revalidatePath("/", "layout");
  redirect("/");
}

// RF02 — login com e-mail e senha.
export async function entrar(
  _estado: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  const dados = {
    email: texto(formData, "email").trim().toLowerCase(),
    senha: texto(formData, "senha"),
  };
  const valores = { email: dados.email };

  const erros = validarLogin(dados);
  if (Object.keys(erros).length > 0) {
    return { erros, valores };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: dados.email,
    password: dados.senha,
  });

  if (error) {
    return { mensagem: "E-mail ou senha incorretos.", valores };
  }

  revalidatePath("/", "layout");
  redirect(destinoSeguro(texto(formData, "next")));
}

// RF02 — logout.
export async function sair() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
