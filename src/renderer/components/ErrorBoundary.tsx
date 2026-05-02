import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = { children: ReactNode };

type State = { hasError: boolean; message: string };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: "" };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message || "Something went wrong." };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("[assistant:ErrorBoundary]", error, info.componentStack);
    const api = window.assistantApi;
    if (api?.logRendererError) {
      void api
        .logRendererError({
          message: error.message || String(error),
          stack: error.stack,
          componentStack: info.componentStack ?? undefined
        })
        .catch(() => {
          /* ignore IPC failures */
        });
    }
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="error-boundary-fallback" role="alert">
          <h1 className="error-boundary-fallback__title">The desk hit a snag</h1>
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
