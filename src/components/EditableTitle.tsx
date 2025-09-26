import { useState } from "react";
import { Edit3, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface EditableTitleProps {
  title: string;
  onSave: (newTitle: string) => void;
  className?: string;
  inputClassName?: string;
}

export const EditableTitle = ({ title, onSave, className = "", inputClassName = "" }: EditableTitleProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(title);

  const handleSave = () => {
    if (editValue.trim() && editValue.trim() !== title) {
      onSave(editValue.trim());
    }
    setIsEditing(false);
    setEditValue(title);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditValue(title);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  if (isEditing) {
    return (
      <div className="flex items-center gap-1">
        <Input
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          autoFocus
          className={`text-sm ${inputClassName}`}
        />
        <Button
          variant="ghost"
          size="icon"
          onClick={handleSave}
          className="w-6 h-6 text-green-500 hover:text-green-600 hover:bg-green-500/20"
        >
          <Check className="h-3 w-3" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleCancel}
          className="w-6 h-6 text-destructive hover:text-destructive hover:bg-destructive/20"
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <span className={className}>{title}</span>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsEditing(true)}
        className="w-5 h-5 text-muted-foreground hover:text-foreground hover:bg-accent/50 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <Edit3 className="h-3 w-3" />
      </Button>
    </div>
  );
};