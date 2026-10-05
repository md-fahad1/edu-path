import type { Metadata } from 'next';
import { BookmarksClient } from './BookmarksClient';

export const metadata: Metadata = { title: 'আমার বুকমার্ক', robots: { index: false, follow: false } };
export default function Page() { return <BookmarksClient />; }
