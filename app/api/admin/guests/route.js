import { NextResponse } from "next/server";
import { query } from "../../../../lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const result = await query(
    "SELECT id, name, status, notes, responded_at, created_at FROM guests ORDER BY name ASC"
  );
  return NextResponse.json({ guests: result.rows });
}

export async function POST(request) {
  const body = await request.json().catch(() => null);
  const name = (body?.name || "").trim();

  if (!name) {
    return NextResponse.json(
      { error: "Informe o nome do convidado." },
      { status: 400 }
    );
  }

  const result = await query(
    `INSERT INTO guests (name, status) VALUES ($1, 'pendente')
     RETURNING id, name, status, notes, responded_at, created_at`,
    [name]
  );

  return NextResponse.json({ guest: result.rows[0] }, { status: 201 });
}
