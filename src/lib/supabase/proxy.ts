import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Rotas que exigem usuário autenticado.
const ROTAS_PROTEGIDAS = ["/perfil", "/anuncios/novo", "/meus-anuncios", "/chats"];

// Renova o token de sessão do Supabase a cada requisição e redireciona
// visitantes não autenticados que tentam acessar rotas protegidas.
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const { data } = await supabase.auth.getClaims();
  const usuario = data?.claims;

  const { pathname } = request.nextUrl;
  const protegida = ROTAS_PROTEGIDAS.some((rota) => pathname.startsWith(rota));

  if (!usuario && protegida) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return response;
}
