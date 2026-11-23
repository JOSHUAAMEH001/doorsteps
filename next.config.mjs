/** @type {import('next').NextConfig} */
const supabaseUrl = process.env.APP_SUPABASE_URL ?? process.env.NEXT_PUBLIC_APP_SUPABASE_URL
const supabaseOrigin = supabaseUrl ? new URL(supabaseUrl) : null

const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: supabaseOrigin
      ? [{
          protocol: supabaseOrigin.protocol.replace(":", ""),
          hostname: supabaseOrigin.hostname,
          pathname: "/**",
        }]
      : [],
  },
  // The service worker must always be re-checked so updates reach installed phones quickly.
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
    ]
  },
}

export default nextConfig
