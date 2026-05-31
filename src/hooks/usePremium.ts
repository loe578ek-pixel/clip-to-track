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
  purchase: () => Promise<boolean>;
  restore: () => Promise<boolean>;
  startTrial: () => void;
}

export const usePremium = (): PremiumState => {
  const [loading, setLoading] = useState(true);
  const [isPremium, setIsPremium] = useState(false);
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

  const evaluateLocalTrial = useCallback(() => {
    const firstPlay = localStorage.getItem(TRIAL_KEY);
    if (!firstPlay) {
      setTrialStarted(false);
      setTrialExpired(false);
      setDaysRemaining(null);
      return;
    }
    setTrialStarted(true);
    const firstPlayDate = new Date(firstPlay);
    const now = new Date();
    const diffMs = now.getTime() - firstPlayDate.getTime();
    const daysPassed = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (daysPassed >= TRIAL_DAYS) {
      setTrialExpired(true);
      setDaysRemaining(0);
    } else {
      setTrialExpired(false);
      setDaysRemaining(TRIAL_DAYS - daysPassed);
    }
  }, []);

  const checkStatus = useCallback(async () => {
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

      evaluateLocalTrial();
    } catch (err) {
      console.error("Premium check error:", err);
      evaluateLocalTrial();
    } finally {
      setLoading(false);
    }
  }, [syncPremiumToSupabase, evaluateLocalTrial]);

  const startTrial = useCallback(() => {
    const existing = localStorage.getItem(TRIAL_KEY);
    if (!existing) {
      const now = new Date().toISOString();
      localStorage.setItem(TRIAL_KEY, now);
      setTrialStarted(true);
      setDaysRemaining(TRIAL_DAYS);
      setTrialExpired(false);

      (async () => {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            await supabase.from("profiles").update({
              trial_start: now,
              trial_ends_at: new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000).toISOString(),
            }).eq("id", user.id);
          }
        } catch (err) {
          console.error("Error syncing trial start:", err);
        }
      })();
    }
  }, []);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  const purchase = useCallback(async (): Promise<boolean> => {
    const success = await revenueCatService.purchasePremium();
    if (success) {
      setIsPremium(true);
      setTrialExpired(false);
      await syncPremiumToSupabase(true);
    }
    return success;
  }, [syncPremiumToSupabase]);

  const restore = useCallback(async (): Promise<boolean> => {
    const success = await revenueCatService.restorePurchases();
    if (success) {
      setIsPremium(true);
      setTrialExpired(false);
      await syncPremiumToSupabase(true);
    }
    return success;
  }, [syncPremiumToSupabase]);

  return { loading, isPremium, trialExpired, trialStarted, daysRemaining, purchase, restore, startTrial };
};
