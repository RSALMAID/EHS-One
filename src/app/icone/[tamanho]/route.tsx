import { ImageResponse } from "next/og";

// Ícone do app (PWA), desenhado na hora: quadrado verde com "EHS".
export async function GET(_req: Request, { params }: { params: Promise<{ tamanho: string }> }) {
  const { tamanho } = await params;
  const lado = tamanho === "512" ? 512 : 192;
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#047857",
          color: "white",
          fontSize: lado * 0.3,
          fontWeight: 700,
          letterSpacing: -lado * 0.01,
        }}
      >
        EHS
      </div>
    ),
    { width: lado, height: lado, headers: { "Cache-Control": "public, max-age=86400" } },
  );
}
