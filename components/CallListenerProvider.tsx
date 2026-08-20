'use client';

/**
 * CallListenerProvider
 *
 * Mounts once at the root layout level.
 * Feeds the current user's identity into callService → which subscribes to
 * their personal Supabase Broadcast channel and shows the CallModal on any
 * incoming call, from any page in the app.
 */

import { useEffect } from 'react';
import { useAuth } from '../lib/authContext';
import { callService } from '../lib/services/callService';
import { CallModal } from './CallModal';

export function CallListenerProvider({ children }: { children: React.ReactNode }) {
  const { account, user, profile } = useAuth();

  useEffect(() => {
    const primaryId = user?.id || account || user?.walletAddress;
    if (!primaryId) return;

    const displayName =
      profile?.displayName || profile?.username || 'Pulse Member';
    const avatarUrl = profile?.avatarUrl || '';

    const aliases = [
      account,
      user?.id,
      user?.walletAddress,
      profile?.username,
    ].filter(Boolean) as string[];

    // Register identity so callService can listen on all user alias channels
    callService.setIdentity(primaryId, displayName, avatarUrl, aliases);
  }, [account, user?.id, user?.walletAddress, profile?.displayName, profile?.username, profile?.avatarUrl]);

  return (
    <>
      {/* Global WebRTC Call UI overlay — visible from any page */}
      <CallModal />
      {children}
    </>
  );
}
