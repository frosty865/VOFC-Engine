/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    turbo: {
      root: process.cwd()
    },
    serverActions: {
      bodySizeLimit: '10mb'
    }
  },
  outputFileTracingRoot: process.cwd()
}

export default nextConfig