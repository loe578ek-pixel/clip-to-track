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


  /**
   * Loads offerings with retries. StoreKit can take a few seconds on a fresh
   * install / brand-new Apple ID (exactly the Apple reviewer scenario), so we
   * retry with backoff instead of failing with a generic network error.
   */
  async loadOfferings(attempts = 4): Promise<any | null> {
    if (!Capacitor.isNativePlatform()) return null;
    if (!this.initialized) {
      try {
        await this.initialize();
      } catch (e) {
        console.error("❌ Cannot load offerings, init failed:", e);
        return null;
      }
    }
    if (!this.Purchases) return null;

    if (this.cachedOffering?.availablePackages?.length) return this.cachedOffering;

    if (this.offeringsPromise) return this.offeringsPromise;

    this.offeringsPromise = (async () => {
      let lastError: any = null;
      for (let i = 0; i < attempts; i++) {
        try {
          const result: any = await this.Purchases.getOfferings();
          const offerings = result?.offerings ?? result;
          const offering = this.pickOffering(offerings);
          if (offering?.availablePackages?.length) {
            this.cachedOffering = offering;
            console.log("✅ Offerings loaded:", offering.identifier, offering.availablePackages.map((p: any) => p.product?.identifier));
            return offering;
          }
          console.warn(`⚠️ Offerings empty (attempt ${i + 1}/${attempts})`);
        } catch (e) {
          lastError = e;
          console.warn(`⚠️ getOfferings failed (attempt ${i + 1}/${attempts}):`, e);
        }
        await new Promise((r) => setTimeout(r, 1000 * (i + 1)));
      }
      if (lastError) console.error("❌ Offerings never loaded:", lastError);
      return null;
    })();

    const res = await this.offeringsPromise;
    this.offeringsPromise = null;
    return res;
  }

  private pickOffering(offerings: any): any | null {
    if (!offerings || typeof offerings !== "object") return null;
    const all = offerings?.all ?? {};
    let offering = offerings?.current ?? null;
    if (!offering?.availablePackages?.length) offering = all?.["default"] ?? null;
    if (!offering?.availablePackages?.length) {
      const keys = Object.keys(all || {});
      for (const k of keys) {
        if (all[k]?.availablePackages?.length) {
          offering = all[k];
          break;
        }
      }
    }
    return offering?.availablePackages?.length ? offering : null;
  }

  /** True when at least one purchasable package is cached and ready. */
  isOfferingsReady(): boolean {
    return !!this.cachedOffering?.availablePackages?.length;
  }

  async purchasePremium(): Promise<boolean> {
    try {
      console.log("🛒 purchasePremium called", {
        native: Capacitor.isNativePlatform(),
        platform: Capacitor.getPlatform(),
        initialized: this.initialized,
        offeringsReady: this.isOfferingsReady(),
      });

      if (!this.initialized) {
        await this.initialize();
      }

      if (!this.Purchases) {
        throw new Error("RevenueCat plugin not available. Please ensure you are on a native device.");
      }

      const offering = await this.loadOfferings();

      if (!offering) {
        throw new Error("Loading subscription options, please try again in a moment.");
      }

      // Prefer the monthly package / premium_monthly product if present.
      const packages = offering.availablePackages;
      const packageToPurchase =
        packages.find((p: any) => p.product?.identifier === "premium_monthly") ||
        packages.find((p: any) => p.identifier === "$rc_monthly") ||
        packages[0];

      console.log("🛒 Purchasing package:", packageToPurchase.identifier, packageToPurchase.product?.identifier);

      const { customerInfo } = await this.Purchases.purchasePackage({ aPackage: packageToPurchase });

      const entitlement = customerInfo.entitlements.active[ENTITLEMENT_ID];
      return !!entitlement;
    } catch (error: any) {
      if (error?.code === "1" || error?.userCancelled || error?.message?.includes("cancelled")) {
        console.log("Purchase cancelled by user");
        return false;
      }
      console.error("❌ Purchase error:", JSON.stringify({
        code: error?.code,
        message: error?.message,
        underlying: error?.underlyingErrorMessage,
        readable: error?.readableErrorCode,
      }));
      const detail = error?.underlyingErrorMessage || error?.message || "Unknown StoreKit error";
      throw new Error(detail);
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
