/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    turbo: {
      root: process.cwd()
    }
  },
  outputFileTracingRoot: process.cwd()
}

export default nextConfig