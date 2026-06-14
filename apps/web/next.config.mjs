/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  transpilePackages: ['@mantys/types'],
  eslint: { ignoreDuringBuilds: true },
  experimental: {
    staleTimes: {
      dynamic: 0,
    },
  },
}

export default nextConfig
