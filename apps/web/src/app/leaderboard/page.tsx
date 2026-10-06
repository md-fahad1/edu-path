import type { Metadata } from 'next';
import { LeaderboardClient } from './LeaderboardClient';

export const metadata: Metadata = { title: 'সাপ্তাহিক লিডারবোর্ড', description: 'এই সপ্তাহে কারা সবচেয়ে বেশি XP অর্জন করেছেন' };

export default function Page() {
  return <LeaderboardClient />;
}