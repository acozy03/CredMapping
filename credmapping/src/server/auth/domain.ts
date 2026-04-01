export type AppRole = "superadmin" | "admin" | "user";
export type AgentTeam = "IN" | "US";

const allowedDomains = ["vestasolutions.com", "vestatelemed.com"] as const;

const domainTeamMap: Record<string, AgentTeam> = {
  "vestatelemed.com": "US",
  "vestasolutions.com": "IN",
};

export const isAllowedEmail = (email: string | null | undefined): boolean => {
  if (!email) return false;

  const [, domain = ""] = email.toLowerCase().split("@");
  return allowedDomains.includes(domain as (typeof allowedDomains)[number]);
};

export const getTeamFromEmail = (email: string | null | undefined): AgentTeam | null => {
  if (!email) return null;

  const [, domain = ""] = email.toLowerCase().split("@");
  return domainTeamMap[domain] ?? null;
};

export const getAppRole = (params: {
  agentRole: string | null | undefined;
}): AppRole => {
  const normalizedRole = params.agentRole?.trim().toLowerCase();

  if (normalizedRole === "superadmin") return "superadmin";
  if (normalizedRole === "admin") return "admin";

  return "user";
};
