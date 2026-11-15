import type { NextConfig } from "next";

// Sur GitHub Pages, le site est servi sous /<nom-du-depot> : le workflow de
// déploiement renseigne NEXT_PUBLIC_BASE_PATH. En local, la variable est vide.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const nextConfig: NextConfig = {
  // Maquette 100 % statique : aucun serveur, tout est généré dans out/.
  output: "export",
  trailingSlash: true,
  basePath,
  images: { unoptimized: true },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
