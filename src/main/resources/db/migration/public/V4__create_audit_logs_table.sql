CREATE TABLE IF NOT EXISTS public.audit_logs (
    id             BIGSERIAL PRIMARY KEY,
    actor_username VARCHAR(255),
    actor_role     VARCHAR(50),
    tenant_id      VARCHAR(100),
    action         VARCHAR(100),
    resource_type  VARCHAR(100),
    resource_id    BIGINT,
    details        TEXT,
    ip_address     VARCHAR(45),
    http_method    VARCHAR(10),
    endpoint_path  VARCHAR(500),
    http_status    SMALLINT,
    created_at     TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_actor ON public.audit_logs(actor_username);
CREATE INDEX IF NOT EXISTS idx_audit_tenant ON public.audit_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_audit_resource ON public.audit_logs(resource_type, action);

