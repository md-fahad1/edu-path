'use client';
import { useEffect, useState } from 'react';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';
import { btnClass } from './ui';

export function ShareButtons({ url, text, title, className }: { url: string; text: string; title?: string; className?: string }) {
  const [canNative, setCanNative] = useState(false);
  useEffect(() => { setCanNative(typeof navigator !== 'undefined' && typeof navigator.share === 'function'); }, []);

  const enc = encodeURIComponent;
  const wa = `https://wa.me/?text=${enc(`${text}\n${url}`)}`;
  const fb = `https://www.facebook.com/sharer/sharer.php?u=${enc(url)}`;

  async function copy() {
    try { await navigator.clipboard.writeText(url); toast.success('লিংক কপি হয়েছে'); }
    catch { toast.error('কপি করা যায়নি, লিংকটি নিজে কপি করুন'); }
  }
  async function nativeShare() {
    try { await navigator.share({ title, text, url }); } catch { /* user cancel korle kichu na */ }
  }

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      <a href={wa} target="_blank" rel="noopener noreferrer" className={btnClass('outline', 'sm')}>🟢 WhatsApp</a>
      <a href={fb} target="_blank" rel="noopener noreferrer" className={btnClass('outline', 'sm')}>🔵 Facebook</a>
      <button type="button" onClick={copy} className={btnClass('outline', 'sm')}>🔗 লিংক কপি</button>
      {canNative && <button type="button" onClick={nativeShare} className={btnClass('ghost', 'sm')}>↗ আরও</button>}
    </div>
  );
}