/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  transpilePackages: ['@mantys/types'],
  experimental: {
    staleTimes: {
      dynamic: 0,
    },
  },
}

export default nextConfig
