
/**@type {import('next').NextConfig} */
const isProd = process.env.NODE_ENV === "production";
const nextConfig = {
  // Static export for production only — dev allows dynamic legacy /active-leads/[id]/ redirects.
  output: isProd ? "export" : undefined,
  // Pin the workspace root to this project — a stray package-lock.json in the
  // home dir was making the bundler watch/resolve across all of C:\Users\INTEL.
  turbopack: { root: __dirname },
  reactStrictMode: true,
  trailingSlash: true,
basePath: "",
	assetPrefix : "",
  images: {
    loader: "imgix",
    path: "/",
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  // Dev-only: static export does not support next.config redirects.
  ...(!isProd
    ? {
        async redirects() {
          return [
            { source: "/register", destination: "/", permanent: false },
            { source: "/register/", destination: "/", permanent: false },
          ];
        },
      }
    : {}),
};

module.exports = nextConfig;
