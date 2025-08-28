import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/** Lightweight DB health endpoint used for quick probes. */
export async function GET() {
  try {
    // Connectivity test
    await prisma.$queryRaw`SELECT 1`;
    const count = await prisma.intakeSubmission.count();
    return NextResponse.json({
      ok: true,
      count,
      env: process.env.NODE_ENV || "unknown",
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ ok: false, error: "DB error" }, { status: 500 });
  }
}
