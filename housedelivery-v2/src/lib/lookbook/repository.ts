import "server-only";

import type { StoredLookBook } from "@/lib/lookbook/types";

export class LookBookStorageUnavailableError extends Error {}

export type LookBookStorageReadFailureReason =
  | "timeout"
  | "network"
  | "rate_limited"
  | "upstream"
  | "http_error"
  | "invalid_response";

export class LookBookStorageReadError extends Error {
  constructor(
    message: string,
    readonly reason: LookBookStorageReadFailureReason,
    readonly status?: number,
    readonly transient = false,
  ) {
    super(message);
    this.name = "LookBookStorageReadError";
  }
}

export interface LookBookRepository {
  findById(id: string): Promise<StoredLookBook | null>;
  save(record: StoredLookBook): Promise<StoredLookBook>;
}

type SupabaseRow = {
  id: string;
  home_slug: string;
  home_display_name: string;
  home_family: StoredLookBook["homeFamily"];
  configurator_version: number;
  configuration: StoredLookBook["configuration"];
  selections: StoredLookBook["selections"];
  contact: StoredLookBook["contact"];
  lead_state: StoredLookBook["leadState"];
  follow_up_requested: boolean;
  follow_up_requested_at: string | null;
  follow_up_source: StoredLookBook["followUpSource"] | null;
  property_feasibility: StoredLookBook["propertyFeasibility"] | null;
  attribution: StoredLookBook["attribution"];
  created_at: string;
  updated_at: string;
  completed_at: string;
  email_requested_at: string | null;
};

const readRetryDelaysMs = [0, 150, 400] as const;

