import Link from 'next/link';
import { SITE } from '@/lib/utils';

export function Breadcrumb({ items }: { items: { name: string; href?: string }[] }) {
  const all = [{ name: 'হোম', href: '/' }, ...items];
  const ld = {
    '@context': 'https://schema.org', '@type': 'BreadcrumbList',
    itemListElement: all.map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it.name, ...(it.href ? { item: SITE + it.href } : {}) })),
  };
  return (
    <nav aria-label="Breadcrumb" className="mb-4 text-sm text-slate-500">
      <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
        {all.map((it, i) => (
          <li key={i} className="flex items-center gap-1.5">
            {i > 0 && <span aria-hidden>›</span>}
            {it.href && i < all.length - 1 ? <Link href={it.href} className="hover:text-brand-600 hover:underline">{it.name}</Link> : <span className="text-slate-800">{it.name}</span>}
          </li>
        ))}
      </ol>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
    </nav>
  );
}
