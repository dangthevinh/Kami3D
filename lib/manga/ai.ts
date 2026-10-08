import { fetchWithRetry, type RetryOptions } from "../net-retry.ts";
import {
  MANGA_AI_ENV,
  MANGA_PANEL_MAX_BYTES,
  MANGA_PROMPT_MAX_CHARS,
  mangaFail,
  sniffImageType,
  type MangaImageType,
  type MangaResult,
} from "./rules.ts";
import type { MangaAiStatus, MangaPanel } from "./types.ts";

/**
 * Phase 24 (Manga Studio): panel generation through a third-party image API.
 *
 * The brief's rules, and what each one costs:
 *
 *   - **No new dependency.** Every provider below is called with plain `fetch` and a JSON body or a
 *     multipart form; the response is either raw image bytes or JSON holding a URL or a base64 image.
 *   - **Every call goes through `lib/net-retry.ts`**, so a dropped connection or a 5xx is retried with
 *     backoff and a 4xx is not: a rejected key or an unknown model is an answer, and asking again only
 *     spends the operator's budget.
 *   - **No key means a sentence, not a silence.** `readMangaAiConfig` answers `configured: false` with
 *     the reason, `GET /api/manga/ai/status` hands that to the UI, and the generate route answers 503
 *     with it. Nothing about panel generation is required for the rest of Manga Studio to work.
 *   - **The model is never guessed.** `MANGA_AI_MODEL` is required for every provider: model names
 *     change, and a default invented here would be a name this file cannot keep true.
 *
 * `process.env` is read here rather than through `lib/env.server.ts` so that the check suite can pass
 * a plain object and prove the refusals without setting a real key anywhere.
 */

export const MANGA_AI_PROVIDERS = ["openai", "stability", "replicate"] as const;
export type MangaAiProviderId = (typeof MANGA_AI_PROVIDERS)[number];

/** Longest provider error body kept in a message. Enough for the reason, not for a stack trace. */
const MAX_PROVIDER_MESSAGE = 300;

export interface MangaAiConfig {
  configured: boolean;
  provider: MangaAiProviderId | null;
  /** The value `MANGA_AI_PROVIDER` held, even when it is not a provider this build knows. */
  providerName: string | null;
  apiKey: string | null;
  model: string | null;
  reason: string | null;
}

/** An error that carries the provider's HTTP status, so a caller can tell a refusal from an outage. */
export class MangaAiError extends Error {
  readonly status: number | null;
  constructor(message: string, status: number | null = null) {
    super(message);
    this.name = "MangaAiError";
    this.status = status;
  }
}

const isProvider = (value: string): value is MangaAiProviderId => (MANGA_AI_PROVIDERS as readonly string[]).includes(value);

/**
 * What the environment says, and what is missing when it says nothing.
 *
 * A half-configured deployment is the case worth being careful about: a key with no model, or a
 * provider name with a typo in it, both look "set" to a careless check and both fail at the first
 * generation. The reason sentence names the variable that is missing or wrong.
 */
