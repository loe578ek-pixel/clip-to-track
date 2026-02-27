import { useState, useEffect, useCallback } from "react";
import { Capacitor } from "@capacitor/core";
import { revenueCatService } from "@/lib/revenueCat";
import { supabase } from "@/integrations/supabase/client";

interface PremiumState {
  loading: boolean;
  isPremium: boolean;
  trialExpired: boolean;
  daysRemaining: number | null;
  purchase: () => Promise<boolean>;
  restore: () => Promise<boolean>;
}

export const usePremium = (): PremiumState => {
  const [loading, setLoading] = useState(true);
  const [isPremium, setIsPremium] = useState(false);
  const [trialExpired, setTrialExpired] = useState(false);
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

  const checkStatus = useCallback(async () => {
    try {
      // 1. Check RevenueCat on native platforms
      if (Capacitor.isNativePlatform()) {
        await revenueCatService.initialize();
        const rcStatus = await revenueCatService.checkPremiumStatus();
        if (rcStatus.isPremium) {
          setIsPremium(true);
          setTrialExpired(false);
          setLoading(false);
          await syncPremiumToSupabase(true);
          return;
        }
      }

      // 2. Check Supabase profile
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        // No user — check local trial
        checkLocalTrial();
        setLoading(false);
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("is_premium, trial_ends_at")
        .eq("id", user.id)
        .single();

      if (profile?.is_premium) {
        setIsPremium(true);
        setTrialExpired(false);
        setLoading(false);
        return;
      }

      // 3. Check trial from profile
      if (profile?.trial_ends_at) {
        const trialEnd = new Date(profile.trial_ends_at);
        const now = new Date();
        if (now > trialEnd) {
          setTrialExpired(true);
        } else {
          const diffMs = trialEnd.getTime() - now.getTime();
          setDaysRemaining(Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
        }
      } else {
        // No trial_ends_at — fallback to local storage trial
        checkLocalTrial();
      }
    } catch (err) {
      console.error("Premium check error:", err);
      checkLocalTrial();
    } finally {
      setLoading(false);
    }
  }, [syncPremiumToSupabase]);

  const checkLocalTrial = () => {
    const TRIAL_KEY = "soundwave-first-open";
    let firstOpen = localStorage.getItem(TRIAL_KEY);
    if (!firstOpen) {
      firstOpen = new Date().toISOString();
      localStorage.setItem(TRIAL_KEY, firstOpen);
    }
    const firstOpenDate = new Date(firstOpen);
    const now = new Date();
    const diffMs = now.getTime() - firstOpenDate.getTime();
    const daysPassed = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (daysPassed >= 30) {
      setTrialExpired(true);
    } else {
      setDaysRemaining(30 - daysPassed);
    }
  };

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

  return { loading, isPremium, trialExpired, daysRemaining, purchase, restore };
};
