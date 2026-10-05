import type { Metadata } from 'next';
import { DashboardClient } from './DashboardClient';

export const metadata: Metadata = { title: 'আমার ড্যাশবোর্ড', robots: { index: false, follow: false } };
export default function Page() { return <DashboardClient />; }
