import assert from "node:assert/strict";
import test from "node:test";
import { createHash } from "node:crypto";
import { createLookBookPdfResponseStream } from "@/lib/lookbook/pdf-response";

test("image-complete PDFs larger than the buffered body limit stream every byte in bounded chunks", async () => {
  const bytes = Uint8Array.from({ length: 12 * 1024 * 1024 + 17 }, (_, index) => index % 251);
  const expected = createHash("sha256").update(bytes).digest("hex");
  const reader = createLookBookPdfResponseStream(bytes).getReader();
  const received = createHash("sha256");
  let total = 0;
  let chunks = 0;
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    assert.ok(value.byteLength > 0 && value.byteLength <= 64 * 1024);
    received.update(value);
    total += value.byteLength;
    chunks++;
  }
  assert.equal(total, bytes.byteLength);
  assert.equal(received.digest("hex"), expected);
  assert.ok(chunks > 1);
  assert.equal(createHash("sha256").update(bytes).digest("hex"), expected);
});
