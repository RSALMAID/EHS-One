import { NextResponse, type NextRequest } from "next/server";
import { ACESSO_COOKIE, caminhoLivre, codigoAcesso, hashCodigo } from "@/lib/acesso";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  const codigo = codigoAcesso();
  const path = request.nextUrl.pathname;
  if (codigo && !caminhoLivre(path)) {
    const cookie = request.cookies.get(ACESSO_COOKIE)?.value;
    if (cookie !== (await hashCodigo(codigo))) {
      const url = request.nextUrl.clone();
      url.pathname = "/acesso";
      url.search = "";
      url.searchParams.set("next", path + request.nextUrl.search);
      return NextResponse.redirect(url);
    }
  }
  return updateSession(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
