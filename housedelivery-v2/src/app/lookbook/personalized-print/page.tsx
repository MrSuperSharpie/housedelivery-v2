import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";

import { SavedLookBook } from "@/components/saved-lookbook";
import { personalizedLookBookDocumentHeader, resolvePersonalizedLookBook } from "@/lib/lookbook/personalized";

export const metadata: Metadata = {
  title: "Personalized Look Book",
  robots: { index: false, follow: false, nocache: true },
  referrer: "no-referrer",
};

export default async function PersonalizedLookBookPrintPage() {
  const encodedDocument = (await headers()).get(personalizedLookBookDocumentHeader);
  if (!encodedDocument || encodedDocument.length > 8_000) notFound();

  let book;
  try {
    book = resolvePersonalizedLookBook(JSON.parse(Buffer.from(encodedDocument, "base64url").toString()));
  } catch {
    notFound();
  }

  return (
    <main>
      <SavedLookBook definition={book.definition} configuration={book.printConfiguration} personalizedBrief={book.brief} printMode />
    </main>
  );
}
