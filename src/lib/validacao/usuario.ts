// Validações do cadastro e do login (RF01, RF02, RN05).
// Funções puras, sem dependências, para serem reutilizadas nas Server Actions
// e testadas isoladamente (npm run test:unidade).

export const SENHA_TAMANHO_MINIMO = 8;

export type ErrosCampos = Partial<Record<"nome" | "email" | "senha" | "confirmacao", string>>;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validarCadastro(dados: {
  nome: string;
  email: string;
  senha: string;
  confirmacao: string;
}): ErrosCampos {
  const erros: ErrosCampos = {};
  const nome = dados.nome.trim();

  if (nome.length < 2 || nome.length > 80) {
    erros.nome = "Informe um nome entre 2 e 80 caracteres.";
  }
  if (!EMAIL_REGEX.test(dados.email.trim())) {
    erros.email = "Informe um e-mail válido.";
  }
  if (dados.senha.length < SENHA_TAMANHO_MINIMO) {
    erros.senha = `A senha deve ter no mínimo ${SENHA_TAMANHO_MINIMO} caracteres.`;
  }
  if (dados.confirmacao !== dados.senha) {
    erros.confirmacao = "As senhas não conferem.";
  }

  return erros;
}

export function validarLogin(dados: { email: string; senha: string }): ErrosCampos {
  const erros: ErrosCampos = {};

  if (!EMAIL_REGEX.test(dados.email.trim())) {
    erros.email = "Informe um e-mail válido.";
  }
  if (dados.senha.length === 0) {
    erros.senha = "Informe a senha.";
  }

  return erros;
}

// Aceita apenas caminhos internos para evitar redirecionamento aberto
// após o login (ex.: ?next=https://site-malicioso.com).
export function destinoSeguro(destino: string | null | undefined): string {
  if (!destino || !destino.startsWith("/") || destino.startsWith("//")) {
    return "/";
  }
  return destino;
}
