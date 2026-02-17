import { createClient as createAdminClient } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";

import { env } from "~/env";
import { getAppRole, isAllowedEmail } from "~/server/auth/domain";
import { createClient } from "~/utils/supabase/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const rawNextPath = requestUrl.searchParams.get("next");
  const nextPath =
    rawNextPath && rawNextPath.startsWith("/") && !rawNextPath.startsWith("//")
      ? rawNextPath
      : "/";

  const forwardedHostHeader = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const forwardedProtoHeader = request.headers.get("x-forwarded-proto") ?? requestUrl.protocol.replace(":", "");
  const forwardedHost = forwardedHostHeader?.split(",")[0]?.trim();
  const forwardedProto = forwardedProtoHeader?.split(",")[0]?.trim();
  const baseUrl = forwardedHost ? `${forwardedProto}://${forwardedHost}` : requestUrl.origin;

  if (!code) {
    return NextResponse.redirect(new URL("/?error=oauth_callback_failed", baseUrl));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(new URL("/?error=oauth_callback_failed", baseUrl));
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isAllowedEmail(user.email)) {
    await supabase.auth.signOut();
    return NextResponse.redirect(new URL("/?error=domain_not_allowed", baseUrl));
  }

  const appRole = getAppRole({
    email: user.email,
  });

  // Write role to app_metadata via admin client (users cannot tamper with app_metadata)
  const adminClient = createAdminClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
  );

  await adminClient.auth.admin.updateUserById(user.id, {
    app_metadata: { app_role: appRole },
  });

  return NextResponse.redirect(new URL(nextPath, baseUrl));
}
