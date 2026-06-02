import type { MetadataRoute } from 'next';
import { siteConfig } from '@/lib/site';

/**
 * PWA manifest.
 *
 * Tuned for an installable, Play-Store-ready experience (via a Trusted Web
 * Activity / PWABuilder package): a maskable icon with a safe zone for Android
 * adaptive icons, app shortcuts, and productivity/education categories.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/train',
    name: `${siteConfig.name} — Presentation Coach`,
    short_name: siteConfig.name,
    description: siteConfig.description,
    start_url: '/train',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    lang: 'en',
    dir: 'ltr',
    background_color: '#0b1020',
    theme_color: '#0b1020',
    categories: ['productivity', 'education', 'business'],
    icons: [
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
      { src: '/icon-maskable.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' },
    ],
    shortcuts: [
      {
        name: 'Start a session',
        short_name: 'Practice',
        description: 'Jump into your daily presentation rep',
        url: '/train',
      },
      {
        name: 'My progress',
        short_name: 'Progress',
        description: 'See your streak, XP and recent takes',
        url: '/train/progress',
      },
    ],
  };
}
