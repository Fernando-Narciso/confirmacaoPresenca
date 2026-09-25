import { NextResponse } from "next/server";
import { query } from "../../../../lib/db";

export const runtime = "nodejs";

function normalize(str) {
  return (str || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const term = normalize(searchParams.get("name") || "");

  if (!term) {
    return NextResponse.json(
      { error: "Digite um nome para buscar." },
      { status: 400 }
    );
  }

  const result = await query(
    "SELECT id, name, status, responded_at FROM guests ORDER BY name ASC"
  );

  const matches = result.rows.filter((g) => normalize(g.name).includes(term));

  return NextResponse.json({
    matches: matches.map((m) => ({
      id: m.id,
      name: m.name,
      status: m.status,
      respondedAt: m.responded_at,
    })),
  });
}
