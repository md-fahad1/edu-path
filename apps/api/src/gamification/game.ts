export const CHALLENGE_SIZE = 10;

/** level n shuru hoy 50*(n-1)^2 XP te */
export function levelOf(xp: number) {
  const x = Math.max(0, xp);
  const level = Math.floor(Math.sqrt(x / 50)) + 1;
  const from = 50 * (level - 1) ** 2;
  const to = 50 * level ** 2;
  return { level, from, to, pct: Math.round(((x - from) / (to - from)) * 100) };
}

export type Metrics = {
  solved: number; streak: number; mastered: number; tests: number;
  challenges: number; perfect: number; level: number;
};

export type BadgeInfo = { code: string; name: string; icon: string };

export const BADGES: (BadgeInfo & { desc: string; ok: (m: Metrics) => boolean })[] = [
  { code: 'solve_10', icon: '🌱', name: 'প্রথম ধাপ', desc: '১০টি প্রশ্ন সমাধান করুন', ok: (m) => m.solved >= 10 },
  { code: 'solve_100', icon: '📚', name: 'শতক', desc: '১০০টি প্রশ্ন সমাধান করুন', ok: (m) => m.solved >= 100 },
  { code: 'solve_500', icon: '🚀', name: 'গতি বাড়ছে', desc: '৫০০টি প্রশ্ন সমাধান করুন', ok: (m) => m.solved >= 500 },
  { code: 'solve_1000', icon: '🏅', name: 'হাজারি', desc: '১০০০টি প্রশ্ন সমাধান করুন', ok: (m) => m.solved >= 1000 },
  { code: 'streak_3', icon: '🔥', name: 'টানা ৩ দিন', desc: 'টানা ৩ দিন প্র্যাকটিস করুন', ok: (m) => m.streak >= 3 },
  { code: 'streak_7', icon: '⚡', name: 'টানা ৭ দিন', desc: 'টানা ৭ দিন প্র্যাকটিস করুন', ok: (m) => m.streak >= 7 },
  { code: 'streak_30', icon: '🏆', name: '৩০ দিনের যোদ্ধা', desc: 'টানা ৩০ দিন প্র্যাকটিস করুন', ok: (m) => m.streak >= 30 },
  { code: 'master_10', icon: '🧠', name: 'ভুল থেকে শিক্ষা', desc: 'নোটবুকের ১০টি ভুল প্রশ্ন আয়ত্ত করুন', ok: (m) => m.mastered >= 10 },
  { code: 'master_50', icon: '🎓', name: 'আয়ত্তের ওস্তাদ', desc: 'নোটবুকের ৫০টি ভুল প্রশ্ন আয়ত্ত করুন', ok: (m) => m.mastered >= 50 },
  { code: 'challenge_1', icon: '🎯', name: 'চ্যালেঞ্জার', desc: 'প্রথম ডেইলি চ্যালেঞ্জ শেষ করুন', ok: (m) => m.challenges >= 1 },
  { code: 'challenge_7', icon: '🗓️', name: 'নিয়মিত চ্যালেঞ্জার', desc: '৭টি ডেইলি চ্যালেঞ্জ শেষ করুন', ok: (m) => m.challenges >= 7 },
  { code: 'challenge_perfect', icon: '💯', name: 'শতভাগ', desc: 'ডেইলি চ্যালেঞ্জের সবগুলো ঠিক করুন', ok: (m) => m.perfect >= 1 },
  { code: 'test_1', icon: '📝', name: 'পরীক্ষার্থী', desc: 'প্রথম মডেল টেস্ট দিন', ok: (m) => m.tests >= 1 },
  { code: 'test_10', icon: '🏁', name: 'টেস্ট যোদ্ধা', desc: '১০টি মডেল টেস্ট দিন', ok: (m) => m.tests >= 10 },
  { code: 'level_5', icon: '⭐', name: 'লেভেল ৫', desc: 'লেভেল ৫-এ পৌঁছান', ok: (m) => m.level >= 5 },
  { code: 'level_10', icon: '🌟', name: 'লেভেল ১০', desc: 'লেভেল ১০-এ পৌঁছান', ok: (m) => m.level >= 10 },
];