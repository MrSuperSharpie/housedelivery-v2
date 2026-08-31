import assert from "node:assert/strict";
import test from "node:test";

import { getPreviewAuthCookies } from "@/lib/lookbook/preview-auth";

test("forwards only the Vercel Preview authentication cookie", () => {
  assert.deepEqual(
    getPreviewAuthCookies(
      "session=private; _vercel_jwt=header.payload=signature; attribution=first-touch",
      "https://preview.example.com",
    ),
    [
      {
        name: "_vercel_jwt",
        value: "header.payload=signature",
        url: "https://preview.example.com",
      },
    ],
  );
});

test("returns no browser cookies when Preview authentication is absent", () => {
  assert.deepEqual(
    getPreviewAuthCookies("session=private", "https://preview.example.com"),
    [],
  );
  assert.deepEqual(getPreviewAuthCookies(null, "https://preview.example.com"), []);
});
