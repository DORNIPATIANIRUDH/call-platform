/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    '@call-platform/db',
    '@call-platform/types',
    '@call-platform/queue',
    '@call-platform/storage',
    '@call-platform/integrations',
  ],
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.googleusercontent.com' },
      { protocol: 'https', hostname: '**.githubusercontent.com' },
    ],
  },
}

module.exports = nextConfig
