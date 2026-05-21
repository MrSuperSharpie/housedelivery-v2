import { NextResponse } from "next/server";
import { Resend } from "resend";

export async function GET() {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { ok: false, error: "RESEND_API_KEY is not configured." },
      { status: 500 }
    );
  }

  const resend = new Resend(apiKey);

  const { data, error } = await resend.emails.send({
    from: "Vero Permit <notifications@veropermit.com>",
    to: "edavis@animalmarketing.com",
    subject: "Vero Permit Email Test",
    html: "<p>Vero Permit email infrastructure is working.</p>",
  });

  if (error) {
    return NextResponse.json({ ok: false, error }, { status: 500 });
  }

  return NextResponse.json({ ok: true, data });
}
