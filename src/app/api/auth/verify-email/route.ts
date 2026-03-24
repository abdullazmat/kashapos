import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import User from "@/models/User";
import { apiError } from "@/lib/api-helpers";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");
  const email = searchParams.get("email");

  if (!token || !email) {
    return apiError("Invalid verification request", 400);
  }

  try {
    await dbConnect();
    const user = await User.findOne({ 
      email: email.toLowerCase(), 
      emailVerificationToken: token 
    });

    if (!user) {
      return apiError("Invalid or expired verification token", 400);
    }

    user.emailVerified = true;
    user.emailVerificationToken = undefined;
    await user.save();

    // Redirect to a success page
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
    return NextResponse.redirect(new URL("/sign-in?verified=true", baseUrl));
  } catch (error) {
    console.error("Verification error:", error);
    return apiError("Internal server error", 500);
  }
}
