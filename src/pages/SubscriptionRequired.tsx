import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";

const SubscriptionRequired = () => {
  return (
    <div className="h-screen flex flex-col items-center justify-center bg-background text-foreground px-6">
      <div className="flex flex-col items-center gap-6 max-w-sm text-center">
        <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
          <Lock className="w-10 h-10 text-primary" />
        </div>

        <h1 className="text-2xl font-bold text-foreground">
          Your 30-day free trial has ended
        </h1>

        <p className="text-muted-foreground text-base leading-relaxed">
          Subscribe to continue using the app.
        </p>

        <Button
          size="lg"
          className="w-full mt-4 text-base font-semibold bg-primary hover:bg-primary/90"
          onClick={() => {
            // TODO: integrate payment flow
          }}
        >
          Subscribe for €4/month
        </Button>
      </div>
    </div>
  );
};

export default SubscriptionRequired;
