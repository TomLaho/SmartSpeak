/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Pure static export: the whole app is client-rendered with on-device ASR and
  // localStorage — there is no server runtime. This emits `out/` (plain HTML/JS/
  // WASM) that can be hosted free, commercially, on any static host (Cloudflare
  // Pages, Netlify, etc.). Security headers can't be set from here in export mode,
  // so they live in `public/_headers` (Cloudflare/Netlify) and `vercel.json`.
  output: 'export',
  images: { unoptimized: true },
  webpack: (config) => {
    // Keep native-only deps of @xenova/transformers out of the browser/worker
    // bundle; on-device ASR uses the WASM backend + self-hosted models (public/models).
    config.resolve.alias = {
      ...config.resolve.alias,
      sharp$: false,
      'onnxruntime-node$': false
    };
    return config;
  },
};

export default nextConfig;
