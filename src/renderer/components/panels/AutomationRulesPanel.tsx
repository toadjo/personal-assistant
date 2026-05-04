import type { AutomationRuleListItem, HaDeviceRow } from "../../types";
import { RuleForm } from "../forms/RuleForm";

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
      <div className="titleRow">
        <h3 className="panelSectionHeading">Daily rules</h3>
      </div>
      <p className="muted sectionIntro">Same time each day: new reminder or toggle a device.</p>
      <RuleForm devices={devices} onDone={onRefresh} onError={onError} onShowSuccess={onShowSuccess} />
      <ul className="list">
        {isRefreshing ? (
          <li className="muted">Loading…</li>
        ) : rules.length ? (
          rules.map((r) => (
            <li key={r.id} className="listRow">
              <span style={{ flex: 1, minWidth: 0 }}>
                <span className={r.enabled ? "" : "muted"}>{r.enabled ? "" : "(paused) "}</span>
                {r.name} · {r.triggerConfig.at} → {r.actionType === "haToggle" ? "toggle device" : "reminder"}
              </span>
              <div className="row" style={{ gap: "0.5rem", flexShrink: 0 }}>
                <button
                  type="button"
                  className="ghostButton"
                  onClick={() => onSetRuleEnabled(r.id, !r.enabled)}
                  aria-pressed={r.enabled}
                >
                  {r.enabled ? "Pause" : "Enable"}
                </button>
                <button type="button" className="dangerButton" onClick={() => void onDeleteRule(r.id, r.name)}>
                  Delete
                </button>
              </div>
            </li>
          ))
        ) : (
          <li className="emptyState">
            <p className="emptyStateTitle">No rules yet</p>
            <p className="emptyStateDescription">
              Rules automate daily tasks like reminders or device toggles. Use the form above to create your first rule.
            </p>
          </li>
        )}
      </ul>
    </section>
  );
}
