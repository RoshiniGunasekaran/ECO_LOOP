/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * ============================================================
 *  SHARED FORMATTING HELPERS
 * ============================================================
 *  Small, reusable functions used across many screens so we
 *  don't repeat the same formatting logic in 10 different
 *  components. Plain English: these just make numbers and
 *  dates look nice and consistent everywhere in the app.
 * ============================================================
 */

/** Turns 1234.5 into "₹1,234.50" */
export function formatCurrency(amount: number): string {
  return `₹${amount.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/** Turns an ISO date string into "16 Jul 2026" */
export function formatDate(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

/** Turns an ISO date string into "16 Jul 2026, 10:24 AM" */
export function formatDateTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/** Generates a short, readable ID like "REQ-4821" from a prefix */
export function generateShortId(prefix: string): string {
  const randomPart = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${randomPart}`;
}
