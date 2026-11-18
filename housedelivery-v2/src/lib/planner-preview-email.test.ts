import assert from "node:assert/strict";
import test from "node:test";

import { getPlannerPreviewEmailCapture } from "@/lib/planner-preview-email";

test("Planner test mail captures once with the isolated database and stays disabled in production", async (t) => {
  const isolatedOrigin = "https://previewproject.supabase.co";
  const env = {
    VERCEL_ENV: "preview",
    PLANNER_PREVIEW_STORAGE_ORIGIN: isolatedOrigin,
    LOOKBOOK_SUPABASE_URL: "https://otherproject.supabase.co",
    LOOKBOOK_SUPABASE_SERVICE_ROLE_KEY: "fixture-key",
  };
  const previous = Object.fromEntries(Object.keys(env).map((name) => [name, process.env[name]]));
  t.after(() => {
    for (const [name, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  });
  Object.assign(process.env, env);
  assert.throws(() => getPlannerPreviewEmailCapture(), /isolated Preview database/);

  process.env.LOOKBOOK_SUPABASE_URL = `${isolatedOrigin}/`;
  const capture = getPlannerPreviewEmailCapture();
  assert.ok(capture);
  const message = { to: ["staff@example.invalid"], text: "Fictional project review" };
  const fetch = t.mock.method(globalThis, "fetch", async (url: string, options: { headers: Record<string, string>; body: string }) => {
    assert.equal(url, `${isolatedOrigin}/rest/v1/planner_preview_email_receipts?on_conflict=id`);
    assert.equal(options.headers.Prefer, "resolution=ignore-duplicates,return=minimal");
    assert.deepEqual(JSON.parse(options.body), { id: "preview-submission-test", message });
    return new Response(null, { status: 201 });
  });
  assert.deepEqual(await (await capture({ idempotencyKey: "submission-test", message })).json(), {
    id: "preview-submission-test",
  });
  assert.equal(fetch.mock.callCount(), 1);

  process.env.VERCEL_ENV = "production";
  assert.equal(getPlannerPreviewEmailCapture(), undefined);
});
