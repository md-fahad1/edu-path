import type { MetadataRoute } from 'next';
import { SITE } from '@/lib/utils';

export default function robots(): MetadataRoute.Robots {
  return { rules: [{ userAgent: '*', allow: '/', disallow: ['/dashboard', '/admin', '/result', '/bookmarks', '/api', '/login', '/register', '/*/take'] }], sitemap: `${SITE}/sitemap.xml` };
}
