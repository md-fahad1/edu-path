import { toast } from './toast';

export type BadgeInfo = { code: string; name: string; icon: string };
export type Game = { xp: number; badges: BadgeInfo[] } | null | undefined;

/** Notun badge paile toast (ekadhik hole ektu pore pore) */
export function announceGame(g: Game) {
  g?.badges?.forEach((b, i) => setTimeout(() => toast.success(`${b.icon} নতুন ব্যাজ পেলেন: ${b.name}`), i * 700));
}