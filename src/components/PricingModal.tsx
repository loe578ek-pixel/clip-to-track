import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Crown } from "lucide-react";
import { toast } from "sonner";

interface PricingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubscribe: (type: 'monthly' | 'yearly') => Promise<void>;
}

export const PricingModal = ({ open, onOpenChange, onSubscribe }: PricingModalProps) => {
  const handleSubscribe = async (type: 'monthly' | 'yearly') => {
    try {
      await onSubscribe(type);
    } catch (error) {
      toast.error("Failed to start subscription process");
      console.error(error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Crown className="w-6 h-6 text-primary" />
            Upgrade to Premium
          </DialogTitle>
        </DialogHeader>

        <div className="grid md:grid-cols-2 gap-6 py-6">
          {/* Monthly Plan */}
          <div className="border rounded-lg p-6 space-y-4 hover:border-primary transition-colors">
            <div className="space-y-2">
              <h3 className="text-xl font-semibold">Monthly</h3>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-bold">€5</span>
                <span className="text-muted-foreground">/month</span>
              </div>
            </div>

            <ul className="space-y-3">
              <li className="flex items-start gap-2">
                <Check className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <span>9 playlists (instead of 3)</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <span>Zero ads - completely ad-free</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <span>All premium features</span>
              </li>
            </ul>

            <Button 
              className="w-full" 
              size="lg"
              onClick={() => handleSubscribe('monthly')}
            >
              Subscribe Monthly
            </Button>
          </div>

          {/* Yearly Plan */}
          <div className="border-2 border-primary rounded-lg p-6 space-y-4 relative">
            <Badge className="absolute -top-3 right-4 bg-primary">
              Best Value - Save €20!
            </Badge>

            <div className="space-y-2">
              <h3 className="text-xl font-semibold">Yearly</h3>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-bold">€40</span>
                <span className="text-muted-foreground">/year</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Just €3.33/month
              </p>
            </div>

            <ul className="space-y-3">
              <li className="flex items-start gap-2">
                <Check className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <span>9 playlists (instead of 3)</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <span>Zero ads - completely ad-free</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <span>All premium features</span>
              </li>
            </ul>

            <Button 
              className="w-full" 
              size="lg"
              onClick={() => handleSubscribe('yearly')}
            >
              Subscribe Yearly
            </Button>
          </div>
        </div>

        {/* Feature Comparison */}
        <div className="border-t pt-6">
          <h4 className="font-semibold mb-4">Feature Comparison</h4>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="font-medium">Feature</div>
            <div className="font-medium">Free</div>
            <div className="font-medium">Premium</div>
            
            <div className="text-left">Playlists</div>
            <div>3</div>
            <div className="text-primary font-semibold">9</div>
            
            <div className="text-left">Ads</div>
            <div>Yes</div>
            <div className="text-primary font-semibold">No Ads</div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
