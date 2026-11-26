import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseEnv, MISSING_ENV_MESSAGE } from "./env";

const PROTECTED = ["/app", "/meu", "/painel", "/onboarding"];

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const path = request.nextUrl.pathname;
  const needsLogin = PROTECTED.some((p) => path === p || path.startsWith(`${p}/`));

  const env = getSupabaseEnv();
  if (!env) {
    // Sem configuração: as páginas públicas continuam abrindo e a área logada
    // mostra a tela de configuração em vez de derrubar o site inteiro.
    console.error(MISSING_ENV_MESSAGE);
    if (needsLogin) {
      const url = request.nextUrl.clone();
      url.pathname = "/configuracao";
      url.search = "";
      return NextResponse.redirect(url);
    }
    return response;
  }

  const supabase = createServerClient(
    env.url,
    env.key,
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

  let user = null;
  try {
    const { data } = await supabase.auth.getUser();
    user = data.user;
  } catch (error) {
    // Supabase fora do ar ou chave errada: trata como não logado.
    console.error("Falha ao consultar o Supabase no middleware:", error);
  }
  if (!user && needsLogin) {
    const url = request.nextUrl.clone();
    url.pathname = "/entrar";
    url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }

  return response;
}
