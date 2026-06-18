import type { LucideIcon } from "lucide-react";

type Props = {
  icon: LucideIcon;
  title: string;
  description: string;
};

export function EmptyState({ icon: Icon, title, description }: Props): JSX.Element {
  return (
    <div className="emptyState">
      <Icon size={20} className="emptyStateIcon" />
      <p className="emptyStateTitle">{title}</p>
      <p className="emptyStateDescription">{description}</p>
    </div>
  );
}