export function readMangaAiConfig(env: Record<string, string | undefined> = process.env): MangaAiConfig {
  const providerName = (env[MANGA_AI_ENV.provider] ?? "").trim().toLowerCase();
  const apiKey = (env[MANGA_AI_ENV.apiKey] ?? "").trim();
  const model = (env[MANGA_AI_ENV.model] ?? "").trim();

  const blank = (value: string | null): string | null => (value && value.length > 0 ? value : null);
  const refuse = (reason: string): MangaAiConfig => ({
    configured: false,
    provider: isProvider(providerName) ? providerName : null,
    providerName: blank(providerName),
    apiKey: null,
    model: blank(model),
    reason,
  });

  if (!providerName) {
    return refuse(MANGA_AI_ENV.provider + " is not set. Set it to " + MANGA_AI_PROVIDERS.join(", ") + " to switch panel generation on.");
  }
  if (!isProvider(providerName)) {
    return refuse(
      MANGA_AI_ENV.provider + " is \"" + providerName + "\", which this build does not know. It supports " + MANGA_AI_PROVIDERS.join(", ") + ".",
    );
  }
  if (!apiKey) {
    return refuse(MANGA_AI_ENV.apiKey + " is not set, so panel generation is off. Everything else in Manga Studio works without it.");
  }
  if (!model) {
    return refuse(MANGA_AI_ENV.model + " is not set. This build never guesses a model name: set it to the model your " + providerName + " account can use.");
  }
  if (providerName === "replicate" && !/^[\w.-]+\/[\w.-]+$/.test(model)) {
    return refuse(MANGA_AI_ENV.model + " must be \"owner/name\" for Replicate, and it is \"" + model + "\".");
  }
  if (providerName === "stability" && !/^[a-z0-9-]+$/.test(model)) {
    return refuse(MANGA_AI_ENV.model + " must be a Stability endpoint name such as \"core\", \"ultra\" or \"sd3\", and it is \"" + model + "\".");
  }

  return { configured: true, provider: providerName, providerName, apiKey, model, reason: null };
}

/** The answer `GET /api/manga/ai/status` returns. Never throws, and never contains the key. */
export function mangaAiStatus(config: MangaAiConfig = readMangaAiConfig()): MangaAiStatus {
  try {
    return {
      configured: config.configured,
      provider: config.providerName,
      model: config.model,
      reason: config.reason,
    };
  } catch (error) {
    return {
      configured: false,
      provider: null,
      model: null,
      reason: "Could not read the AI configuration: " + (error instanceof Error ? error.message : String(error)),
    };
  }
}

/** The request one provider wants for one prompt. Pure, so the shape can be asserted without a call. */
export function buildImageRequest(config: MangaAiConfig, prompt: string): { url: string; init: RequestInit } {
  if (!config.provider || !config.apiKey || !config.model) {
    throw new MangaAiError("The AI provider is not configured.", null);
  }

  if (config.provider === "openai") {
    return {
      url: "https://api.openai.com/v1/images/generations",
      init: {
        method: "POST",
        headers: { authorization: "Bearer " + config.apiKey, "content-type": "application/json" },
        body: JSON.stringify({ model: config.model, prompt, n: 1, size: "1024x1024" }),
        // No `response_format`: the newest models reject the field, and both a URL and inline base64
        // are understood below.
      },
    };
  }

  if (config.provider === "stability") {
    const form = new FormData();
    form.set("prompt", prompt);
    form.set("output_format", "png");
    return {
      // v2beta names the model in the path. It was validated to letters, digits and dashes above, so it
      // cannot escape the segment it is placed in.
      url: "https://api.stability.ai/v2beta/stable-image/generate/" + config.model,
      init: {
        method: "POST",
        headers: { authorization: "Bearer " + config.apiKey, accept: "image/*" },
        body: form,
      },
    };
  }

  return {
    url: "https://api.replicate.com/v1/models/" + config.model + "/predictions",
    init: {
      method: "POST",
      headers: {
        authorization: "Bearer " + config.apiKey,
        "content-type": "application/json",
        // Ask Replicate to hold the connection until the prediction finishes, so a synchronous route
        // does not have to poll. A prediction slower than this comes back \"processing\", and that is
        // reported rather than passed off as an image.
        prefer: "wait=60",
      },
      body: JSON.stringify({ input: { prompt } }),
    },
  };
}

/** Where a JSON answer points at the image: inline base64 (OpenAI) or a URL (Replicate, OpenAI). */
export function extractImageSource(payload: unknown): { kind: "base64" | "url"; value: string } | null {
  if (typeof payload !== "object" || payload === null) return null;
  const record = payload as Record<string, unknown>;

  if (typeof record.error === "string" && record.error.length > 0) {
    throw new MangaAiError(record.error.slice(0, MAX_PROVIDER_MESSAGE), null);
  }

  const output = record.output ?? record.data;
  const candidate = Array.isArray(output) ? output[0] : output;

  if (typeof candidate === "string" && candidate.length > 0) {
    return candidate.startsWith("http") ? { kind: "url", value: candidate } : { kind: "base64", value: candidate };
  }

  if (typeof candidate === "object" && candidate !== null) {
    const entry = candidate as Record<string, unknown>;
    if (typeof entry.b64_json === "string" && entry.b64_json.length > 0) return { kind: "base64", value: entry.b64_json };
    if (typeof entry.url === "string" && entry.url.length > 0) return { kind: "url", value: entry.url };
  }

  return null;
}

