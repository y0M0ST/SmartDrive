import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = { children: ReactNode };
type State = { hasError: boolean; message?: string };

export class MapErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("[MapErrorBoundary]", error, info.componentStack);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="flex h-full min-h-[480px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-muted/50 p-6 text-center">
          <p className="text-sm font-bold text-foreground">Không tải được bản đồ</p>
          <p className="max-w-md text-xs text-muted-foreground">
            {this.state.message ?? "Lỗi không xác định. Thử tải lại trang hoặc kiểm tra console."}
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}
