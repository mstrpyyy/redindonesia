import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const secret = new TextEncoder().encode(process.env.JWT_SECRET);

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get("session")?.value;

  if (pathname === "/admin/login") {
    if (!token) {
      return NextResponse.next();
    }

    try {
      await jwtVerify(token, secret);
      return NextResponse.redirect(new URL("/admin", request.url));
    } catch {
      return NextResponse.next();
    }
  }

  if (!token) {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  try {
    await jwtVerify(token, secret);
    return NextResponse.next();
  } catch {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }
}

export const config = {
  matcher: "/admin/:path*",
};