import type { CrmLead } from "@/shared/crm/store/types";
import { discoveredCompanyIdForLead } from "@/shared/crm/lead-discovery/discovery-catalog";

/** Deep-link to the lead's discovery company profile when available. */
export function leadDiscoverySourceHref(lead: CrmLead): string {
  const discoveryId = discoveredCompanyIdForLead(lead);
  if (discoveryId) {
    return `/lead-discovery?discoveryCompanyId=${encodeURIComponent(discoveryId)}`;
  }
  const external = lead.sourceLinks.find((l) => l.url.trim())?.url;
  if (external) return external;
  return "/lead-discovery";
}
