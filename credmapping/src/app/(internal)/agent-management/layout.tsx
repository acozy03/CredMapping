import { requireRole } from "~/server/auth/route-access";

export default async function AgentManagementLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireRole(["superadmin"]);
  return <>{children}</>;
}
