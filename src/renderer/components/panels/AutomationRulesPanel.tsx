import type { AutomationRuleListItem, HaDeviceRow } from "../../types";
import { Timer, Pause, Play, Trash2, Zap } from "lucide-react";
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
};

export function AutomationRulesPanel({
  isRefreshing,
  rules,
  devices,
  onRefresh,
  onError,
  onShowSuccess,
  onDeleteRule,
  onSetRuleEnabled
}: Props): JSX.Element {
  return (
    <section className="panel addOnPanel">
      <PanelHeader icon={Timer} title="Daily rules" />
      <p className="muted sectionIntro">Same time each day: new reminder or toggle a device.</p>
      <RuleForm devices={devices} onDone={onRefresh} onError={onError} onShowSuccess={onShowSuccess} />
      <ul className="list">
        {isRefreshing ? (
          <li className="muted">Loading...</li>
        ) : rules.length ? (
          rules.map((r) => (
            <li key={r.id} className="listRow">
              <span style={{ flex: 1, minWidth: 0 }}>
                <span className={r.enabled ? "" : "muted"}>{r.enabled ? "" : "(paused) "}</span>
                {r.name} | {r.triggerConfig.at} {"->"} {r.actionType === "haToggle" ? "toggle device" : "reminder"}
              </span>
              <div className="row" style={{ gap: "0.5rem", flexShrink: 0 }}>
                <IconButton
                  icon={r.enabled ? Pause : Play}
                  label={r.enabled ? "Pause rule" : "Enable rule"}
                  onClick={() => onSetRuleEnabled(r.id, !r.enabled)}
                  variant="ghost"
                  size={14}
                />
                <IconButton
                  icon={Trash2}
                  label={`Delete rule ${r.name}`}
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
            description="Rules automate daily tasks like reminders or device toggles. Use the form above to create your first rule."
          />
        )}
      </ul>
    </section>
  );
}
