import { LinkButton } from '@/components/ui';

export default function NotFound() {
  return (
    <div className="py-20 text-center">
      <p className="text-6xl font-bold text-brand-600">৪০৪</p>
      <h1 className="mt-3 text-2xl font-bold">পেজটি খুঁজে পাওয়া যায়নি</h1>
      <p className="mt-1 text-slate-600">লিংকটি ভুল হতে পারে বা পেজটি সরানো হয়েছে।</p>
      <div className="mt-6 flex justify-center gap-3"><LinkButton href="/">হোমে ফিরুন</LinkButton><LinkButton href="/practice" variant="outline">প্র্যাকটিস করুন</LinkButton></div>
    </div>
  );
}
