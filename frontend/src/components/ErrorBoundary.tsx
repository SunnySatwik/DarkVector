import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Card, Button } from "./ui/DesignSystem";

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an unhandled exception:", error, errorInfo);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex flex-col items-center justify-center p-8 text-center min-h-[300px]">
          <Card className="max-w-md p-6 bg-black/45 border border-red-500/20 shadow-xl shadow-red-500/5">
            <div className="flex flex-col items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-400" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-gray-200 font-mono">
                  Visualizer Failure
                </h3>
                <p className="text-xs text-gray-400 font-sans leading-relaxed">
                  An error occurred while rendering the topology graph. This is usually caused by missing telemetry properties or corrupted model node associations.
                </p>
                {this.state.error && (
                  <pre className="mt-3 p-2 bg-black/50 border border-[#23262F]/50 rounded text-[10px] text-red-300 font-mono text-left overflow-x-auto max-w-full">
                    {this.state.error.message}
                  </pre>
                )}
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={this.handleRetry}
                className="mt-2 text-xs font-mono flex items-center gap-1.5 border-[#23262F] hover:border-gray-500 text-gray-300 hover:text-white"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Reset Viewport</span>
              </Button>
            </div>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
