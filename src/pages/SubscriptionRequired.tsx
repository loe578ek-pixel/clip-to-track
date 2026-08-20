import { useState, useEffect } from "react";
import { Crown, RotateCcw, Music, Sparkles, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import SubscriptionLegal from "@/components/SubscriptionLegal";
import { toast } from "sonner";
import { Capacitor } from "@capacitor/core";
import { revenueCatService } from "@/lib/revenueCat";

interface SubscriptionRequiredProps {
  onPurchase: () => Promise<boolean>;
  onRestore: () => Promise<boolean>;
}

const SubscriptionRequired = ({ onPurchase, onRestore }: SubscriptionRequiredProps) => {
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [offeringsReady, setOfferingsReady] = useState(!Capacitor.isNativePlatform());

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    let cancelled = false;
    (async () => {
      const offering = await revenueCatService.loadOfferings();
      if (!cancelled) setOfferingsReady(!!offering);
    })();
    return () => { cancelled = true; };
  }, []);


  const handlePurchase = async () => {
    setPurchasing(true);
    try {
      if (Capacitor.isNativePlatform() && !offeringsReady) {
        toast.info("Loading subscription options…");
        const offering = await revenueCatService.loadOfferings();
        setOfferingsReady(!!offering);
        if (!offering) {
          toast.error("Loading subscription options, please try again in a moment.", { duration: 10000 });
          return;
        }
      }
      const success = await onPurchase();

      if (success) {
        toast.success("Welcome to Premium! 🎉");
      } else {
        toast.error("Purchase failed or was cancelled.");
      }
    } catch (err: any) {
      console.error("Purchase error:", err);
      toast.error(err?.message || "An error occurred. Please try again.");
    } finally {
      setPurchasing(false);
    }
  };

  const handleRestore = async () => {
    setRestoring(true);
    try {
      const success = await onRestore();
      if (success) {
        toast.success("Purchases restored successfully! 🎉");
      } else {
        toast.info("No purchases found to restore.");
      }
    } catch {
      toast.error("Error restoring purchases.");
    } finally {
      setRestoring(false);
    }
  };

  return (
    <div className="h-screen flex flex-col items-center justify-center bg-background text-foreground px-6">
      <div className="flex flex-col items-center gap-8 max-w-sm w-full text-center">
        <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center">
          <Crown className="w-12 h-12 text-primary" />
        </div>
        <div className="space-y-3">
          <h1 className="text-3xl font-bold text-foreground">
            Upgrade to Premium
          </h1>
          <p className="text-muted-foreground text-base leading-relaxed">
            Unlimited access to all your music without restrictions.
          </p>
        </div>
        <div className="w-full space-y-3 text-left">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-card/50 border border-border/50">
            <Music className="w-5 h-5 text-primary shrink-0" />
            <span className="text-sm text-foreground">Unlimited playback of all your music</span>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-lg bg-card/50 border border-border/50">
            <Sparkles className="w-5 h-5 text-primary shrink-0" />
            <span className="text-sm text-foreground">Playlists and repeats without limits</span>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-lg bg-card/50 border border-border/50">
            <Shield className="w-5 h-5 text-primary shrink-0" />
            <span className="text-sm text-foreground">Updates and future features</span>
          </div>
        </div>
        <div className="w-full space-y-3 mt-2">
          <div className="rounded-lg border border-border/50 bg-secondary/20 p-3 text-left">
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-sm font-semibold text-foreground">TKPlaylist Premium</p>
              <p className="text-sm font-semibold text-primary">3,99€ / month</p>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Duration: 1 month — auto-renewing, cancel anytime.
            </p>
          </div>
          <Button
            size="lg"
            className="w-full text-base font-semibold bg-primary hover:bg-primary/90"
            onClick={handlePurchase}
            disabled={purchasing}
          >
            {purchasing ? "Processing…" : !offeringsReady ? "Loading subscription options…" : "Subscribe"}
          </Button>
          <SubscriptionLegal showPlanDetails={false} />
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-muted-foreground hover:text-foreground"
            onClick={handleRestore}
            disabled={restoring}
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            {restoring ? "Restoring..." : "Restore my purchases"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionRequired;
