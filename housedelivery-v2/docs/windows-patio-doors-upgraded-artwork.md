# Windows & Patio Doors artwork upgrade — 2026-10-21

Preview baseline: `861ae9f618d730bb4b01deb5a08c371353b2df85` on the existing Windows & Patio Doors preview, preserving the production cover-quality release and approved Look Book delivery work.

135 boards are replaced from the 18 starred Windows & Patio Doors ZIPs in Downloads. The image manifest records the exact source ZIP, filename, SHA-256, source size, native dimensions and decoded-pixel SHA-256 for every replacement. The deployed WebP files are lossless encodings at their source resolution; decoded pixels were compared with each source PNG before installation. No artwork was generated, cropped, resized or borrowed. Content-hashed URLs refresh browser caches. The PDF renderer revision refreshes previously cached PDF artwork.

The existing option IDs, names, Premium/Signature tiers, chapter order, independent Salt Spring interiors, shared building-envelope choices, saved-record compatibility, pricing, controls and page design are unchanged. The manifest is the only runtime image-mapping change. All other image categories and home covers remain untouched.

## Source mapping

For 16 standard homes, source tier and option number map directly to the same existing slot. Profile's source labels are 1, 2, 4 and 5 in each tier; these occupy its four existing Windows & Patio Doors slots in that order (1, 2, 3 and 4). Source labels are retained in the manifest as `sourceOption`; existing website option IDs and technical direction names remain stable.

## Retained artwork

- **Salt Spring Duplex (8 boards):** the supplied ZIP has Residence A and Residence B boards, each with 2 Premium and 2 Signature options. The approved website has 4 Premium and 4 Signature shared glazing choices for the entire duplex. Keep the existing shared boards pending matching replacements; do not reinterpret residence-specific boards as shared selections.
- **Solace Signature 2 — Sculpted White (1 board):** `Solace_08_Windows-Patio-Doors_Signature-2_Sculpted-White.png` in `*Solace_Windows_Patio_Doors_Architectural_Lock_8_Boards.zip` has a truncated PNG IDAT stream and fails decoding. Keep the existing board pending a corrected source. No missing pixels were reconstructed.

The other 135 supplied boards decode successfully. All 144 website choices remain available across the 18 homes.
