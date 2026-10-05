'use client';
import { Button } from '@/components/ui';

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="py-20 text-center">
      <h1 className="text-2xl font-bold">কিছু একটা সমস্যা হয়েছে</h1>
      <p className="mt-1 text-slate-600">একটু পরে আবার চেষ্টা করুন।</p>
      <Button className="mt-5" onClick={reset}>আবার চেষ্টা করুন</Button>
    </div>
  );
}
