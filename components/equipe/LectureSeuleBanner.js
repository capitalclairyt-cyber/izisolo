'use client';

import { Eye } from 'lucide-react';
import { useMembre } from '@/components/studio/StudioProvider';

/**
 * « Lecture seule » (lot 1 Associations & Studios, §6.8) : la structure qui
 * t'a invitée n'a plus le plan qui permet de travailler à plusieurs. Tu
 * entres, tu lis, tu ne modifies rien ; ta place est gardée. Personne n'est
 * révoqué en silence, et rien n'est à faire de ton côté.
 */
export default function LectureSeuleBanner() {
  const membre = useMembre();
  if (!membre?.lecture_seule) return null;
  return (
    <div className="acc-banner acc-banner--lecture" data-testid="bandeau-lecture-seule">
      <Eye size={16} className="acc-icon" />
      <div className="acc-text">
        <strong>Lecture seule.</strong> Ce studio n&apos;a plus l&apos;abonnement qui permet de travailler à plusieurs :
        tu vois tout, tu ne peux rien modifier. Ta place est gardée, tout revient dès que l&apos;abonnement reprend.
        Préviens simplement la personne qui gère le studio.
      </div>
      <style jsx global>{`
        .acc-banner--lecture { background: #eff6ff; border: 1px solid #93c5fd; border-left: 4px solid #2563eb; color: #1e40af; display: flex; align-items: center; gap: 10px; padding: 10px 14px; border-radius: 8px; margin-bottom: 12px; font-size: .875rem; line-height: 1.4; }
      `}</style>
    </div>
  );
}
