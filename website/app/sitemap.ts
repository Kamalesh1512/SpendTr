import type { MetadataRoute } from 'next';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://spendtr.com';

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = ['', '/privacy', '/terms'];
  return routes.map((route) => ({
    url: `${siteUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: route === '' ? 'weekly' : 'yearly',
    priority: route === '' ? 1 : 0.3,
  }));
}
