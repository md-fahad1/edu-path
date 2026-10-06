import type { Metadata } from 'next';
import { ChallengeClient } from './ChallengeClient';

export const metadata: Metadata = { title: 'ডেইলি চ্যালেঞ্জ', robots: { index: false } };

export default function Page() {
  return <ChallengeClient />;
}