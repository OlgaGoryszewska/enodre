import { NextResponse } from "next/server";
import { getUpworkAuthorizeUrl } from "@/lib/upwork-auth";

const STATE_COOKIE = "upwork_oauth_state";

export async function GET(request: Request) {
  const state = crypto.randomUUID();

  let authorizeUrl: string;
  try {
    authorizeUrl = getUpworkAuthorizeUrl(state);
  } catch (error) {
    console.error("Failed to build Upwork authorize URL:", error);
    return NextResponse.redirect(
      new URL("/admin/dashboard?upwork_error=config", request.url)
    );
  }

  const response = NextResponse.redirect(authorizeUrl);
  response.cookies.set(STATE_COOKIE, state, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });
  return response;
}
