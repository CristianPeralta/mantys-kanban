/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@mantys/types'],
  experimental: {
    staleTimes: {
      dynamic: 0,
    },
  },
}

export default nextConfig
