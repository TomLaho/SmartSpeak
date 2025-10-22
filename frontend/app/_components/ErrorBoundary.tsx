"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ErrorBoundaryProps {
  readonly children: ReactNode;
  readonly resetKey?: string;
}

interface ErrorBoundaryState {
  readonly hasError: boolean;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Frontend component crashed", error, info);
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps) {
    if (prevProps.resetKey !== this.props.resetKey && this.state.hasError) {
      // Reset the boundary if the upstream data changed.
      // eslint-disable-next-line react/no-did-update-set-state
      this.setState({ hasError: false });
    }
  }

  private handleReset = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="mx-auto mt-12 max-w-2xl rounded-2xl border border-border/60 bg-card/70 p-8 text-center shadow-elevated backdrop-blur">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <AlertTriangle className="h-7 w-7" aria-hidden />
          </div>
          <h2 className="mt-6 text-2xl font-semibold">Something went off script</h2>
          <p className="mt-3 text-sm text-muted-foreground">
            We hit an unexpected error while rendering this section. Try refreshing the view or start a fresh analysis.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Button onClick={this.handleReset} variant="secondary">
              <RefreshCw className="mr-2 h-4 w-4" aria-hidden /> Try again
            </Button>
            <Button asChild variant="outline">
              <a href="/">Return home</a>
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
