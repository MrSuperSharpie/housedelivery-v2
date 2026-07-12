# Offline-First Inspector Evidence Sync

Date: 2026-07-12

Branch: `feat/offline-first-evidence-sync`

## Executive Summary

Inspector evidence capture is now designed as a local-first browser pipeline for the inspector completion workspace. The first durable milestone is no longer "network upload started"; it is "optimized evidence saved on this device." Server upload still uses the existing Supabase Storage and inspector completion document helper. No schema, RLS, storage bucket, Vault, seal, completion, or evidence requirement policy is changed.

The pipeline is intentionally browser/PWA-compatible. It uses IndexedDB for local evidence records and files, retries on online/focus/visibility/page reload, and registers Background Sync only as a best-effort enhancement when a service worker registration and browser support exist. It does not promise uploads after iOS or mobile browsers have fully terminated the web app.

## Layers

### 1. Media Optimization Service

File: `src/lib/offline-evidence/mediaOptimizationService.ts`

- Images are decoded on device, orientation-aware where `createImageBitmap` supports it, and downscaled only when the longest edge exceeds the configured maximum.
- The default longest-edge target is 3200 px, within the requested 2560-3840 construction-evidence range.
- Large images are re-encoded as web-compatible JPEG and iteratively compressed toward roughly 2 MB without upscaling smaller photos.
- Original and optimized byte sizes are recorded.
- SHA-256 is generated for the optimized upload bytes where `crypto.subtle` is available.
- Video, audio, text, and documents are preserved without browser-side transcoding.

### 2. Local Evidence Repository

Files:

- `src/lib/offline-evidence/localEvidenceRepository.ts`
- `src/lib/offline-evidence/types.ts`

The repository stores metadata and file blobs in IndexedDB. Each staged record includes:

- `localEvidenceId`
- `idempotencyKey`
- `reportId`
- `assignmentId`
- `projectId`
- `stageId`
- `checklistItemId`
- inspector/user identifiers already available in the workspace
- original and stored filenames
- MIME/media type
- captured timestamp
- original and optimized byte sizes
- checksum
- capture coordinates
- queue status
- retry count, next retry time, last error
- confirmed server document/path after acknowledgement

The in-memory repository is used only as a test or unsupported-browser fallback.

### 3. Evidence Sync Queue

File: `src/lib/offline-evidence/evidenceSyncQueue.ts`

The queue is a small state machine with low concurrency. It supports:

- `saved_local`
- `waiting_for_connection`
- `uploading`
- `uploaded`
- `retry_scheduled`
- `needs_attention`

It distinguishes retryable network/storage interruptions from permanent validation failures, uses exponential backoff with jitter, and never deletes local staged evidence until the existing upload transport returns a server document acknowledgement.

Chunked/resumable upload is not enabled in this loop because the current upload transport uses Supabase Storage `.upload(...)` and document-row insertion. Adding true resumable upload would require a reviewed transport/server-storage decision and is outside this safe loop.

### 4. UI Integration

Files:

- `src/components/inspector/InspectorCompletionWorkspace.tsx`
- `src/lib/offline-evidence/inspectorEvidenceSync.ts`

The inspector evidence workflow now:

- stages optimized evidence locally before attempting server upload
- shows local evidence rows with statuses such as "Saved on this device", "Waiting for connection", "Upload paused - will retry", and "Upload needs attention"
- shows a pending local-upload count in the evidence surface
- restores pending local evidence after page reload
- retries queued evidence on app load, `online`, `focus`, and `visibilitychange`
- replaces the local `local://offline-evidence/...` row with the persisted server document after acknowledgement

Preview/demo behavior remains unchanged.

## Final Seal Boundary

The existing fail-closed seal gate already rejects evidence paths beginning with `local://` or `placeholder://`. This remains unchanged. Local evidence can help the inspector keep working during poor connectivity, but it does not satisfy final sealed package requirements until it has uploaded and the server document row exists with checksum and location data.

## Browser Limitations

- IndexedDB is used for LOOP 01 local durability.
- OPFS is not required for this implementation; it remains a future enhancement for very large media staging if needed.
- Background Sync is registered only when a service worker registration and browser API already exist.
- Mobile browsers, especially iOS, may not continue work after the browser is terminated. Upload resumes when the app is opened, focused, visible, or online again.
- Browser-side video transcoding is intentionally not added. Videos are staged and retried without lossy processing.

## Unchanged Systems

This loop does not change:

- Supabase schema, migrations, RLS, auth, or storage configuration
- active inspection checklist requirements
- evidence requirement policy
- Vault, seal, completion, Schedule C-B, or authority package behavior
- Stripe, payments, escrow, job claiming, environment variables, Vercel settings, deployment, or production promotion
