import { NextResponse } from "next/server";
import { query } from "../../../../lib/db";

export const runtime = "nodejs";

export async function POST(request) {
  const body = await request.json().catch(() => null);
  const id = body?.id;
  const status = body?.status;

  if (!id || !["confirmado", "nao_confirmado"].includes(status)) {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  }

  const settings = await query(
    "SELECT deadline_date FROM event_settings WHERE id = 1"
  );
  const deadline = settings.rows[0]?.deadline_date;
  if (deadline && new Date(deadline) < new Date()) {
    return NextResponse.json(
      { error: "O prazo para confirmação já encerrou." },
      { status: 403 }
    );
  }

  const result = await query(
    `UPDATE guests SET status = $1, responded_at = NOW()
     WHERE id = $2
     RETURNING id, name, status, responded_at`,
    [status, id]
  );

  if (result.rowCount === 0) {
    return NextResponse.json(
      { error: "Convidado não encontrado." },
      { status: 404 }
    );
  }

  return NextResponse.json({ guest: result.rows[0] });
}
