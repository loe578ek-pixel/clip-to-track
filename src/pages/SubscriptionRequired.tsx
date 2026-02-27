import { useState } from "react";
import { Crown, RotateCcw, Music, Sparkles, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface SubscriptionRequiredProps {
  onPurchase: () => Promise<boolean>;
  onRestore: () => Promise<boolean>;
}

const SubscriptionRequired = ({ onPurchase, onRestore }: SubscriptionRequiredProps) => {
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);

  const handlePurchase = async () => {
    setPurchasing(true);
    try {
      const success = await onPurchase();
      if (success) {
        toast.success("Bienvenue en Premium ! 🎉");
      } else {
        toast.error("L'achat a échoué ou a été annulé.");
      }
    } catch {
      toast.error("Une erreur est survenue. Réessayez.");
    } finally {
      setPurchasing(false);
    }
  };

  const handleRestore = async () => {
    setRestoring(true);
    try {
      const success = await onRestore();
      if (success) {
        toast.success("Achats restaurés avec succès ! 🎉");
      } else {
        toast.info("Aucun achat trouvé à restaurer.");
      }
    } catch {
      toast.error("Erreur lors de la restauration.");
    } finally {
      setRestoring(false);
    }
  };

  return (
    <div className="h-screen flex flex-col items-center justify-center bg-background text-foreground px-6">
      <div className="flex flex-col items-center gap-8 max-w-sm w-full text-center">
        {/* Icon */}
        <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center">
          <Crown className="w-12 h-12 text-primary" />
        </div>

        {/* Title */}
        <div className="space-y-3">
          <h1 className="text-3xl font-bold text-foreground">
            Passez à Premium
          </h1>
          <p className="text-muted-foreground text-base leading-relaxed">
            Accès illimité à toutes vos musiques sans restriction.
          </p>
        </div>

        {/* Features */}
        <div className="w-full space-y-3 text-left">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-card/50 border border-border/50">
            <Music className="w-5 h-5 text-primary shrink-0" />
            <span className="text-sm text-foreground">Lecture illimitée de toutes vos musiques</span>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-lg bg-card/50 border border-border/50">
            <Sparkles className="w-5 h-5 text-primary shrink-0" />
            <span className="text-sm text-foreground">Playlists et répétitions sans limites</span>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-lg bg-card/50 border border-border/50">
            <Shield className="w-5 h-5 text-primary shrink-0" />
            <span className="text-sm text-foreground">Mises à jour et fonctionnalités futures</span>
          </div>
        </div>

        {/* Buttons */}
        <div className="w-full space-y-3 mt-2">
          <Button
            size="lg"
            className="w-full text-base font-semibold bg-primary hover:bg-primary/90"
            onClick={handlePurchase}
            disabled={purchasing}
          >
            {purchasing ? "Chargement..." : "S'abonner"}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="w-full text-muted-foreground hover:text-foreground"
            onClick={handleRestore}
            disabled={restoring}
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            {restoring ? "Restauration..." : "Restaurer mes achats"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionRequired;
