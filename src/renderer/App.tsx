import { AssistantShell } from "./components/AssistantShell";
import { HouseholdShell } from "./components/HouseholdShell";

function isHouseholdWindow(): boolean {
  return window.location.hash === "#household";
}

export function App(): JSX.Element {
  return isHouseholdWindow() ? <HouseholdShell /> : <AssistantShell />;
}
