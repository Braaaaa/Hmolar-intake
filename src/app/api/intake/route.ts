// src/app/api/intake/route.ts
import { IntakeSchema } from '@/lib/validation/intake';

export async function POST(req: Request) {
  try {
    const json = await req.json();

    // Honeypot check
    if (json?.botField) {
      return Response.json({ ok: false, message: 'Spam gedetecteerd' }, { status: 400 });
    }

    const parsed = IntakeSchema.safeParse(json);
    if (!parsed.success) {
      return Response.json(
        { ok: false, message: 'Validatie mislukt', issues: parsed.error.flatten() },
        { status: 400 },
      );
    }

    // TODO: hier komt DB‑opslag / e‑mail / notificatie
    // Voor nu loggen we het server‑side:
    console.log('New intake:', {
      ...parsed.data,
      // gevoelige data log je in productie NIET in plaintext
    });

    return Response.json({ ok: true });
  } catch (err) {
    console.error(err);
    return Response.json({ ok: false, message: 'Interne serverfout' }, { status: 500 });
  }
}
