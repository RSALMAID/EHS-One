import type { MetadataRoute } from "next";

// Permite instalar o Meu EHS na tela inicial do celular (PWA).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "EHS One · Meu EHS",
    short_name: "Meu EHS",
    description: "Seus EPIs, treinamentos e saúde ocupacional no celular.",
    start_url: "/meu",
    scope: "/",
    display: "standalone",
    background_color: "#f8fafc",
    theme_color: "#047857",
    lang: "pt-BR",
    icons: [
      { src: "/icone/192", sizes: "192x192", type: "image/png" },
      { src: "/icone/512", sizes: "512x512", type: "image/png" },
      { src: "/icone/512", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
