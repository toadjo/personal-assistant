import type { LucideIcon } from "lucide-react";

type Props = {
  icon?: LucideIcon;
  title: string;
  actions?: React.ReactNode;
};

export function PanelHeader({ icon: Icon, title, actions }: Props): JSX.Element {
  return (
    <div className="panelHeader">
      <div className="panelHeaderTitle">
        {Icon ? <Icon size={16} className="panelHeaderIcon" /> : null}
        <h2>{title}</h2>
      </div>
      {actions ? <div className="panelHeaderActions">{actions}</div> : null}
    </div>
  );
}
