import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { Crown } from "lucide-react";

interface UpgradeToPremiumDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpgrade: () => void;
}

export const UpgradeToPremiumDialog = ({ open, onOpenChange, onUpgrade }: UpgradeToPremiumDialogProps) => {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Crown className="w-5 h-5 text-primary" />
            Upgrade to Premium
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-3 pt-2">
            <p>You've reached the free plan limit of 3 playlists.</p>
            <div className="bg-muted p-4 rounded-lg space-y-2">
              <p className="font-semibold text-foreground">Premium Benefits:</p>
              <ul className="space-y-1 text-sm">
                <li>✓ 9 playlists (instead of 3)</li>
                <li>✓ Zero ads - completely ad-free</li>
                <li>✓ All premium features</li>
              </ul>
            </div>
            <p>Starting at just €5/month or €40/year (save €20!)</p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Not Now</AlertDialogCancel>
          <AlertDialogAction onClick={onUpgrade}>
            <Crown className="w-4 h-4 mr-2" />
            See Plans
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
