import { NextRequest, NextResponse } from "next/server";
import { getPersonaFromPath } from "@/lib/persona";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const pathname = searchParams.get("pathname") || "";

  const persona = await getPersonaFromPath(pathname);

  if (!persona) {
    return NextResponse.json({ error: "Persona not found" }, { status: 404 });
  }

  return NextResponse.json(persona);
}
