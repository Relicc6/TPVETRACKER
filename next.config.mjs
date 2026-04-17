/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'assets.tarkov.dev' },
      { protocol: 'https', hostname: '*.tarkov.dev' },
    ],
  },
}

export default nextConfig
