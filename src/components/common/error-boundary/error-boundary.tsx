import { Component, type ReactNode } from "react";
import { ErrorFallback } from "#/components/common/error-fallback/error-fallback";

interface AppErrorBoundaryState {
	error: Error | null;
}

/** Last-resort branded boundary for unexpected render failures. */
export class AppErrorBoundary extends Component<
	{ children: ReactNode },
	AppErrorBoundaryState
> {
	state: AppErrorBoundaryState = { error: null };

	static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
		return { error };
	}

	componentDidCatch(error: Error, info: { componentStack?: string | null }) {
		if (import.meta.env.DEV) {
			console.error("Avio render error", error, info.componentStack);
		}
	}

	private reset = () => {
		this.setState({ error: null });
	};

	render() {
		if (this.state.error) {
			return <ErrorFallback error={this.state.error} onRetry={this.reset} />;
		}
		return this.props.children;
	}
}
