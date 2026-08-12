import type { JsonResult } from "@/shared/crm/store/api-client";
import type { NotificationsListResponse } from "./notifications-api";

/** ponytail: no bulk DELETE on BE — page through list+dismiss until empty; swap for one call if added */
export async function dismissAllPaged(
  list: () => Promise<JsonResult<NotificationsListResponse>>,
  dismissOne: (id: string) => Promise<JsonResult<void>>,
  maxRounds = 50
): Promise<boolean> {
  for (let round = 0; round < maxRounds; round++) {
    const res = await list();
    if (!res.live) return false;
    if (res.data.total === 0 || res.data.items.length === 0) return true;
    for (const item of res.data.items) {
      const del = await dismissOne(item.id);
      if (!del.live) return false;
    }
  }
  return false;
}
