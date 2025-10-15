/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    eslint: {
      // Don't fail the Vercel build on ESLint errors.
      ignoreDuringBuilds: true,
    },
  };
  export default nextConfig;
  