import { createFileRoute } from "@tanstack/react-router";
import { ConnectScreen } from "#/components/auth/connect-screen/connect-screen";

export const Route = createFileRoute("/connect")({ component: ConnectScreen });
