/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Task 16.4 — Reports. Builds a real CSV from the industry's live profile +
 * inventory data and triggers a browser download — no new npm dependency,
 * same "keep it simple" approach as `src/utils/invoice.ts` (Module 14).
 */

import type { IndustryReportStats, InventoryItem, RealIndustryProfile } from '../services/industryService';

export function downloadInventoryReport(
  profile: RealIndustryProfile,
  inventory: InventoryItem[],
  stats: IndustryReportStats
): void {
  const lines: string[] = [];
  lines.push('EcoLoop — Commercial Recycling Tonnage Report');
  lines.push(`Company,${profile.companyName}`);
  lines.push(`Generated,${new Date().toISOString()}`);
  lines.push('');
  lines.push('Summary');
  lines.push('Metric,Value');
  lines.push(`All-time waste reclaimed (Kg),${stats.wasteReceivedKg}`);
  lines.push(`Registered cargo shipments,${stats.deliveriesCount}`);
  lines.push(`Estimated CO2 mitigated (Tons),${stats.co2MitigatedTons}`);
  lines.push(`Estimated reclaimed material value (INR),${stats.reclaimedValueEstimate}`);
  lines.push('');
  lines.push('Silo Inventory');
  lines.push('Category,Quantity (Kg),Capacity (Kg),Utilization %,Location,Last Updated');
  inventory.forEach((item) => {
    const utilization = item.capacityKg > 0 ? ((item.quantityKg / item.capacityKg) * 100).toFixed(1) : '0.0';
    lines.push(`${item.category},${item.quantityKg},${item.capacityKg},${utilization},${item.location ?? ''},${item.updatedAt}`);
  });

  const csv = lines.join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `ecoloop-industry-report-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
