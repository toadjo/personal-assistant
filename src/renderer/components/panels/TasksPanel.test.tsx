import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TasksPanel } from "./TasksPanel";

describe("TasksPanel", () => {
  it("creates, completes, deletes, and filters tasks via callbacks", async () => {
    const onSaveTask = vi.fn().mockResolvedValue(undefined);
    const onComplete = vi.fn().mockResolvedValue(undefined);
    const onDelete = vi.fn().mockResolvedValue(undefined);
    const setFilter = vi.fn();

    render(
      <TasksPanel
        filter="all"
        setFilter={setFilter}
        tasks={[
          {
            id: "t1",
            title: "Pay rent",
            notes: "",
            dueAt: new Date(Date.now() + 86_400_000).toISOString(),
            priority: "high",
            status: "open",
            recurrence: "none",
            notifyChannel: "desktop",
            createdAt: "",
            updatedAt: "",
            lastCompletedAt: null
          }
        ]}
        onSaveTask={onSaveTask}
        onComplete={onComplete}
        onDelete={onDelete}
      />
    );

    fireEvent.change(screen.getByLabelText(/Filter tasks/i), { target: { value: "open" } });
    expect(setFilter).toHaveBeenCalledWith("open");

    fireEvent.change(screen.getByPlaceholderText(/Task title/i), { target: { value: "Plan week" } });
    fireEvent.click(screen.getByRole("button", { name: "Add" }));
    await waitFor(() => expect(onSaveTask).toHaveBeenCalled());

    fireEvent.click(screen.getByLabelText(/Complete task Pay rent/i));
    expect(onComplete).toHaveBeenCalledWith("t1");

    fireEvent.click(screen.getByLabelText(/Delete task Pay rent/i));
    expect(onDelete).toHaveBeenCalledWith("t1");
  });
});
