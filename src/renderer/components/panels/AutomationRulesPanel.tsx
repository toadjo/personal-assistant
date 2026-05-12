import type { AutomationRuleListItem, HaDeviceRow } from "../../types";
import { Timer, Pause, Play, Trash2, Zap, Copy, PlayCircle } from "lucide-react";
import { RuleForm } from "../forms/RuleForm";
import { PanelHeader } from "../ui/PanelHeader";
import { IconButton } from "../ui/IconButton";
import { EmptyState } from "../ui/EmptyState";

type Props = {
  isRefreshing: boolean;
  rules: AutomationRuleListItem[];
  devices: HaDeviceRow[];
  onRefresh: () => Promise<void>;
  onError: (message: string) => void;
  onShowSuccess?: (message: string) => void;
  onDeleteRule: (id: string, name: string) => void;
  onSetRuleEnabled: (id: string, enabled: boolean) => void;
  onDuplicateRule?: (id: string) => void;
  onTestRunRule?: (id: string) => void;
};

export function AutomationRulesPanel({
  isRefreshing,
  rules,
  devices,
  onRefresh,
  onError,
  onShowSuccess,
  onDeleteRule,
  onSetRuleEnabled,
  onDuplicateRule,
  onTestRunRule
}: Props): JSX.Element {
  return (
    <section className="panel addOnPanel">
      <PanelHeader icon={Timer} title="Automations" />
      <p className="muted sectionIntro">Run actions on a schedule.</p>
      <RuleForm devices={devices} onDone={onRefresh} onError={onError} onShowSuccess={onShowSuccess} />
      <ul className="list">
        {isRefreshing ? (
          <li className="muted">Loading...</li>
        ) : rules.length ? (
          rules.map((r) => (
            <li key={r.id} className="listRow">
              <span style={{ flex: 1, minWidth: 0 }}>
                <span className={r.enabled ? "" : "muted"}>{r.enabled ? "" : "Paused: "}</span>
                {r.name} at {r.triggerConfig.at} - {r.actionType === "haToggle" ? "toggle device" : r.actionType === "localTask" ? "create task" : "reminder"}
                {r.lastExecutedAt ? (
                  <span className="muted" style={{ marginLeft: "0.5rem" }}>
                    | Last run: {new Date(r.lastExecutedAt).toLocaleString()}
                  </span>
                ) : null}
              </span>
              <div className="row" style={{ gap: "0.5rem", flexShrink: 0 }}>
                <IconButton
                  icon={PlayCircle}
                  label={`Test run rule ${r.name}`}
                  title="Test run"
                  onClick={() => onTestRunRule?.(r.id)}
                  variant="ghost"
                  size={14}
                />
                <IconButton
                  icon={Copy}
                  label={`Duplicate rule ${r.name}`}
                  title="Duplicate"
                  onClick={() => onDuplicateRule?.(r.id)}
                  variant="ghost"
                  size={14}
                />
                <IconButton
                  icon={r.enabled ? Pause : Play}
                  label={r.enabled ? "Pause rule" : "Enable rule"}
                  title={r.enabled ? "Pause" : "Enable"}
                  onClick={() => onSetRuleEnabled(r.id, !r.enabled)}
                  variant="ghost"
                  size={14}
                />
                <IconButton
                  icon={Trash2}
                  label={`Delete rule ${r.name}`}
                  title="Delete"
                  onClick={() => void onDeleteRule(r.id, r.name)}
                  variant="danger"
                  size={14}
                />
              </div>
            </li>
          ))
        ) : (
          <EmptyState
            icon={Zap}
            title="No rules yet"
            description="Create a rule to automate reminders, tasks, or device toggles."
          />
        )}
      </ul>
    </section>
  );
}
