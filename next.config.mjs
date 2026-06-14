/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    // Keep native-only deps of @xenova/transformers out of the browser/worker
    // bundle; on-device ASR uses the WASM backend + self-hosted models (public/models).
    config.resolve.alias = {
      ...config.resolve.alias,
      sharp$: false,
      'onnxruntime-node$': false
    };
    return config;
  }
};

export default nextConfig;
