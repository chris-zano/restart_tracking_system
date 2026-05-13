import "server-only";
import { api } from "./_client";
import type { AuditLogQuery, AuditLogResponse, Page } from "../types";

export const auditLogsApi = {
  query: (q: AuditLogQuery = {}) => {
    const usp = new URLSearchParams();
    if (q.actorUsername) usp.set("actorUsername", q.actorUsername);
    if (q.tenantId)      usp.set("tenantId", q.tenantId);
    if (q.resourceType)  usp.set("resourceType", q.resourceType);
    if (q.action)        usp.set("action", q.action);
    if (q.page !== undefined) usp.set("page", String(q.page));
    if (q.size !== undefined) usp.set("size", String(q.size));
    const qs = usp.toString();
    return api<Page<AuditLogResponse>>(`/api/admin/audit-logs${qs ? `?${qs}` : ""}`);
  },
};
