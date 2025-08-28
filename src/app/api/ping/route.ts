import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    ok: true,
    now: new Date().toISOString(),
    env: process.env.NODE_ENV || "unknown",
  });
}
