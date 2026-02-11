import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface TrialStatus {
  loading: boolean;
  trialExpired: boolean;
  daysRemaining: number | null;
  isPremium: boolean;
}

export const useTrialCheck = (): TrialStatus => {
  const [loading, setLoading] = useState(true);
  const [trialExpired, setTrialExpired] = useState(false);
  const [daysRemaining, setDaysRemaining] = useState<number | null>(null);
  const [isPremium, setIsPremium] = useState(false);

  useEffect(() => {
    const checkTrial = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          setLoading(false);
          return;
        }

        const { data: profile, error } = await supabase
          .from("profiles")
          .select("is_premium, trial_ends_at")
          .eq("id", user.id)
          .single();

        if (error || !profile) {
          setLoading(false);
          return;
        }

        const premium = profile.is_premium === true;
        setIsPremium(premium);

        const trialEndsAt = profile.trial_ends_at
          ? new Date(profile.trial_ends_at)
          : null;

        if (!premium && trialEndsAt) {
          const now = new Date();
          if (now > trialEndsAt) {
            setTrialExpired(true);
          } else {
            const diffMs = trialEndsAt.getTime() - now.getTime();
            setDaysRemaining(Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
          }
        }
      } catch (err) {
        console.error("Trial check error:", err);
      } finally {
        setLoading(false);
      }
    };

    checkTrial();
  }, []);

  return { loading, trialExpired, daysRemaining, isPremium };
};
