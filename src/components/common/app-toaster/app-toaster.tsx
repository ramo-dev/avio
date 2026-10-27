import { Toaster } from "react-hot-toast";

export function AppToaster() {
	return (
		<Toaster
			position="top-center"
			toastOptions={{
				duration: 5000,
				style: {
					background: "var(--popover)",
					color: "var(--popover-foreground)",
					border: "1px solid var(--border)",
					borderRadius: "0.625rem",
					fontSize: "0.875rem",
					boxShadow:
						"0 8px 24px color-mix(in oklab, var(--foreground) 12%, transparent)",
				},
				error: {
					iconTheme: {
						primary: "var(--destructive)",
						secondary: "var(--popover)",
					},
				},
				success: {
					iconTheme: {
						primary: "var(--primary)",
						secondary: "var(--popover)",
					},
				},
			}}
		/>
	);
}
