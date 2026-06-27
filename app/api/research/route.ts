import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  return NextResponse.json({ message: "Research API Placeholder" });
}

export async function POST(request: NextRequest) {
  return NextResponse.json({ message: "Research API Placeholder" });
}
