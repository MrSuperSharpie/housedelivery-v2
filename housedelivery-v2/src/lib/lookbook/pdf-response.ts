// Keep large, image-complete PDFs on the streaming response path. Vercel's
// buffered response limit is smaller than these documents; streaming preserves
// the exact cached artifact without reducing board quality or changing plans.
export function createLookBookPdfResponseStream(bytes: Uint8Array<ArrayBuffer>) {
  let offset = 0;
  const chunkSize = 64 * 1024;
  return new ReadableStream<Uint8Array<ArrayBuffer>>({
    pull(controller) {
      if (offset === bytes.byteLength) {
        controller.close();
        return;
      }
      const end = Math.min(offset + chunkSize, bytes.byteLength);
      controller.enqueue(bytes.subarray(offset, end));
      offset = end;
    },
  });
}
