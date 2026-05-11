/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['pdf-parse', 'mammoth'],
  },
  images: {
    domains: ['your-project.supabase.co'],
  },
}

export default nextConfig
