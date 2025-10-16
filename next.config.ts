/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: { ignoreDuringBuilds: true },
  images: {
    remotePatterns: [
      { protocol: "https", 
        hostname: "db.dvdkogqoljihyjjmcmdy.supabase.co", 
        pathname: "/storage/v1/object/public/images/**" }, // Supabase Storage public URLs
    ],
  },
};
export default nextConfig;
