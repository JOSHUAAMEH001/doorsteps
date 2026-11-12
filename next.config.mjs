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
}

export default nextConfig
