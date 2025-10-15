/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    eslint: { ignoreDuringBuilds: true },
    images: {
      remotePatterns: [
        { protocol: "https", hostname: "*.supabase.co" }, // Supabase Storage public URLs
      ],
    },
  };
  export default nextConfig;
  