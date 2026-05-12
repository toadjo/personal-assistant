import { useEffect, useState } from "react";
import { deskWelcomeLine } from "../../lib/greeting";

type Props = {
  userPreferredName: string;
  userPreferredNameIsSet: boolean;
  onSaveUserPreferredName: (trimmed: string) => void | Promise<void>;
  /** Prefix for input id when multiple bars exist on screen. */
  idPrefix: string;
};

export function WelcomeBar({
  userPreferredName,
  userPreferredNameIsSet,
  onSaveUserPreferredName,
  idPrefix
}: Props): JSX.Element {
  const [draft, setDraft] = useState(userPreferredName);

  useEffect(() => {
    setDraft(userPreferredName);
  }, [userPreferredName]);

  const line = deskWelcomeLine(userPreferredName, userPreferredNameIsSet);
  const inputId = `${idPrefix}-preferred-name`;

  return (
    <div className="welcomeRow">
      <p className="welcomeText" aria-live="polite">
        {line}
      </p>
      <form
        className="welcomeNameForm"
        onSubmit={(e) => {
          e.preventDefault();
          void onSaveUserPreferredName(draft.trim());
        }}
      >
        <label htmlFor={inputId} className="srOnly">
          Your first name or nickname
        </label>
        <input
          id={inputId}
          className="welcomeNameInput"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Your name"
          maxLength={60}
          autoComplete="nickname"
        />
        <button type="submit" className="ghostButton welcomeSave">
          Save
        </button>
        {userPreferredNameIsSet ? (
          <button
            type="button"
            className="ghostButton welcomeClear"
            onClick={() => {
              setDraft("");
              void onSaveUserPreferredName("");
            }}
          >
            Clear
          </button>
        ) : null}
      </form>
      {!userPreferredNameIsSet ? (
        <p className="welcomeHint muted">Save your name to personalize this greeting.</p>
      ) : null}
    </div>
  );
}
