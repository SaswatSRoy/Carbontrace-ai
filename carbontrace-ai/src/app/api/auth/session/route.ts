import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "../../../../lib/firebase/admin";

/**
 * Creates a Firebase session cookie from a client-side ID token.
 */
export async function POST(req: NextRequest) {
  try {
    const { idToken } = await req.json();

    if (!idToken) {
      return NextResponse.json({ error: "Missing ID token" }, { status: 400 });
    }

    // Set session expiration to 5 days
    const expiresIn = 60 * 60 * 24 * 5 * 1000;
    
    // Create the session cookie
    const sessionCookie = await adminAuth.createSessionCookie(idToken, { expiresIn });

    const response = NextResponse.json({ status: "success" }, { status: 200 });

    // Set the cookie on the response
    // Firebase Hosting recommends using the name "__session" for cache compatibility
    response.cookies.set({
      name: "__session",
      value: sessionCookie,
      maxAge: expiresIn / 1000,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production" && !req.url.includes("localhost"),
      path: "/",
      sameSite: "lax",
    });

    return response;
  } catch (error) {
    console.error("Session creation error:", error);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function DELETE(req: NextRequest) {
  const response = NextResponse.json({ status: "success" }, { status: 200 });
  response.cookies.delete("__session");
  return response;
}
