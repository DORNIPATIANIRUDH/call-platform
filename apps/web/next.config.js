/** @type {import('next').NextConfig} */
const path = require('path')

const nextConfig = {
  outputFileTracingRoot: path.join(__dirname, '../../'),
  transpilePackages: [
    '@call-platform/db',
    '@call-platform/types',
    '@call-platform/queue',
    '@call-platform/storage',
    '@call-platform/integrations',
  ],
  experimental: {
    serverComponentsExternalPackages: ['@prisma/client', '.prisma/client'],
    outputFileTracingIncludes: {
      '/**': ['../../packages/db/src/generated/client/**/*.node'],
    },
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.googleusercontent.com' },
      { protocol: 'https', hostname: '**.githubusercontent.com' },
    ],
  },
}

module.exports = nextConfig
