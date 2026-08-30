import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

import { getMe } from "@/lib/portal.functions";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const me = await getMe();
    if (!me.user) throw redirect({ to: "/auth" });
    return { user: me.user };
  },
  component: () => <Outlet />,
});
