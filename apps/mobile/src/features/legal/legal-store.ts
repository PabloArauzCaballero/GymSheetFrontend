import { create } from 'zustand';
import { setLegalAcceptanceRequiredHandler } from '@/api/client';

/**
 * Whether the API has blocked the session until the current legal documents
 * are accepted. Set by the API client on any 428; cleared once nothing is
 * pending (or on logout, when the next account starts clean).
 */
interface LegalGateState {
  required: boolean;
  markRequired: () => void;
  clear: () => void;
}

export const useLegalGateStore = create<LegalGateState>((set) => ({
  required: false,
  markRequired: () => set({ required: true }),
  clear: () => set({ required: false }),
}));

setLegalAcceptanceRequiredHandler(() => {
  if (!useLegalGateStore.getState().required) useLegalGateStore.getState().markRequired();
});
