import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";

interface HeartButtonProps {
  isLiked: boolean;
  onToggle: () => void;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export const HeartButton = ({ 
  isLiked, 
  onToggle, 
  size = "md",
  className = ""
}: HeartButtonProps) => {
  const sizeClasses = {
    sm: "w-6 h-6",
    md: "w-8 h-8", 
    lg: "w-10 h-10"
  };

  const iconSizes = {
    sm: "h-3 w-3",
    md: "h-4 w-4",
    lg: "h-5 w-5"
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onToggle();
      }}
      className={`${sizeClasses[size]} transition-all hover:scale-110 ${className}`}
    >
      <Heart 
        className={`${iconSizes[size]} transition-colors ${
          isLiked 
            ? "text-[#1905C8] fill-[#1905C8]" 
            : "text-muted-foreground hover:text-[#1905C8]"
        }`}
      />
    </Button>
  );
};