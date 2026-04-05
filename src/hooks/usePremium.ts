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
      // Trial not started yet — no restrictions
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
      // On web (non-native), use local trial only
      if (!Capacitor.isNativePlatform()) {
        setIsPremium(false);
        evaluateLocalTrial();
        setLoading(false);
        return;
      }

      // 1. Check RevenueCat on native platforms
      await revenueCatService.initialize();
      const rcStatus = await revenueCatService.checkPremiumStatus();
      if (rcStatus.isPremium) {
        setIsPremium(true);
        setTrialExpired(false);
        setLoading(false);
        await syncPremiumToSupabase(true);
        return;
      }

      // 2. Check Supabase profile for premium
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

      // 3. Always use local trial (based on first play)
      evaluateLocalTrial();
    } catch (err) {
      console.error("Premium check error:", err);
      evaluateLocalTrial();
    } finally {
      setLoading(false);
    }
  }, [syncPremiumToSupabase, evaluateLocalTrial]);

  // Called on the very first play — starts the 30-day countdown
  const startTrial = useCallback(() => {
    const existing = localStorage.getItem(TRIAL_KEY);
    if (!existing) {
      const now = new Date().toISOString();
      localStorage.setItem(TRIAL_KEY, now);
      setTrialStarted(true);
      setDaysRemaining(TRIAL_DAYS);
      setTrialExpired(false);

      // Also sync to Supabase profile if signed in
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
