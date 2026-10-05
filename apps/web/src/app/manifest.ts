import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'শিক্ষাপথ – MCQ প্রস্তুতি', short_name: 'শিক্ষাপথ', description: 'HSC, BCS ও ভর্তি পরীক্ষার MCQ প্রস্তুতি',
    start_url: '/', display: 'standalone', background_color: '#f7f8fb', theme_color: '#1f55dc', lang: 'bn',
    icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
  };
}
