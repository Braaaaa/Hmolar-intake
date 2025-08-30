import { NextResponse } from 'next/server';

import type { Prisma } from '@prisma/client';

import { isLocale } from '@/i18n/config';
import { encryptJsonToBuffer } from '@/lib/crypto';
import { prisma } from '@/lib/prisma';
import { IntakeSchema } from '@/lib/validation/intake';

export const runtime = 'nodejs';

function getClientIp(req: Request): string | undefined {
  const h = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip');
  if (!h) return undefined;
  return h.split(',')[0].trim();
}

function guessLocale(req: Request): string {
  try {
    const ref = req.headers.get('referer');
    if (ref) {
      const u = new URL(ref);
      const first = u.pathname.split('/').filter(Boolean)[0];
      if (isLocale(first)) return first;
    }
  } catch {}
  return 'nl';
}

/**
 * Accept an intake submission, validate it, and persist to the database.
 * Encrypts the raw JSON payload into `encBlob` using AES-256-GCM.
 */
export async function POST(req: Request) {
  try {
    const json = await req.json();

    if (json?.botField) {
      return NextResponse.json({ ok: false, message: 'Spam gedetecteerd' }, { status: 400 });
    }

    const parsed = IntakeSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, message: 'Validatie mislukt', issues: parsed.error.flatten() },
        { status: 400 },
      );
    }
    const data = parsed.data;

    const dob = new Date(data.dateOfBirth);
    if (Number.isNaN(dob.getTime())) {
      return NextResponse.json({ ok: false, message: 'Ongeldige geboortedatum' }, { status: 400 });
    }

    const residentType = data.residentType as string;

    const medicationsJson: Prisma.InputJsonValue = {
      selected: data.medical?.medicationsSelected ?? [],
      details: data.medical?.medicationDetails ?? {},
    };
    const allergiesJson: Prisma.InputJsonValue = {
      selected: data.medical?.allergiesSelected ?? [],
      details: data.medical?.allergyDetails ?? {},
    };
    const conditionsJson: Prisma.InputJsonValue = data.medical?.conditions ?? {};

    const fullName = [data.firstName, data.lastName].filter(Boolean).join(' ').trim();
    const primaryPhone: string | null = data?.phone1?.number?.trim() || null;
    const email: string | null = data?.email?.trim() || null;
    const address: string | null =
      [data?.address?.street, data?.address?.number, data?.address?.city]
        .filter((v) => !!v && String(v).trim())
        .join(', ') || null;
    const country: string | null = (data?.address?.country as string) || null;
    const userAgent = req.headers.get('user-agent') ?? null;
    const ipInet = getClientIp(req) ?? null;
    const locale = guessLocale(req);
    const marketingOptIn = !!data.marketingConsent;
    const privacyAccepted = data.privacyConsent === true;

    const hadComplications =
      (data?.medical?.complicationsBefore ?? '').toString().toLowerCase() === 'ja';
    const complicationsNote = data?.medical?.complicationsDetails?.trim()
      ? data.medical.complicationsDetails
      : null;

    const key = process.env.INTAKE_ENC_KEY;
    if (!key) {
      return NextResponse.json(
        { ok: false, message: 'Server niet juist geconfigureerd (INTAKE_ENC_KEY ontbreekt)' },
        { status: 500 },
      );
    }
    const encBlob = encryptJsonToBuffer(data, key);

    const created = await prisma.intakeSubmission.create({
      data: {
        fullName,
        dob,
        phone: primaryPhone,
        email,
        residentType,
        address,
        country,
        medications: medicationsJson,
        allergies: allergiesJson,
        conditions: conditionsJson,
        locale,
        marketingOptIn,
        privacyAccepted,
        userAgent,
        ipInet,
        hadComplications,
        complicationsNote,
        encBlob,
      },
      select: { id: true, createdAt: true },
    });

    if (process.env.NODE_ENV === 'development') {
      console.log('New intake stored:', created);
    }

    return NextResponse.json({ ok: true, id: created.id, createdAt: created.createdAt });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ ok: false, message: 'Interne serverfout' }, { status: 500 });
  }
}
