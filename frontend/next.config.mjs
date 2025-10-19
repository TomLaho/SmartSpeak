const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";

/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${API}/:path*`,
      },
    ];
  },
};

export default nextConfig;
