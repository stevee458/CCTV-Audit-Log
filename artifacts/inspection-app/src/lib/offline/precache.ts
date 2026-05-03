import { customFetch } from "@workspace/api-client-react";
import type { QueryClient } from "@tanstack/react-query";
import {
  getListDepotsQueryKey,
  getListViolationCategoriesQueryKey,
  getListUsersQueryKey,
  getListDrivesQueryKey,
  getListAssetsQueryKey,
  getListStockSkusQueryKey,
  getListInspectionsQueryKey,
  getListMaintenanceVisitsQueryKey,
  getListStockRequestsQueryKey,
} from "@workspace/api-client-react";

const ENDPOINTS: Array<{ key: readonly unknown[]; url: string }> = [
  { key: getListDepotsQueryKey(), url: "/api/depots" },
  { key: getListViolationCategoriesQueryKey(), url: "/api/violation-categories" },
  { key: getListDrivesQueryKey(), url: "/api/drives" },
  { key: getListAssetsQueryKey(), url: "/api/assets" },
  { key: getListStockSkusQueryKey(), url: "/api/stock/skus" },
  { key: getListInspectionsQueryKey(), url: "/api/inspections" },
  { key: getListUsersQueryKey(), url: "/api/users" },
  { key: getListMaintenanceVisitsQueryKey(), url: "/api/maintenance/visits" },
  { key: getListStockRequestsQueryKey(), url: "/api/stock/requests" },
];

export async function precacheReferenceData(qc: QueryClient): Promise<void> {
  await Promise.all(
    ENDPOINTS.map(async ({ key, url }) => {
      try {
        const data = await customFetch<unknown>(url, { method: "GET" });
        qc.setQueryData(key as readonly unknown[], data);
      } catch {
        // ignore — best-effort warm-up.
      }
    }),
  );
}
