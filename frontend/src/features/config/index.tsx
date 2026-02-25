/*
 * features/config/index.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Purpose : App-wide constants derived from environment variables and
 *           hardcoded defaults used across multiple pages.
 *
 * Used by : Landing.tsx, SignIn.tsx  (display app name / subtitle)
 *
 * Key exports
 *   VITE_APP_NAME       – Application title read from VITE_APP_NAME env var,
 *                         falls back to '[Admin Dashboard]'
 *   PAGE_SINGIN_SUBTILE – Tagline shown on the SignIn page left panel
 */

export const VITE_APP_NAME = import.meta.env.VITE_APP_NAME || '[Admin Dashboard]';

export const PAGE_SINGIN_SUBTILE = 'A modern, reusable template for your next project.';