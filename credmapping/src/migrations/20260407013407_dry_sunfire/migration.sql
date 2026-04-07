ALTER TABLE "provider_vesta_privileges" ALTER COLUMN "privilege_tier" SET DATA TYPE text USING "privilege_tier"::text;--> statement-breakpoint
DROP TYPE "privilege_tier";--> statement-breakpoint
CREATE TYPE "privilege_tier" AS ENUM('Inactive', 'Full', 'Temp', 'In Progress');--> statement-breakpoint
ALTER TABLE "provider_vesta_privileges" ALTER COLUMN "privilege_tier" SET DATA TYPE "privilege_tier" USING "privilege_tier"::"privilege_tier";--> statement-breakpoint
ALTER TABLE "facilities" ALTER COLUMN "proxy" SET DATA TYPE boolean USING CASE
  WHEN "proxy" IS NULL THEN NULL
  WHEN lower(trim("proxy")) IN ('proxy', 'true', 't', 'yes', 'y', '1') THEN true
  WHEN lower(trim("proxy")) IN ('non-proxy', 'non proxy', 'false', 'f', 'no', 'n', '0') THEN false
  ELSE "proxy"::boolean
END;--> statement-breakpoint
ALTER TABLE "incident_logs" ALTER COLUMN "subcategory" SET DATA TYPE "incident_category" USING "subcategory"::"incident_category";
