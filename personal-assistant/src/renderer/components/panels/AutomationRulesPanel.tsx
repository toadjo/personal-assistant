import type { AutomationRuleListItem, HaDeviceRow } from "../../types";
import { RuleForm } from "../forms/RuleForm";

type Props = {
  isRefreshing: boolean;
  rules: AutomationRuleListItem[];
  devices: HaDeviceRow[];
  onRefresh: () => Promise<void>;
  onError: (message: string) => void;
};

export function AutomationRulesPanel({ isRefreshing, rules, devices, onRefresh, onError }: Props): JSX.Element {
  return (
    <section className="panel">
      <div className="titleRow">
        <h2>Daily rules</h2>
      </div>
      <p className="muted sectionIntro">Same time each day: new reminder or toggle a device.</p>
      <RuleForm devices={devices} onDone={onRefresh} onError={onError} />
      <ul className="list">
        {isRefreshing ? (
          <li className="muted">Loading…</li>
        ) : rules.length ? (
          rules.map((r) => (
            <li key={r.id}>
              {r.name} · {r.triggerConfig.at} → {r.actionType === "haToggle" ? "toggle device" : "reminder"}
            </li>
          ))
        ) : (
          <li className="muted">No rules yet.</li>
        )}
      </ul>
    </section>
  );
}
