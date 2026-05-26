import { Capacitor } from "@capacitor/core";

// RevenueCat configuration
// Replace these with your actual RevenueCat values
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

  async initialize(): Promise<void> {
    if (this.initialized || !Capacitor.isNativePlatform()) return;

    try {
      const { Purchases } = await import("@revenuecat/purchases-capacitor");
      this.Purchases = Purchases;

      const platform = Capacitor.getPlatform();
      const apiKey = platform === "ios" ? REVENUECAT_API_KEY_IOS : REVENUECAT_API_KEY_ANDROID;

      await Purchases.configure({ apiKey });
      this.initialized = true;
      console.log("✅ RevenueCat initialized");
    } catch (error) {
      console.error("❌ RevenueCat init error:", error);
    }
  }

  async checkPremiumStatus(): Promise<PremiumStatus> {
    if (!this.initialized || !this.Purchases) {
      return { isPremium: false, expirationDate: null };
    }

    try {
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

  async purchasePremium(): Promise<boolean> {
    if (!this.initialized || !this.Purchases) {
      console.error("RevenueCat not initialized");
      return false;
    }

    try {
      const { offerings } = await this.Purchases.getOfferings();
      console.log("📦 RevenueCat offerings:", JSON.stringify(offerings, null, 2));

      // Try current offering first, fallback to "default", then first available
      let offering = offerings.current;
      if (!offering || offering.availablePackages.length === 0) {
        offering = offerings.all?.["default"];
      }
      if (!offering || offering.availablePackages.length === 0) {
        const allKeys = Object.keys(offerings.all || {});
        if (allKeys.length > 0) offering = offerings.all[allKeys[0]];
      }

      if (!offering || offering.availablePackages.length === 0) {
        console.error("❌ No offerings/packages available. Check RevenueCat dashboard: Offering must be marked 'Current' and contain a package linked to an approved App Store Connect product.");
        throw new Error("No subscription products available. Please try again later.");
      }

      const packageToPurchase = offering.availablePackages[0];
      console.log("🛒 Purchasing package:", packageToPurchase.identifier, packageToPurchase.product?.identifier);
      const { customerInfo } = await this.Purchases.purchasePackage({ aPackage: packageToPurchase });

      const entitlement = customerInfo.entitlements.active[ENTITLEMENT_ID];
      return !!entitlement;
    } catch (error: any) {
      if (error?.code === "1" || error?.userCancelled) {
        console.log("Purchase cancelled by user");
        return false;
      }
      console.error("❌ Purchase error:", error);
      throw error;
    }
  }

  async restorePurchases(): Promise<boolean> {
    if (!this.initialized || !this.Purchases) {
      console.error("RevenueCat not initialized");
      return false;
    }

    try {
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
