/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverActions: {
      allowedOrigins: [process.env.APP_URL || 'http://localhost:3000']
    }
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
      { protocol: 'http', hostname: '**' }
    ]
  },
  webpack: (config) => {
    // Keep native-only deps of @xenova/transformers out of the browser/worker
    // bundle; on-device ASR uses the WASM backend + remote (cached) models.
    config.resolve.alias = {
      ...config.resolve.alias,
      sharp$: false,
      'onnxruntime-node$': false
    };
    return config;
  }
};

export default nextConfig;
