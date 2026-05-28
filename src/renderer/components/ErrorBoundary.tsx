import { Component, type ErrorInfo, type ReactNode } from "react";
import { devConsoleError } from "../lib/devConsole";
import { getAssistantApi } from "../lib/assistantApi";

type Props = {
  children: ReactNode;
  scope?: string;
  fallbackTitle?: string;
  onCaught?: (details: { scope: string; message: string }) => void;
  resetKeys?: readonly unknown[];
};

type State = { hasError: boolean; message: string };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: "" };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message || "Something went wrong." };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    const scope = this.props.scope ?? "app";
    devConsoleError(`[assistant:ErrorBoundary:${scope}]`, error, info.componentStack);
    const api = getAssistantApi();
    if (api?.logRendererError) {
      void api
        .logRendererError({
          message: `[${scope}] ${error.message || String(error)}`,
          stack: error.stack,
          componentStack: info.componentStack ?? undefined
        })
        .catch(() => {
          /* ignore IPC failures */
        });
    }
    this.props.onCaught?.({ scope, message: error.message || "Something went wrong." });
  }

  componentDidUpdate(prevProps: Props): void {
    if (!this.state.hasError) return;
    if (!this.props.resetKeys || !prevProps.resetKeys) return;
    const hasChanged =
      this.props.resetKeys.length !== prevProps.resetKeys.length ||
      this.props.resetKeys.some((value, idx) => !Object.is(value, prevProps.resetKeys?.[idx]));
    if (hasChanged) {
      this.setState({ hasError: false, message: "" });
    }
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="error-boundary-fallback" role="alert" aria-live="assertive">
          <h1 className="error-boundary-fallback__title">{this.props.fallbackTitle ?? "The desk hit a snag"}</h1>
          <p className="error-boundary-fallback__body">{this.state.message}</p>
          <button
            type="button"
            className="error-boundary-fallback__retry"
            onClick={() => this.setState({ hasError: false, message: "" })}
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export function PanelErrorBoundary({
  children,
  scope,
  fallbackTitle,
  onCaught,
  resetKeys
}: Props): JSX.Element {
  return (
    <ErrorBoundary
      scope={scope ?? "panel"}
      fallbackTitle={fallbackTitle ?? "This panel hit a snag"}
      onCaught={onCaught}
      resetKeys={resetKeys}
    >
      {children}
    </ErrorBoundary>
  );
}
