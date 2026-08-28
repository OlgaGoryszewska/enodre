import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { exchangeCodeForToken } from "@/lib/upwork-auth";

const STATE_COOKIE = "upwork_oauth_state";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const expectedState = (await cookies()).get(STATE_COOKIE)?.value;

  const redirectUrl = new URL("/admin/upwork", request.url);

  if (!code || !state || !expectedState || state !== expectedState) {
    redirectUrl.searchParams.set("upwork_error", "state_mismatch");
    const response = NextResponse.redirect(redirectUrl);
    response.cookies.delete(STATE_COOKIE);
    return response;
  }

  try {
    await exchangeCodeForToken(code);
    redirectUrl.searchParams.set("upwork_connected", "1");
  } catch (error) {
    console.error("Failed to exchange Upwork authorization code:", error);
    redirectUrl.searchParams.set("upwork_error", "exchange_failed");
  }

  const response = NextResponse.redirect(redirectUrl);
  response.cookies.delete(STATE_COOKIE);
  return response;
}
