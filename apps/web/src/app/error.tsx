'use client';
import { useEffect } from 'react';
import { Button, LinkButton } from '@/components/ui';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  return (
    <div className="py-20 text-center" role="alert">
      <p className="text-5xl" aria-hidden>😕</p>
      <h1 className="mt-3 text-2xl font-bold">কিছু একটা সমস্যা হয়েছে</h1>
      <p className="mt-1 text-slate-600">একটু পরে আবার চেষ্টা করুন। সমস্যা থাকলে আমাদের জানান।</p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Button onClick={reset}>আবার চেষ্টা করুন</Button>
        <LinkButton href="/" variant="outline">হোমে যান</LinkButton>
        <LinkButton href="/contact" variant="ghost">যোগাযোগ</LinkButton>
      </div>
    </div>
  );
}