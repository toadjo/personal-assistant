import type { LucideIcon } from "lucide-react";

type Props = {
  icon: LucideIcon;
  label: string;
  title?: string;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
  size?: number;
  variant?: "default" | "ghost" | "danger";
};

export function IconButton({
  icon: Icon,
  label,
  title,
  onClick,
  disabled,
  className,
  size = 16,
  variant = "default"
}: Props): JSX.Element {
  const variantClass =
    variant === "danger" ? "iconButtonDanger" : variant === "ghost" ? "iconButtonGhost" : "iconButtonDefault";
  return (
    <button
      type="button"
      className={`iconButton ${variantClass} ${className ?? ""}`}
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={title ?? label}
    >
      <Icon size={size} />
    </button>
  );
}
