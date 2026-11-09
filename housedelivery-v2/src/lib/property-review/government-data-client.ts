type CacheEntry = {
  expiresAt: number;
  value: unknown;
};

export class GovernmentDataError extends Error {
  constructor(
    message: string,
    readonly provider: string,
    readonly operation: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "GovernmentDataError";
  }
}

export type GovernmentDataClient = {
  getJson<T>(
    url: URL,
    options: {
      provider: string;
      operation: string;
      cacheKey: string;
      cacheTtlMs?: number;
    },
  ): Promise<T>;
};

type GovernmentDataClientOptions = {
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  retryCount?: number;
  retryDelayMs?: number;
  defaultCacheTtlMs?: number;
  maximumCacheEntries?: number;
  now?: () => number;
  sleep?: (milliseconds: number) => Promise<void>;
  logger?: Pick<Console, "info" | "error">;
};

function providerHost(url: URL) {
  return url.hostname;
}

function logProviderHealth(
  logger: Pick<Console, "info" | "error">,
  input: {
  provider: string;
  operation: string;
  url: URL;
  outcome: "success" | "retry" | "failure";
  durationMs: number;
  attempt: number;
  status?: number;
  cache?: "hit" | "miss";
  errorType?: string;
  },
) {
  const log = input.outcome === "failure" ? logger.error : logger.info;
  log(
    JSON.stringify({
      level: input.outcome === "failure" ? "error" : "info",
      event: "property_provider_health",
      provider: input.provider,
      operation: input.operation,
      host: providerHost(input.url),
      outcome: input.outcome,
      durationMs: input.durationMs,
      attempt: input.attempt,
      ...(input.status ? { status: input.status } : {}),
      ...(input.cache ? { cache: input.cache } : {}),
      ...(input.errorType ? { errorType: input.errorType } : {}),
    }),
  );
}

function isRetryableStatus(status: number) {
  return status === 408 || status === 429 || status >= 500;
}

function wait(milliseconds: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, milliseconds));
}

export function createGovernmentDataClient(
  options: GovernmentDataClientOptions = {},
): GovernmentDataClient {
  const fetchImpl = options.fetchImpl ?? fetch;
  const timeoutMs = options.timeoutMs ?? 4_000;
  const retryCount = options.retryCount ?? 1;
  const retryDelayMs = options.retryDelayMs ?? 125;
  const defaultCacheTtlMs = options.defaultCacheTtlMs ?? 6 * 60 * 60 * 1_000;
  const maximumCacheEntries = options.maximumCacheEntries ?? 500;
  const now = options.now ?? Date.now;
  const sleep = options.sleep ?? wait;
  const logger = options.logger ?? console;
  const cache = new Map<string, CacheEntry>();
  const inFlight = new Map<string, Promise<unknown>>();

  function trimCache() {
    if (cache.size < maximumCacheEntries) return;
    const firstKey = cache.keys().next().value;
    if (typeof firstKey === "string") cache.delete(firstKey);
  }

  async function request<T>(
    url: URL,
    requestOptions: {
      provider: string;
      operation: string;
      cacheKey: string;
      cacheTtlMs?: number;
    },
  ): Promise<T> {
    const startedAt = now();
    const existing = cache.get(requestOptions.cacheKey);
    if (existing && existing.expiresAt > now()) {
      logProviderHealth(logger, {
        provider: requestOptions.provider,
        operation: requestOptions.operation,
        url,
        outcome: "success",
        durationMs: now() - startedAt,
        attempt: 0,
        cache: "hit",
      });
      return existing.value as T;
    }
    if (existing) cache.delete(requestOptions.cacheKey);

    const pending = inFlight.get(requestOptions.cacheKey);
    if (pending) return pending as Promise<T>;

    const execute = (async () => {
      let lastError: unknown;
      for (let attempt = 0; attempt <= retryCount; attempt += 1) {
        const attemptStartedAt = now();
        let response: Response | undefined;
        try {
          response = await fetchImpl(url, {
            headers: { Accept: "application/json" },
            cache: "no-store",
            signal: AbortSignal.timeout(timeoutMs),
          });
          if (!response.ok) {
            throw new GovernmentDataError(
              `${requestOptions.provider} returned HTTP ${response.status}.`,
              requestOptions.provider,
              requestOptions.operation,
              response.status,
            );
          }
          const value = (await response.json()) as T;
          trimCache();
          cache.set(requestOptions.cacheKey, {
            value,
            expiresAt:
              now() +
              (requestOptions.cacheTtlMs ?? defaultCacheTtlMs),
          });
          logProviderHealth(logger, {
            provider: requestOptions.provider,
            operation: requestOptions.operation,
            url,
            outcome: "success",
            durationMs: now() - attemptStartedAt,
            attempt: attempt + 1,
            status: response.status,
            cache: "miss",
          });
          return value;
        } catch (error) {
          lastError = error;
          const status =
            error instanceof GovernmentDataError ? error.status : undefined;
          const canRetry =
            attempt < retryCount &&
            (status === undefined || isRetryableStatus(status));
          logProviderHealth(logger, {
            provider: requestOptions.provider,
            operation: requestOptions.operation,
            url,
            outcome: canRetry ? "retry" : "failure",
            durationMs: now() - attemptStartedAt,
            attempt: attempt + 1,
            status,
            errorType: error instanceof Error ? error.name : "UnknownError",
          });
          if (!canRetry) break;
          await sleep(retryDelayMs * 2 ** attempt);
        }
      }

      if (lastError instanceof GovernmentDataError) throw lastError;
      throw new GovernmentDataError(
        `${requestOptions.provider} request failed (${lastError instanceof Error ? lastError.name : "unknown error"}).`,
        requestOptions.provider,
        requestOptions.operation,
      );
    })();

    inFlight.set(requestOptions.cacheKey, execute);
    try {
      return await execute;
    } finally {
      inFlight.delete(requestOptions.cacheKey);
    }
  }

  return { getJson: request };
}
