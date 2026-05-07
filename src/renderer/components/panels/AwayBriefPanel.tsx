import type { AwayBriefItem } from "../../types";
import { PanelHeader } from "../ui/PanelHeader";
import { IconButton } from "../ui/IconButton";
import { History, AlertCircle, Clock, Plus, RotateCw, X } from "lucide-react";
import { getAwayBriefSummary } from "../../lib/derived/away-brief";
import "./AwayBriefPanel.css";

type Props = {
  items: AwayBriefItem[];
  onMarkSeen: () => void;
};

function getIconForReason(reason: AwayBriefItem["reason"]) {
  switch (reason) {
    case "overdue":
      return AlertCircle;
    case "due":
      return Clock;
    case "new":
      return Plus;
    case "updated":
      return RotateCw;
  }
}

function getReasonLabel(reason: AwayBriefItem["reason"]): string {
  switch (reason) {
    case "overdue":
      return "Overdue";
    case "due":
      return "Due";
    case "new":
      return "New";
    case "updated":
      return "Updated";
  }
}

function formatChangedAt(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export function AwayBriefPanel({ items, onMarkSeen }: Props): JSX.Element {
  const summary = getAwayBriefSummary(items);
  const topItems = items.slice(0, 5);

  return (
    <section className="panel" aria-labelledby="away-brief-heading">
      <div className="awayBriefHeader">
        <PanelHeader icon={History} title="Since You Were Away" />
        {items.length > 0 && (
          <IconButton
            icon={X}
            size={16}
            onClick={onMarkSeen}
            label="Mark as seen"
            className="awayBriefDismiss"
          />
        )}
      </div>
      <div className="awayBriefContent">
        <article className="awayBriefSummary">
          <p>{summary}</p>
        </article>
        {topItems.length > 0 ? (
          <article className="awayBriefItems">
            <ul className="awayBriefList">
              {topItems.map((item) => {
                const Icon = getIconForReason(item.reason);
                return (
                  <li key={item.sourceId} className="awayBriefListItem">
                    <Icon size={16} className="awayBriefListItemIcon" />
                    <div className="awayBriefListItemContent">
                      <div className="awayBriefItemLabel">{item.label}</div>
                      {item.detail && <div className="awayBriefItemDetail">{item.detail}</div>}
                      <div className="awayBriefItemMeta">
                        {getReasonLabel(item.reason)} • {item.kind} • {formatChangedAt(item.changedAt)}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </article>
        ) : (
          <article className="awayBriefEmpty">
            <p className="awayBriefEmptyState">Nothing changed since you last checked.</p>
          </article>
        )}
      </div>
    </section>
  );
}
