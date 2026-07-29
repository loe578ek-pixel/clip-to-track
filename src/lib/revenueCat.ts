import { Capacitor } from "@capacitor/core";

// RevenueCat configuration
const REVENUECAT_API_KEY_ANDROID = "goog_UWpcVvaefmTIvDIYMrjNIUOZmZI";
const REVENUECAT_API_KEY_IOS = "appl_lLFESGcyVZxjVMnMhvBOToYlVhF";
const ENTITLEMENT_ID = "premium";

interface PremiumStatus {
  isPremium: boolean;
  expirationDate: string | null;
}

class RevenueCatService {
  private initialized = false;
  private Purchases: any = null;
  private initializationPromise: Promise<void> | null = null;

  async initialize(): Promise<void> {
    if (!Capacitor.isNativePlatform()) {
      console.log("ℹ️ RevenueCat skipped: not on native platform");
      return;
    }
    if (this.initialized && this.Purchases) {
      console.log("ℹ️ RevenueCat already initialized");
      return;
    }
    
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = (async () => {
      try {
        console.log("🚀 Initializing RevenueCat...", {
          platform: Capacitor.getPlatform(),
        });
        const { Purchases } = await import("@revenuecat/purchases-capacitor");
        this.Purchases = Purchases;

        const platform = Capacitor.getPlatform();
        const apiKey = platform === "ios" ? REVENUECAT_API_KEY_IOS : REVENUECAT_API_KEY_ANDROID;

        await Purchases.configure({ apiKey });
        this.initialized = true;
        console.log("✅ RevenueCat initialized successfully");
      } catch (error) {
        console.error("❌ RevenueCat init error:", error);
        this.Purchases = null;
        this.initialized = false;
        this.initializationPromise = null; // Allow retry
        throw error;
      }
    })();

    return this.initializationPromise;
  }

  async checkPremiumStatus(): Promise<PremiumStatus> {
    try {
      if (!this.initialized) {
        await this.initialize();
      }
      
      if (!this.Purchases) {
        return { isPremium: false, expirationDate: null };
      }

      const { customerInfo } = await this.Purchases.getCustomerInfo();
      const entitlement = customerInfo.entitlements.active[ENTITLEMENT_ID];

      if (entitlement) {
        return {
          isPremium: true,
          expirationDate: entitlement.expirationDate || null,
        };
      }

      return { isPremium: false, expirationDate: null };
    } catch (error) {
      console.error("❌ RevenueCat status check error:", error);
      return { isPremium: false, expirationDate: null };
    }
  }

  /**
   * Returns a trial anchor date tied to the RevenueCat / App Store receipt
   * for this Apple ID. Survives account deletion & re-signup because it is
   * derived from `customerInfo.firstSeen` (fallback to `originalPurchaseDate`
   * or `originalApplicationVersion` install time).
   * Returns null if not available (e.g. web / plugin missing).
   */
  async getTrialAnchorDate(): Promise<Date | null> {
    try {
      if (!Capacitor.isNativePlatform()) return null;
      if (!this.initialized) {
        await this.initialize();
      }
      if (!this.Purchases) return null;

      const { customerInfo } = await this.Purchases.getCustomerInfo();

      // Prefer firstSeen — the first time this Apple ID was ever seen by
      // RevenueCat for this app. Bound to the store receipt, not our DB.
      const firstSeen = customerInfo?.firstSeen;
      if (firstSeen) {
        const d = new Date(firstSeen);
        if (!isNaN(d.getTime())) return d;
      }

      // Fallback: originalPurchaseDate (first ever transaction, incl. free)
      const originalPurchase = customerInfo?.originalPurchaseDate;
      if (originalPurchase) {
        const d = new Date(originalPurchase);
        if (!isNaN(d.getTime())) return d;
      }

      return null;
    } catch (error) {
      console.error("❌ Trial anchor fetch error:", error);
      return null;
    }
  }


  async purchasePremium(): Promise<boolean> {
    try {
      console.log("🛒 purchasePremium called", {
        native: Capacitor.isNativePlatform(),
        platform: Capacitor.getPlatform(),
        initialized: this.initialized,
      });

      if (!this.initialized) {
        await this.initialize();
      }

      if (!this.Purchases) {
        throw new Error("RevenueCat plugin not available. Please ensure you are on a native device.");
      }

      console.log("📦 Fetching offerings...");
      let offeringsResult: any = null;
      try {
        offeringsResult = await this.Purchases.getOfferings();
      } catch (e) {
        console.error("❌ getOfferings threw:", e);
        throw new Error("Unable to reach the App Store. Please check your connection and try again.");
      }

      const offerings = offeringsResult?.offerings ?? offeringsResult;
      if (!offerings || typeof offerings !== "object") {
        console.error("❌ Offerings payload missing:", offeringsResult);
        throw new Error("No subscription products available yet. Please try again in a moment.");
      }
      console.log("📦 RevenueCat offerings:", JSON.stringify(offerings, null, 2));

      let offering: any = offerings?.current ?? null;
      const all = offerings?.all ?? {};
      if (!offering || !offering?.availablePackages?.length) {
        offering = all?.["default"] ?? null;
      }
      if (!offering || !offering?.availablePackages?.length) {
        const allKeys = Object.keys(all || {});
        if (allKeys.length > 0) offering = all[allKeys[0]];
      }

      if (!offering || !offering?.availablePackages?.length) {
        console.error("❌ No offerings/packages available.");
        throw new Error("No subscription products available in the App Store yet. Please ensure products are approved and the Offering is marked 'Current' in RevenueCat.");
      }

      const packageToPurchase = offering.availablePackages[0];
      console.log("🛒 Purchasing package:", packageToPurchase.identifier, packageToPurchase.product?.identifier);
      
      const { customerInfo } = await this.Purchases.purchasePackage({ aPackage: packageToPurchase });

      const entitlement = customerInfo.entitlements.active[ENTITLEMENT_ID];
      return !!entitlement;
    } catch (error: any) {
      if (error?.code === "1" || error?.userCancelled || error?.message?.includes("cancelled")) {
        console.log("Purchase cancelled by user");
        return false;
      }
      console.error("❌ Purchase error:", error);
      throw error;
    }
  }

  async restorePurchases(): Promise<boolean> {
    try {
      console.log("🔄 restorePurchases called", {
        native: Capacitor.isNativePlatform(),
        platform: Capacitor.getPlatform(),
        initialized: this.initialized,
      });

      if (!this.initialized) {
        await this.initialize();
      }

      if (!this.Purchases) {
        return false;
      }

      const { customerInfo } = await this.Purchases.restorePurchases();
      const entitlement = customerInfo.entitlements.active[ENTITLEMENT_ID];
      return !!entitlement;
    } catch (error) {
      console.error("❌ Restore error:", error);
      return false;
    }
  }
}

export const revenueCatService = new RevenueCatService();
