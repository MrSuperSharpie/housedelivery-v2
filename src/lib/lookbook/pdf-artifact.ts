import { createHash } from "node:crypto";

import type { StoredLookBook } from "@/lib/lookbook/types";

const PDF_RENDERER_VERSION = 3;
const DEFAULT_MAX_COMPLETED_ARTIFACTS = 4;
const DEFAULT_MAX_COMPLETED_BYTES = 48 * 1024 * 1024;

type JsonValue =
  | null
  | boolean
  | number
  | string
  | JsonValue[]
  | { [key: string]: JsonValue };

function canonicalize(value: unknown): JsonValue {
  if (value === null || typeof value === "string" || typeof value === "boolean") {
    return value;
  }
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (Array.isArray(value)) {
    return value.map((item) => canonicalize(item));
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, item]) => item !== undefined)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, item]) => [key, canonicalize(item)]),
    );
  }
  return null;
}

/**
 * Identifies the exact input rendered by the Look Book page. Timestamps and
 * contact fields that do not appear in the document are deliberately omitted,
 * so an email retry does not create a different PDF revision.
 */
export function getLookBookPdfRevision(record: StoredLookBook) {
  const renderedInput = canonicalize({
    rendererVersion: PDF_RENDERER_VERSION,
    homeSlug: record.homeSlug,
    homeDisplayName: record.homeDisplayName,
    homeFamily: record.homeFamily,
    configuratorVersion: record.configuratorVersion,
    configuration: record.configuration,
  });

  return createHash("sha256")
    .update(JSON.stringify(renderedInput))
    .digest("hex")
    .slice(0, 32);
}

export type PdfArtifactSource = "generated" | "memory" | "single-flight";
export type PdfArtifactBytes = Uint8Array<ArrayBuffer>;

export type PdfArtifactResult = {
  bytes: PdfArtifactBytes;
  source: PdfArtifactSource;
};

/**
 * Coordinates Chromium within one warm Function instance. Fluid Compute can
 * run several invocations in the same process, so both same-revision
 * single-flight and a one-at-a-time render queue are required to keep Chromium
 * from exhausting the instance's shared /tmp and memory resources.
 *
 * Vercel's CDN is the durable response cache. This small bounded memory cache
 * also reuses exact bytes when a protected Preview or a fresh CDN edge reaches
 * the same warm instance.
 */
export class LookBookPdfArtifactCoordinator {
  private readonly completed = new Map<string, PdfArtifactBytes>();
  private readonly inFlight = new Map<string, Promise<PdfArtifactBytes>>();
  private completedBytes = 0;
  private renderQueue: Promise<void> = Promise.resolve();

  constructor(
    private readonly maxCompletedArtifacts = DEFAULT_MAX_COMPLETED_ARTIFACTS,
    private readonly maxCompletedBytes = DEFAULT_MAX_COMPLETED_BYTES,
  ) {}

  async getOrRender(
    key: string,
    render: () => Promise<PdfArtifactBytes>,
  ): Promise<PdfArtifactResult> {
    const completed = this.completed.get(key);
    if (completed) {
      this.completed.delete(key);
      this.completed.set(key, completed);
      return { bytes: completed, source: "memory" };
    }

    const shared = this.inFlight.get(key);
    if (shared) {
      return { bytes: await shared, source: "single-flight" };
    }

    const generation = this.enqueue(async () => {
      const bytes = await render();
      this.remember(key, bytes);
      return bytes;
    });
    this.inFlight.set(key, generation);

    try {
      return { bytes: await generation, source: "generated" };
    } finally {
      if (this.inFlight.get(key) === generation) {
        this.inFlight.delete(key);
      }
    }
  }

  private enqueue(render: () => Promise<PdfArtifactBytes>) {
    const generation = this.renderQueue.then(render, render);
    this.renderQueue = generation.then(
      () => undefined,
      () => undefined,
    );
    return generation;
  }

  private remember(key: string, bytes: PdfArtifactBytes) {
    if (
      this.maxCompletedArtifacts <= 0 ||
      this.maxCompletedBytes <= 0 ||
      bytes.byteLength > this.maxCompletedBytes
    ) {
      return;
    }

    const previous = this.completed.get(key);
    if (previous) {
      this.completedBytes -= previous.byteLength;
      this.completed.delete(key);
    }
    this.completed.set(key, bytes);
    this.completedBytes += bytes.byteLength;

    while (
      this.completed.size > this.maxCompletedArtifacts ||
      this.completedBytes > this.maxCompletedBytes
    ) {
      const oldestKey = this.completed.keys().next().value;
      if (typeof oldestKey !== "string") break;
      const oldest = this.completed.get(oldestKey);
      this.completed.delete(oldestKey);
      this.completedBytes -= oldest?.byteLength ?? 0;
    }
  }
}

const lookBookPdfArtifacts = new LookBookPdfArtifactCoordinator();

export function getLookBookPdfArtifact(
  key: string,
  render: () => Promise<PdfArtifactBytes>,
) {
  return lookBookPdfArtifacts.getOrRender(key, render);
}
