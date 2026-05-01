import type { FormEvent } from "react";
import { useState } from "react";
import { getErrorMessage } from "../../lib/errors";

type Props = {
  onDone: () => Promise<void>;
  onError: (message: string) => void;
};

export function QuickNoteForm({ onDone, onError }: Props): JSX.Element {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
    try {
      if (!title.trim() && !content.trim()) throw new Error("Write a title or content before adding a note.");
      await window.assistantApi.createNote({ title: title.trim() || "Untitled", content: content.trim(), tags: [], pinned: false });
      setTitle("");
      setContent("");
      await onDone();
    } catch (err) {
      onError(getErrorMessage(err));
    }
  }
  return (
    <form className="row" onSubmit={(event) => void handleSubmit(event)}>
      <input aria-label="Quick note title" placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
      <input aria-label="Quick note content" placeholder="Content" value={content} onChange={(e) => setContent(e.target.value)} />
      <button type="submit">
        Add
      </button>
    </form>
  );
}