/** Base64 to bytes, refusing anything that is not base64 rather than producing garbage. */
export function decodeBase64(value: string): Uint8Array {
  const payload = value.startsWith("data:") ? value.slice(value.indexOf(",") + 1) : value;
  try {
    const binary = atob(payload);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
    return bytes;
  } catch {
    throw new MangaAiError("The provider returned something that is not valid base64 image data.", null);
  }
}

/**
 * Read a response body, stopping at the bucket's own limit.
 *
 * A provider that streams a 200 MB image would otherwise be read into memory and only then refused by
 * Storage. The declared length is checked first, and the stream is cut off if the declaration was a
 * lie - which is the case that matters, because it is the one a client controls.
 */
export async function readCapped(response: Response, max: number): Promise<Uint8Array> {
  const declared = Number(response.headers.get("content-length") ?? "");
  if (Number.isFinite(declared) && declared > max) {
    throw new MangaAiError("The generated image is larger than the " + Math.floor(max / (1024 * 1024)) + " MB a panel may be.", null);
  }

  const body = response.body;
  if (!body) {
    const buffer = new Uint8Array(await response.arrayBuffer());
    if (buffer.length > max) throw new MangaAiError("The generated image is larger than a panel may be.", null);
    return buffer;
  }

  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;
    total += value.length;
    if (total > max) {
      await reader.cancel().catch(() => undefined);
      throw new MangaAiError("The generated image is larger than the " + Math.floor(max / (1024 * 1024)) + " MB a panel may be.", null);
    }
    chunks.push(value);
  }

  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  return bytes;
}

const providerMessage = async (response: Response): Promise<string> => {
  const text = await response.text().catch(() => "");
  const trimmed = text.trim().slice(0, MAX_PROVIDER_MESSAGE);
  return trimmed.length > 0 ? trimmed : "(no message)";
};

export interface GeneratedImage {
  bytes: Uint8Array;
  /** Sniffed from the bytes, not taken from the provider's header. */
  contentType: MangaImageType;
}

export interface MangaAiRequestOptions {
  /** Handed to `lib/net-retry.ts`. Tests pass a no-wait sleep so a retry does not take real time. */
  retry?: RetryOptions;
  /** Injected in tests: the fetch the retries wrap. Defaults to the global one. */
  fetchImpl?: typeof fetch;
}

/**
 * Ask the provider for one panel and return the image bytes.
 *
 * The provider's own HTTP status decides what happens next: 5xx, 429 and 408 are thrown **inside**
 * the retry wrapper by `fetchWithRetry`, so they are retried; a 4xx is returned to this function and
 * thrown here, outside the wrapper, so it is not. That split is the whole point of `lib/net-retry.ts`.
 */
export async function requestPanelImage(
  config: MangaAiConfig,
  prompt: string,
  options: MangaAiRequestOptions = {},
): Promise<GeneratedImage> {
  const request = buildImageRequest(config, prompt);
  const provider = config.provider ?? "the provider";

  const response = options.fetchImpl
    ? await options.fetchImpl(request.url, request.init)
    : await fetchWithRetry(request.url, request.init, options.retry);

  if (!response.ok) {
    throw new MangaAiError(
      provider + " answered HTTP " + response.status + ": " + (await providerMessage(response)),
      response.status,
    );
  }

  let bytes: Uint8Array;
  if (config.provider === "stability") {
    // This endpoint answers with the image itself rather than with JSON.
    bytes = await readCapped(response, MANGA_PANEL_MAX_BYTES);
  } else {
    const payload = (await response.json().catch(() => null)) as unknown;
    const source = extractImageSource(payload);
    if (!source) {
      throw new MangaAiError(provider + " answered with a body this build does not understand; the panel was not created.", response.status);
    }
    bytes =
      source.kind === "base64"
        ? decodeBase64(source.value)
        : await downloadImage(source.value, options);
  }

  const contentType = sniffImageType(bytes);
  if (!contentType) {
    throw new MangaAiError(provider + " returned something that is not a PNG, JPEG, WebP or AVIF image.", response.status);
  }

  return { bytes, contentType };
}

