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
        <h2>Automation Rules</h2>
        <span className="pill graphitePill">Automate</span>
      </div>
      <p className="muted sectionIntro">Set a daily time to create a reminder or toggle a Home Assistant device.</p>
      <RuleForm devices={devices} onDone={onRefresh} onError={onError} />
      <ul className="list">
        {isRefreshing ? (
          <li className="muted">Loading rules...</li>
        ) : rules.length ? (
          rules.map((r) => (
            <li key={r.id}>
              {r.name} at {r.triggerConfig.at} {"->"} {r.actionType === "haToggle" ? "Toggle Home Assistant entity" : "Create local reminder"}
            </li>
          ))
        ) : (
          <li className="muted">No rules yet.</li>
        )}
      </ul>
    </section>
  );
}
