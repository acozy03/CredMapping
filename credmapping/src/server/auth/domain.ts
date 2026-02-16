type AppRole = "superadmin" | "admin" | "user";

const allowedDomains = ["vestasolutions.com", "vestatelemed.com"] as const;

export const isAllowedEmail = (email: string | null | undefined): boolean => {
  if (!email) return false;

  const [, domain = ""] = email.toLowerCase().split("@");
  return allowedDomains.includes(domain as (typeof allowedDomains)[number]);
};

export const getAppRole = (params: {
  email: string | null | undefined;
  metadataRole?: unknown;
}): AppRole => {
  const metadataRole =
    typeof params.metadataRole === "string"
      ? params.metadataRole.toLowerCase()
      : undefined;

  if (metadataRole === "superadmin") return "superadmin";
  if (metadataRole === "admin") return "admin";
  if (metadataRole === "user") return "user";

  if (params.email?.toLowerCase().endsWith("@vestasolutions.com")) {
    return "admin";
  }

  return "user";
};