/** Fetch the image a provider pointed at, with the same byte ceiling and the same retry rule. */
export async function downloadImage(url: string, options: MangaAiRequestOptions = {}): Promise<Uint8Array> {
  const response = options.fetchImpl ? await options.fetchImpl(url) : await fetchWithRetry(url, {}, options.retry);
  if (!response.ok) {
    throw new MangaAiError("The generated image could not be downloaded: HTTP " + response.status + ".", response.status);
  }
  return readCapped(response, MANGA_PANEL_MAX_BYTES);
}

export interface GeneratePanelInput {
  chapterId: string;
  /** The verified session id, checked against the chapter's project. */
  userId: string;
  prompt: string;
  env?: Record<string, string | undefined>;
  retry?: RetryOptions;
  fetchImpl?: typeof fetch;
}

/**
 * The whole path: prompt in, stored panel out.
 *
 * The ownership check runs **before** the provider is called, so a request for somebody else's chapter
 * costs nothing. The chapter is re-read through the project that owns it, which is the same check the
 * upload route makes - neither trusts a body.
 */
export async function generatePanelImage(input: GeneratePanelInput): Promise<MangaResult<MangaPanel>> {
  const prompt = input.prompt.trim();
  if (prompt.length === 0) return mangaFail(400, "Describe the panel you want before generating it.");
  if (prompt.length > MANGA_PROMPT_MAX_CHARS) {
    return mangaFail(400, "A prompt can be at most " + MANGA_PROMPT_MAX_CHARS + " characters.");
  }

  const config = readMangaAiConfig(input.env ?? process.env);
  if (!config.configured) {
    // 503, and the reason goes to the UI verbatim: "AI is off, and here is how to switch it on" is
    // actionable, whereas an empty panel is not.
    return mangaFail(503, config.reason ?? "Panel generation is not configured.");
  }

  // Imported lazily: panel.ts is server-only, and this module stays importable by the check suite,
  // which runs in plain Node where server-only throws by design.
  const [{ getPersonalDataClient }, { requireOwnedChapter }, { storeGeneratedPanel, panelSize }] = await Promise.all([
    import("@/lib/personal-data"),
    import("@/lib/manga/project"),
    import("@/lib/manga/panel"),
  ]);

  const supabase = await getPersonalDataClient();
  if (!supabase) return mangaFail(503, "Manga Studio has nowhere to save a generated panel.");

  const owned = await requireOwnedChapter(supabase, input.chapterId, input.userId);
  if (!owned.ok) return owned;

  let image: GeneratedImage;
  try {
    image = await requestPanelImage(config, prompt, { retry: input.retry, fetchImpl: input.fetchImpl });
  } catch (error) {
    if (error instanceof MangaAiError) {
      console.warn("[kami3d] manga panel generation failed:", error.message);
      return mangaFail(502, error.message);
    }
    const message = error instanceof Error ? error.message : String(error);
    console.warn("[kami3d] manga panel generation failed:", message);
    return mangaFail(502, "The image provider could not be reached: " + message);
  }

  return storeGeneratedPanel({
    chapterId: input.chapterId,
    userId: input.userId,
    bytes: image.bytes,
    declaredType: image.contentType,
    ...panelSize(image.bytes),
    aiPrompt: prompt,
    aiProvider: config.provider ?? "unknown",
    aiModel: config.model,
  });
}