function sleep(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function classifyHttpReadFailure(status: number) {
  if (status === 429) {
    return new LookBookStorageReadError(
      `Look Book storage read failed (${status}).`,
      "rate_limited",
      status,
      true,
    );
  }
  if (status >= 500) {
    return new LookBookStorageReadError(
      `Look Book storage read failed (${status}).`,
      "upstream",
      status,
      true,
    );
  }
  return new LookBookStorageReadError(
    `Look Book storage read failed (${status}).`,
    "http_error",
    status,
    false,
  );
}

function classifyThrownReadFailure(error: unknown) {
  if (error instanceof LookBookStorageReadError) return error;

  if (
    error instanceof DOMException &&
    (error.name === "TimeoutError" || error.name === "AbortError")
  ) {
    return new LookBookStorageReadError(
      "Look Book storage read timed out.",
      "timeout",
      undefined,
      true,
    );
  }

  if (error instanceof TypeError) {
    return new LookBookStorageReadError(
      "Look Book storage network read failed.",
      "network",
      undefined,
      true,
    );
  }

  return new LookBookStorageReadError(
    "Look Book storage returned an invalid response.",
    "invalid_response",
    undefined,
    true,
  );
}

function logReadRetry(error: LookBookStorageReadError, attempt: number) {
  console.warn(
    JSON.stringify({
      level: "warning",
      event: "lookbook_storage_read_retry",
      reason: error.reason,
      ...(error.status ? { status: error.status } : {}),
      attempt,
    }),
  );
}

function toRow(record: StoredLookBook): SupabaseRow {
  return {
    id: record.id,
    home_slug: record.homeSlug,
    home_display_name: record.homeDisplayName,
    home_family: record.homeFamily,
    configurator_version: record.configuratorVersion,
    configuration: record.configuration,
    selections: record.selections,
    contact: record.contact,
    lead_state: record.leadState,
    follow_up_requested: record.followUpRequested,
    follow_up_requested_at: record.followUpRequestedAt ?? null,
    follow_up_source: record.followUpSource ?? null,
    property_feasibility: record.propertyFeasibility ?? null,
    attribution: record.attribution,
    created_at: record.createdAt,
    updated_at: record.updatedAt,
    completed_at: record.completedAt,
    email_requested_at: record.emailRequestedAt ?? null,
  };
}

function fromRow(row: SupabaseRow): StoredLookBook {
  return {
    id: row.id,
    homeSlug: row.home_slug,
    homeDisplayName: row.home_display_name,
    homeFamily: row.home_family,
    configuratorVersion: row.configurator_version,
    configuration: row.configuration,
    selections: row.selections,
    contact: row.contact,
    leadState: row.lead_state,
    followUpRequested: row.follow_up_requested,
    ...(row.follow_up_requested_at
      ? { followUpRequestedAt: row.follow_up_requested_at }
      : {}),
    ...(row.follow_up_source ? { followUpSource: row.follow_up_source } : {}),
    ...(row.property_feasibility
      ? { propertyFeasibility: row.property_feasibility }
      : {}),
    attribution: row.attribution,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    completedAt: row.completed_at,
    ...(row.email_requested_at
      ? { emailRequestedAt: row.email_requested_at }
      : {}),
  };
}

class SupabaseLookBookRepository implements LookBookRepository {
  constructor(
    private readonly baseUrl: string,
    private readonly serviceRoleKey: string,
  ) {}

  private headers() {
    return {
      apikey: this.serviceRoleKey,
      Authorization: `Bearer ${this.serviceRoleKey}`,
      "Content-Type": "application/json",
    };
  }

  async findById(id: string) {
    const url = new URL("/rest/v1/lookbook_configurations", this.baseUrl);
    url.searchParams.set("id", `eq.${id}`);
    url.searchParams.set("select", "*");
    url.searchParams.set("limit", "1");

    for (let attempt = 0; attempt < readRetryDelaysMs.length; attempt += 1) {
      const delay = readRetryDelaysMs[attempt];
      if (delay > 0) await sleep(delay);

      try {
        const response = await fetch(url, {
          headers: this.headers(),
          cache: "no-store",
          signal: AbortSignal.timeout(8_000),
        });

        if (!response.ok) {
          throw classifyHttpReadFailure(response.status);
        }

        let rows: SupabaseRow[];
        try {
          rows = (await response.json()) as SupabaseRow[];
        } catch {
          throw new LookBookStorageReadError(
            "Look Book storage returned an invalid response.",
            "invalid_response",
            undefined,
            true,
          );
        }
        return rows[0] ? fromRow(rows[0]) : null;
      } catch (error) {
        const readError = classifyThrownReadFailure(error);
        const hasAnotherAttempt = attempt < readRetryDelaysMs.length - 1;

        if (!readError.transient || !hasAnotherAttempt) {
          throw readError;
        }

        logReadRetry(readError, attempt + 1);
      }
    }

    throw new LookBookStorageReadError(
      "Look Book storage read failed.",
      "network",
      undefined,
      true,
    );
  }

  async save(record: StoredLookBook) {
    const url = new URL("/rest/v1/lookbook_configurations", this.baseUrl);
    url.searchParams.set("on_conflict", "id");

    const response = await fetch(url, {
      method: "POST",
      headers: {
        ...this.headers(),
        Prefer: "resolution=merge-duplicates,return=representation",
      },
      body: JSON.stringify(toRow(record)),
      cache: "no-store",
      signal: AbortSignal.timeout(8_000),
    });

    if (!response.ok) {
      throw new Error(`Look Book storage write failed (${response.status}).`);
    }

    const rows = (await response.json()) as SupabaseRow[];
    if (!rows[0]) throw new Error("Look Book storage returned no saved record.");
    return fromRow(rows[0]);
  }
}

export function getLookBookRepository(): LookBookRepository {
  const baseUrl = process.env.LOOKBOOK_SUPABASE_URL?.trim();
  const serviceRoleKey =
    process.env.LOOKBOOK_SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!baseUrl || !serviceRoleKey) {
    throw new LookBookStorageUnavailableError(
      "Look Book storage is not configured.",
    );
  }

  return new SupabaseLookBookRepository(baseUrl, serviceRoleKey);
}
