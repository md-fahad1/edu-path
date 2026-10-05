import type { Metadata } from 'next';
import { OnboardingClient } from './OnboardingClient';

export const metadata: Metadata = { title: 'প্রস্তুতি সাজান', robots: { index: false, follow: false } };
export default function Page() { return <OnboardingClient />; }