/**
 * IziSolo · cn() helper
 * src/lib/cn.ts
 *
 * Merge Tailwind classes correctement (gère les conflits).
 * Standard shadcn — installe les deps : `npm i clsx tailwind-merge`
 */
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
