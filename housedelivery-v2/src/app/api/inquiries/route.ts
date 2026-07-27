import { models } from "@/data/models";

const inquiryRecipient = "hello@housedelivery.ca";
const maximumRequestBytes = 20_000;

type InquiryPayload = {
  firstName?: unknown;
  lastName?: unknown;
  email?: unknown;
  phone?: unknown;
  model?: unknown;
  location?: unknown;
  timeline?: unknown;
  notes?: unknown;
  company?: unknown;
};

function singleLine(value: unknown, maximumLength: number) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim().replace(/\s+/g, " ").slice(0, maximumLength);
}

function multiline(value: unknown, maximumLength: number) {
  if (typeof value !== "string") {
    return "";
  }

  return value
    .trim()
    .replace(/\r\n?/g, "\n")
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "")
    .slice(0, maximumLength);
}

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get("content-length") ?? 0);

  if (contentLength > maximumRequestBytes) {
    return Response.json({ error: "Inquiry is too large." }, { status: 413 });
  }

  let parsedPayload: unknown;

  try {
    parsedPayload = await request.json();
  } catch {
    return Response.json({ error: "Invalid inquiry data." }, { status: 400 });
  }

  if (
    !parsedPayload ||
    typeof parsedPayload !== "object" ||
    Array.isArray(parsedPayload)
  ) {
    return Response.json({ error: "Invalid inquiry data." }, { status: 400 });
  }

  const payload = parsedPayload as InquiryPayload;

  // Honeypot fields should remain empty for real visitors.
  if (singleLine(payload.company, 200)) {
    return Response.json({ accepted: true });
  }

  const firstName = singleLine(payload.firstName, 80);
  const lastName = singleLine(payload.lastName, 80);
  const email = singleLine(payload.email, 254).toLowerCase();
  const phone = singleLine(payload.phone, 50);
  const modelSlug = singleLine(payload.model, 100);
  const location = singleLine(payload.location, 160);
  const timeline = singleLine(payload.timeline, 80);
  const notes = multiline(payload.notes, 4_000);

  if (!firstName || !lastName || !isEmail(email)) {
    return Response.json(
      { error: "Name and a valid email address are required." },
      { status: 400 },
    );
  }

  const selectedModel = modelSlug
    ? models.find((model) => model.slug === modelSlug)
    : undefined;

  if (modelSlug && !selectedModel) {
    return Response.json({ error: "Invalid model selection." }, { status: 400 });
  }

  const resendApiKey = process.env.RESEND_API_KEY?.trim();
  const fromEmail =
    process.env.INQUIRY_FROM_EMAIL?.trim() ??
    "House Delivery Website <inquiries@housedelivery.ca>";

  if (!resendApiKey) {
    console.error("Project inquiry delivery is missing RESEND_API_KEY.");
    return Response.json(
      { error: "Inquiry delivery is temporarily unavailable." },
      { status: 503 },
    );
  }

  const message = [
    "New House Delivery project review inquiry",
    "",
    `Name: ${firstName} ${lastName}`,
    `Email: ${email}`,
    `Phone: ${phone || "Not provided"}`,
    `Preferred model: ${selectedModel?.name ?? "Still exploring"}`,
    `Project location: ${location || "Not provided"}`,
    `Desired start: ${timeline || "Not provided"}`,
    "",
    "Project details:",
    notes || "Not provided",
  ].join("\n");

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [inquiryRecipient],
        reply_to: email,
        subject: `Project inquiry — ${firstName} ${lastName}`,
        text: message,
      }),
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      console.error(
        `Project inquiry email provider returned status ${response.status}.`,
      );
      return Response.json(
        { error: "Inquiry delivery failed." },
        { status: 502 },
      );
    }
  } catch (error) {
    console.error("Project inquiry email delivery failed.", error);
    return Response.json(
      { error: "Inquiry delivery failed." },
      { status: 502 },
    );
  }

  return Response.json({ accepted: true });
}
