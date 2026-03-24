/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_VM_API_URL: process.env.NEXT_PUBLIC_VM_API_URL,
    NEXT_PUBLIC_VM_API_KEY: process.env.NEXT_PUBLIC_VM_API_KEY,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
  },
}

module.exports = nextConfig
