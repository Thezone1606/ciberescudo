import type { NextConfig } from "next";

const backend = process.env.BACKEND_URL ?? "http://localhost:4000";

const nextConfig: NextConfig = {
  // Imagen de producción mínima: el servidor se empaqueta con solo lo que usa.
  output: "standalone",
  poweredByHeader: false, // no anunciar el framework
  cacheComponents: true,
  partialPrefetching: true,
  // La app es un cliente protegido por sesión: la validación automática de navegación
  // instantánea no aplica, así que solo se valida lo que pida `instant` de forma explícita.
  experimental: { instantInsights: { validationLevel: "manual-warning" } },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  // La API del backend se sirve bajo el mismo origen: sin CORS y con cookies del BFF.
  async rewrites() {
    return [{ source: "/api/v1/:path*", destination: `${backend}/api/v1/:path*` }];
  },
};

export default nextConfig;
