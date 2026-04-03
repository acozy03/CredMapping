export const INCIDENT_CATEGORIES = [
  "Personal Info",
  "Education & Training",
  "Practice / Employer",
  "Facility Affiliations",
  "Work History",
  "Peer References",
  "Licensure",
  "Certifications",
  "Medical Malpractice",
  "Health Info",
  "Event Log",
  "Documents",
] as const;

export type IncidentCategory = (typeof INCIDENT_CATEGORIES)[number];
