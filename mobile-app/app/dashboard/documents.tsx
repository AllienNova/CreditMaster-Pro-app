/**
 * Fynvita Documents Dashboard route (/dashboard/documents).
 *
 * This route previously rendered a SECOND, mock-backed Documents screen
 * (MOCK_DOCUMENTS + setTimeout load + simulated upload + no-op view/download).
 * It now re-exports the single real, API-backed Documents library screen
 * (app/documents/index.tsx, wired to documentApi.getAll / documentApi.upload)
 * so there is exactly one source of truth for document data and upload.
 *
 * The /dashboard/documents deep link (used by a notification actionUrl in
 * app/dashboard/notifications.tsx) continues to work and now shows real data.
 */
export { default } from "../documents";
