import { setAutomationFocusIntent } from "../../lib/automation-focus-intent";
import type { PersonalModule } from "../../hooks/shell/useShellNav";

export type ShellModuleTabsProps = {
  active: PersonalModule;
  onSelect: (m: PersonalModule) => void;
  onOpenHousehold: () => void;
};

export function ShellModuleTabs({ active, onSelect, onOpenHousehold }: ShellModuleTabsProps): JSX.Element {
  return (
    <div className="moduleTabs">
      <button
        type="button"
        className={`moduleTab ${active === "home" ? "moduleTabActive" : ""}`}
        onClick={() => onSelect("home")}
      >
        Home
      </button>
      <button
        type="button"
        className={`moduleTab ${active === "today" ? "moduleTabActive" : ""}`}
        onClick={() => onSelect("today")}
      >
        Today
      </button>
      <button
        type="button"
        className={`moduleTab ${active === "inbox" ? "moduleTabActive" : ""}`}
        onClick={() => onSelect("inbox")}
      >
        Inbox
      </button>
      <button
        type="button"
        className={`moduleTab ${active === "memos" ? "moduleTabActive" : ""}`}
        onClick={() => onSelect("memos")}
      >
        Memos
      </button>
      <button
        type="button"
        className={`moduleTab ${active === "reminders" ? "moduleTabActive" : ""}`}
        onClick={() => onSelect("reminders")}
      >
        Reminders
      </button>
      <button
        type="button"
        className={`moduleTab ${active === "tasks" ? "moduleTabActive" : ""}`}
        onClick={() => onSelect("tasks")}
      >
        Tasks
      </button>
      <button
        type="button"
        className={`moduleTab ${active === "automations" ? "moduleTabActive" : ""}`}
        onClick={() => {
          setAutomationFocusIntent("");
          onOpenHousehold();
        }}
      >
        Automations
      </button>
      <button
        type="button"
        className={`moduleTab ${active === "lifeAreas" ? "moduleTabActive" : ""}`}
        onClick={() => onSelect("lifeAreas")}
      >
        Life Areas
      </button>
      <button
        type="button"
        className={`moduleTab ${active === "finance" ? "moduleTabActive" : ""}`}
        onClick={() => onSelect("finance")}
      >
        Finance
      </button>
      <button
        type="button"
        className={`moduleTab ${active === "car" ? "moduleTabActive" : ""}`}
        onClick={() => onSelect("car")}
      >
        Car
      </button>
      <button
        type="button"
        className={`moduleTab ${active === "family" ? "moduleTabActive" : ""}`}
        onClick={() => onSelect("family")}
      >
        Family
      </button>
      <button
        type="button"
        className={`moduleTab ${active === "health" ? "moduleTabActive" : ""}`}
        onClick={() => onSelect("health")}
      >
        Health
      </button>
      <button
        type="button"
        className={`moduleTab ${active === "hobbies" ? "moduleTabActive" : ""}`}
        onClick={() => onSelect("hobbies")}
      >
        Hobbies
      </button>
    </div>
  );
}
