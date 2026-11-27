-- =============================================================================
-- Workstream 2.3: AlloyDB for PostgreSQL Row-Level Security (RLS) Schema
-- Enforces Hop 5 Data Isolation in Pattern A (Pooled Architecture)
-- =============================================================================

CREATE TABLE IF NOT EXISTS cymbal_incidents (
    incident_id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL,
    service_name VARCHAR(128) NOT NULL,
    severity VARCHAR(16) NOT NULL,
    summary TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable and force Row-Level Security even for table owners
ALTER TABLE cymbal_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE cymbal_incidents FORCE ROW LEVEL SECURITY;

-- Drop existing policy if re-running
DROP POLICY IF EXISTS tenant_isolation_rls_policy ON cymbal_incidents;

-- Create strict cryptographic session variable RLS policy
-- Requires `SET LOCAL app.current_tenant = '<verified_tenant_id>';` inside every transaction
CREATE POLICY tenant_isolation_rls_policy ON cymbal_incidents
    AS RESTRICTIVE
    FOR ALL
    USING (tenant_id = NULLIF(current_setting('app.current_tenant', true), ''))
    WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant', true), ''));

-- Episodic vector memory table (pgvector 768d) governed by identical FORCE RLS invariant
CREATE TABLE IF NOT EXISTS agent_episodic_memory (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL,
    content TEXT NOT NULL,
    embedding VECTOR(768),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE agent_episodic_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_episodic_memory FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_policy ON agent_episodic_memory;

CREATE POLICY tenant_isolation_policy ON agent_episodic_memory
    AS RESTRICTIVE
    FOR ALL
    USING (tenant_id = NULLIF(current_setting('app.current_tenant', true), ''))
    WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant', true), ''));

-- Seed canonical FinVault Bank and RetailStream Corp incidents
INSERT INTO cymbal_incidents (incident_id, tenant_id, service_name, severity, summary)
VALUES
    ('INC-FV-9001', 'finvault', 'Core-Ledger-Wire-Settlement', 'P1',
     'Latency spike on wire settlement queue; trace contains ACCT-8849201944 and SWIFT-FNVTUS33XXX.'),
    ('INC-RS-4012', 'retailstream', 'Checkout-Payment-Gateway', 'P1',
     'Timeout in payment capture; raw log includes card 4532-9910-8821-7743.')
ON CONFLICT (incident_id) DO NOTHING;
