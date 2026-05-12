import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Search, X, FileText, ListTodo, Bell, Zap, Power, Settings } from "lucide-react";
import { buildSearchIndex, search } from "../../lib/search/searchEngine";
import type { SearchResult } from "../../lib/search/types";
import type { Note, Task, Reminder, AutomationRule } from "../../../shared/types";
import type { HaDeviceRow } from "../../types";
import { IconButton } from "../ui/IconButton";

const CATEGORY_ICONS: Record<SearchResult["category"], typeof FileText> = {
  note: FileText,
  task: ListTodo,
  reminder: Bell,
  automation: Zap,
  device: Power,
  setting: Settings
};

type Props = {
  notes: Note[];
  tasks: Task[];
  reminders: Reminder[];
  rules: AutomationRule[];
  devices: HaDeviceRow[];
  onOpenNote?: (noteId: string) => void;
  onOpenTask?: (taskId: string) => void;
  onOpenReminder?: (reminderId: string) => void;
  onOpenAutomation?: (ruleId: string) => void;
  onToggleDevice?: (entityId: string) => void;
  onOpenAppearance?: () => void;
  onClose: () => void;
};

export function CommandPalette({
  notes,
  tasks,
  reminders,
  rules,
  devices,
  onOpenNote,
  onOpenTask,
  onOpenReminder,
  onOpenAutomation,
  onToggleDevice,
  onOpenAppearance,
  onClose
}: Props): JSX.Element {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const index = useMemo(
    () => buildSearchIndex(notes, tasks, reminders, rules, devices),
    [notes, tasks, reminders, rules, devices]
  );

  const results = useMemo(() => search(query, index), [query, index]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        const result = results[selectedIndex];
        if (result) {
          handleSelect(result);
        }
        return;
      }
    },
    [results, selectedIndex, onClose]
  );

  const handleSelect = useCallback(
    (result: SearchResult) => {
      const [type, rawId] = result.id.split(":", 2);
      const id = rawId ?? "";
      switch (type) {
        case "note":
          onOpenNote?.(id);
          break;
        case "task":
          onOpenTask?.(id);
          break;
        case "reminder":
          onOpenReminder?.(id);
          break;
        case "automation":
          onOpenAutomation?.(id);
          break;
        case "device":
          onToggleDevice?.(id);
          break;
        case "setting":
          if (id === "theme" || id === "density") {
            onOpenAppearance?.();
          }
          break;
      }
      onClose();
    },
    [onOpenNote, onOpenTask, onOpenReminder, onOpenAutomation, onToggleDevice, onOpenAppearance, onClose]
  );

  useEffect(() => {
    const active = listRef.current?.children[selectedIndex] as HTMLElement | undefined;
    active?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  return (
    <div className="commandPaletteOverlay" onClick={onClose}>
      <div className="commandPalette" onClick={(e) => e.stopPropagation()}>
        <div className="commandPaletteHeader">
          <Search size={16} className="commandPaletteSearchIcon" />
          <input
            ref={inputRef}
            type="text"
            className="commandPaletteInput"
            placeholder="Search notes, tasks, reminders, automations, devices..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            aria-label="Search"
          />
          <IconButton icon={X} label="Close" title="Close" onClick={onClose} variant="ghost" size={16} />
        </div>

        {results.length === 0 ? (
          <div className="commandPaletteEmpty">No results.</div>
        ) : (
          <ul ref={listRef} className="commandPaletteList" role="listbox">
            {results.map((result, i) => {
              const Icon = CATEGORY_ICONS[result.category];
              const isSelected = i === selectedIndex;
              return (
                <li
                  key={result.id}
                  className={`commandPaletteItem ${isSelected ? "commandPaletteItemSelected" : ""}`}
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => handleSelect(result)}
                  onMouseEnter={() => setSelectedIndex(i)}
                >
                  <Icon size={16} className="commandPaletteItemIcon" />
                  <div className="commandPaletteItemContent">
                    <div className="commandPaletteItemTitle">{result.title}</div>
                    <div className="commandPaletteItemSubtitle">
                      {result.subtitle && <span>{result.subtitle} · </span>}
                      <span className="commandPaletteItemAction">{result.action}</span>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        <div className="commandPaletteFooter">
          <kbd>↑↓</kbd> Navigate · <kbd>Enter</kbd> Open · <kbd>Esc</kbd> Close
        </div>
      </div>
    </div>
  );
}
