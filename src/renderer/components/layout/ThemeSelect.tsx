import type { ThemeMode } from "../../types";
import { THEME_OPTIONS } from "../../constants/themes";

type Props = {
  theme: ThemeMode;
  onChange: (theme: ThemeMode) => void;
  /** Distinct id when multiple selects exist (e.g. desk + household window). */
  selectId?: string;
};

export function ThemeSelect({ theme, onChange, selectId = "theme-select" }: Props): JSX.Element {
  return (
    <div className="themeSelectWrap">
      <label htmlFor={selectId} className="srOnly">
        Appearance
      </label>
      <select
        id={selectId}
        className="themeSelect themeSelectWide"
        value={theme}
        onChange={(e) => onChange(e.target.value as ThemeMode)}
      >
        {THEME_OPTIONS.map((o) => (
          <option key={o.id} value={o.id}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
