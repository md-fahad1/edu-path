import type { Metadata } from 'next';
import { NotebookClient } from './NotebookClient';

export const metadata: Metadata = { title: 'আমার ভুলের নোটবুক', robots: { index: false, follow: false } };
export default function Page() { return <NotebookClient />; }