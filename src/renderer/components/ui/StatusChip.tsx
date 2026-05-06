import type { LucideIcon } from "lucide-react";

type Props = {
  icon: LucideIcon;
  label: string;
  count: number;
  variant?: "default" | "attention" | "success";
};

export function StatusChip({ icon: Icon, label, count, variant = "default" }: Props): JSX.Element {
  const variantClass =
    variant === "attention" ? "statusChipAttention" : variant === "success" ? "statusChipSuccess" : "";
  return (
    <span className={`statusChip ${variantClass}`} title={`${label}: ${count}`}>
      <Icon size={13} />
      <span className="statusChipCount">{count}</span>
    </span>
  );
}
