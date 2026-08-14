import { Capacitor } from "@capacitor/core";

export const PRIVACY_POLICY_URL =
  "https://sudden-squash-dff.notion.site/Privacy-Policy-TKPlaylist-34ff1f011f93805895d";

export const TERMS_OF_USE_URL = "https://clip-to-track.lovable.app/terms";

const openExternal = (url: string) => {
  const absolute = url.startsWith("http")
    ? url
    : `${window.location.origin}${url}`;
  if (Capacitor.isNativePlatform()) {
    window.open(absolute, "_system");
  } else {
    window.open(absolute, "_blank", "noopener,noreferrer");
  }
};

interface SubscriptionLegalProps {
  showPlanDetails?: boolean;
}

const SubscriptionLegal = ({ showPlanDetails = true }: SubscriptionLegalProps) => (
  <div className="space-y-3">
    {showPlanDetails && (
      <div className="rounded-lg border border-border/50 bg-secondary/20 p-3">
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-sm font-semibold text-foreground">TKPlaylist Premium</p>
          <p className="text-sm font-semibold text-primary">3,99€ / month</p>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Duration: 1 month — auto-renewing subscription, cancel anytime in your
          App Store account settings.
        </p>
      </div>
    )}
    <p className="text-xs text-muted-foreground text-center leading-relaxed">
      By subscribing, you agree to our{" "}
      <button
        type="button"
        onClick={() => openExternal(TERMS_OF_USE_URL)}
        className="underline text-primary font-medium"
      >
        Terms of Use
      </button>{" "}
      and{" "}
      <button
        type="button"
        onClick={() => openExternal(PRIVACY_POLICY_URL)}
        className="underline text-primary font-medium"
      >
        Privacy Policy
      </button>
      .
    </p>
  </div>
);

export default SubscriptionLegal;
