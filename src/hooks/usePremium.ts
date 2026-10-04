import { useState, useEffect, useCallback } from "react";
import { Capacitor } from "@capacitor/core";
import { revenueCatService } from "@/lib/revenueCat";
import { supabase } from "@/integrations/supabase/client";

const TRIAL_KEY = "soundwave-first-play";
const TRIAL_DAYS = 30;

interface PremiumState {
  loading: boolean;
  isPremium: boolean;
  trialExpired: boolean;
  trialStarted: boolean;
  daysRemaining: number | null;
  purchase: (plan?: "monthly" | "yearly") => Promise<boolean>;
  restore: () => Promise<boolean>;
  startTrial: () => void;
}

// ⚠️ TEST MODE: set to false before App Store release
const TEST_BYPASS_PREMIUM = false;

export const usePremium = (): PremiumState => {
  const [loading, setLoading] = useState(!TEST_BYPASS_PREMIUM);
  const [isPremium, setIsPremium] = useState(TEST_BYPASS_PREMIUM);
  const [trialExpired, setTrialExpired] = useState(false);
  const [trialStarted, setTrialStarted] = useState(false);
  const [daysRemaining, setDaysRemaining] = useState<number | null>(null);

  const syncPremiumToSupabase = useCallback(async (premium: boolean) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("profiles").update({ is_premium: premium }).eq("id", user.id);
      }
    } catch (err) {
      console.error("Error syncing premium status:", err);
    }
  }, []);

  const evaluateTrialFromAnchor = useCallback((anchorIso: string) => {
    setTrialStarted(true);
    const anchorDate = new Date(anchorIso);
    const now = new Date();
    const diffMs = now.getTime() - anchorDate.getTime();
    const daysPassed = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (daysPassed >= TRIAL_DAYS) {
      setTrialExpired(true);
      setDaysRemaining(0);
    } else {
      setTrialExpired(false);
      setDaysRemaining(TRIAL_DAYS - daysPassed);
    }
  }, []);

  const evaluateLocalTrial = useCallback(() => {
    const firstPlay = localStorage.getItem(TRIAL_KEY);
    if (!firstPlay) {
      setTrialStarted(false);
      setTrialExpired(false);
      setDaysRemaining(null);
      return;
    }
    evaluateTrialFromAnchor(firstPlay);
  }, [evaluateTrialFromAnchor]);


  const checkStatus = useCallback(async () => {
    if (TEST_BYPASS_PREMIUM) {
      setIsPremium(true);
      setTrialExpired(false);
      setLoading(false);
      return;
    }
    try {
      if (!Capacitor.isNativePlatform()) {
        setIsPremium(false);
        evaluateLocalTrial();
        setLoading(false);
        return;
      }

      // Initialize with timeout to prevent hanging the whole app
      const initPromise = revenueCatService.initialize();
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Init timeout")), 5000));
      
      try {
        await Promise.race([initPromise, timeoutPromise]);
      } catch (e) {
        console.warn("RevenueCat initialization slow or failed:", e);
      }

      const rcStatus = await revenueCatService.checkPremiumStatus();
      if (rcStatus.isPremium) {
        setIsPremium(true);
        setTrialExpired(false);
        if (rcStatus.expirationDate) {
          const diffMs = new Date(rcStatus.expirationDate).getTime() - Date.now();
          setDaysRemaining(Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24))));
        }
        setLoading(false);
        await syncPremiumToSupabase(true);
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("is_premium")
          .eq("id", user.id)
          .single();

        if (profile?.is_premium) {
          setIsPremium(true);
          setTrialExpired(false);
          setLoading(false);
          return;
        }
      }

      // Not premium — anchor the trial to the RevenueCat / App Store receipt.
      // This survives account deletion + re-signup because it is tied to
      // the Apple ID's store receipt, not to a Supabase row the user
      // could wipe by deleting their account.
      const rcAnchor = await revenueCatService.getTrialAnchorDate();
      if (rcAnchor) {
        const anchorIso = rcAnchor.toISOString();
        // Mirror to localStorage so evaluation still works if RC is slow later.
        // Only overwrite if local is missing OR later than the RC anchor
        // (RC anchor always wins when it's older — prevents "reset by reinstall").
        const local = localStorage.getItem(TRIAL_KEY);
        if (!local || new Date(local).getTime() > rcAnchor.getTime()) {
          localStorage.setItem(TRIAL_KEY, anchorIso);
        }
        evaluateTrialFromAnchor(anchorIso);
        return;
      }

      evaluateLocalTrial();
    } catch (err) {
      console.error("Premium check error:", err);
      evaluateLocalTrial();
    } finally {
      setLoading(false);
    }
  }, [syncPremiumToSupabase, evaluateLocalTrial, evaluateTrialFromAnchor]);

  const startTrial = useCallback(() => {
    // On native, prefer the RC receipt-anchored date so users can't reset
    // the trial by deleting their app account and re-signing up.
    (async () => {
      let anchorIso: string | null = null;

      if (Capacitor.isNativePlatform()) {
        try {
          const rcAnchor = await revenueCatService.getTrialAnchorDate();
          if (rcAnchor) anchorIso = rcAnchor.toISOString();
        } catch (e) {
          console.warn("Could not fetch RC trial anchor at startTrial:", e);
        }
      }

      const existing = localStorage.getItem(TRIAL_KEY);
      // Use, in order: RC anchor > existing local > now.
      // If both exist, keep the older one (can't restart trial).
      const candidate = anchorIso ?? existing ?? new Date().toISOString();
      const finalAnchor =
        existing && new Date(existing).getTime() < new Date(candidate).getTime()
          ? existing
          : candidate;

      localStorage.setItem(TRIAL_KEY, finalAnchor);
      evaluateTrialFromAnchor(finalAnchor);

      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from("profiles").update({
            trial_start: finalAnchor,
            trial_ends_at: new Date(
              new Date(finalAnchor).getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000
            ).toISOString(),
          }).eq("id", user.id);
        }
      } catch (err) {
        console.error("Error syncing trial start:", err);
      }
    })();
  }, [evaluateTrialFromAnchor]);


  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  const refreshPremiumDays = useCallback(async () => {
    try {
      const rcStatus = await revenueCatService.checkPremiumStatus();
      if (rcStatus.expirationDate) {
        const diffMs = new Date(rcStatus.expirationDate).getTime() - Date.now();
        setDaysRemaining(Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24))));
      } else {
        setDaysRemaining(null);
      }
    } catch {
      setDaysRemaining(null);
    }
  }, []);

  const purchase = useCallback(async (plan: "monthly" | "yearly" = "monthly"): Promise<boolean> => {
    const success = await revenueCatService.purchasePremium(plan);
    if (success) {
      setIsPremium(true);
      setTrialExpired(false);
      await refreshPremiumDays();
      await syncPremiumToSupabase(true);
    }
    return success;
  }, [syncPremiumToSupabase, refreshPremiumDays]);

  const restore = useCallback(async (): Promise<boolean> => {
    const success = await revenueCatService.restorePurchases();
    if (success) {
      setIsPremium(true);
      setTrialExpired(false);
      await refreshPremiumDays();
      await syncPremiumToSupabase(true);
    }
    return success;
  }, [syncPremiumToSupabase, refreshPremiumDays]);


  return { loading, isPremium, trialExpired, trialStarted, daysRemaining, purchase, restore, startTrial };
};
