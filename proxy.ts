import { NextResponse } from "next/server";
import { auth } from "@/auth";

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const { pathname } = req.nextUrl;
  const isPublicPage = pathname.startsWith("/login") || pathname.startsWith("/signup");
  const isLeaderRoute =
    pathname.startsWith("/members") || pathname.startsWith("/worklog/team") || pathname.startsWith("/activity/team");

  if (!isLoggedIn && !isPublicPage) {
    return NextResponse.redirect(new URL("/login", req.url));
  }
  if (isLoggedIn && isPublicPage) {
    return NextResponse.redirect(new URL("/", req.url));
  }
  if (isLoggedIn && isLeaderRoute && req.auth?.user.role !== "LEADER") {
    return NextResponse.redirect(new URL("/", req.url));
  }
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
