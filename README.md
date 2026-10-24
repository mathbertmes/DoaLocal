# DoaLocal

Plataforma web comunitária para doação de itens em bom estado (móveis, eletrodomésticos, vestuário e utilidades domésticas) entre moradores da mesma região. O doador publica o item com fotos, o interessado manifesta interesse e os dois combinam a retirada por um chat interno, sem nenhuma transação financeira.

Projeto da disciplina **Engenharia de Software II** — UNIVALI, Ciência da Computação.
Autor: Matheus Souza Bertemes.

## Tecnologias

| Camada | Tecnologia |
|---|---|
| Interface e servidor | [Next.js 16](https://nextjs.org) (App Router, Server Components, Server Actions) com TypeScript |
| Estilo | Tailwind CSS 4 |
| Autenticação | Supabase Auth (e-mail e senha) |
| Banco de dados | Supabase (PostgreSQL) com Row Level Security |
| Imagens | Supabase Storage |
| Tempo real (chat) | Supabase Realtime |
| Hospedagem | Vercel |

## Estrutura de pastas

```
doalocal/
├── public/                 # Arquivos estáticos
├── src/
│   ├── app/                # Rotas (App Router): páginas, layouts e Server Actions
│   ├── components/         # Componentes React reutilizáveis
│   ├── lib/
│   │   └── supabase/       # Clientes Supabase (navegador, servidor e proxy de sessão)
│   └── proxy.ts            # Renovação de sessão e proteção de rotas
├── supabase/
│   └── migrations/         # Scripts SQL versionados (tabelas e políticas RLS)
├── .env.example            # Modelo das variáveis de ambiente
└── README.md
```

## Como executar localmente

Pré-requisitos: Node.js 20 ou superior e uma conta gratuita no [Supabase](https://supabase.com).

1. Clone o repositório e instale as dependências:

   ```bash
   git clone https://github.com/mathbertmes/doalocal.git
   cd doalocal
   npm install
   ```

2. Crie um projeto no Supabase e aplique os scripts de `supabase/migrations/`, em ordem, pelo **SQL Editor** do painel.

3. Copie `.env.example` para `.env.local` e preencha a URL e a chave publicável do projeto (Project Settings → API Keys).

4. Inicie o servidor de desenvolvimento:

   ```bash
   npm run dev
   ```

   Acesse <http://localhost:3000>.

## Scripts

| Comando | Descrição |
|---|---|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Build de produção |
| `npm run start` | Executa o build de produção |
| `npm run lint` | Verificação estática com ESLint |
| `npm run test:banco` | Testes das migrações, políticas RLS e regras de negócio em um PostgreSQL embarcado (PGlite) |

## Fluxo de trabalho

- **Branches (GitHub Flow):** a `main` é sempre estável. Cada item do backlog é desenvolvido em `feature/<ID>-descricao` (ex.: `feature/US01-autenticacao`) e integrado por Pull Request.
- **Commits:** padrão [Conventional Commits](https://www.conventionalcommits.org/pt-br/) (`feat:`, `fix:`, `docs:`, `chore:`, `refactor:`), citando o ID do item do backlog.
- **Quadro de tarefas:** ClickUp, com os IDs (US/TS/DOC) idênticos aos usados nas branches e PRs.
- **Versões:** uma tag por sprint concluída, seguindo versionamento semântico (`v0.1.0`, `v0.2.0`, ...).
