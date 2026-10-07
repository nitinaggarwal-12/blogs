"""
Hop 1 — Edge Identity & Token Exchange PEP (Cloud Armor / IAP + RFC 8693 OBO + DPoP).

Enforces Governance Pillar 2 (Identity & Tool Auth) at the network edge:
1. Strips any client-supplied or forged `X-Tenant-ID` / `X-Cymbal-Tier` headers.
2. Verifies the upstream IdP JWT (Google Workspace OIDC for FinVault Bank or
   Microsoft Entra ID for RetailStream Corp).
3. Performs RFC 8693 On-Behalf-Of (OBO) token exchange bound to a DPoP
   (Demonstrating Proof-of-Possession, RFC 9449) public key thumbprint (`jkt`).
"""

import hashlib
from typing import Dict, Optional, Tuple
from ..models import (
    CryptographicContext,
    HopAuditRecord,
    IsolationTopology,
    TENANT_PROFILES,
    TenantProfile,
)


FORGED_HEADER_DENYLIST = {
    "x-tenant-id",
    "x-cymbal-tenant",
    "x-cymbal-tier",
    "x-gcp-project-override",
}

IDP_ISSUER_MAP = {
    "https://accounts.google.com/finvault.com": "finvault",
    "https://login.microsoftonline.com/retailstream-tenant-guid/v2.0": "retailstream",
}


class EdgeIdentityPEP:
    """Simulates Cloud Armor + Identity-Aware Proxy (IAP) + RFC 8693 OBO at Hop 1."""

    def __init__(self, tenant_profiles: Optional[Dict[str, TenantProfile]] = None) -> None:
        self.tenant_profiles = tenant_profiles if tenant_profiles is not None else TENANT_PROFILES

    def authenticate_and_mint_context(
        self,
        raw_headers: Dict[str, str],
        jwt_claims: Dict[str, str],
        dpop_proof_jkt: str,
        session_id: str,
        topology: IsolationTopology = IsolationTopology.PATTERN_A_POOLED,
    ) -> Tuple[CryptographicContext, HopAuditRecord]:
        stripped = []
        for k, v in raw_headers.items():
            if k.lower() in FORGED_HEADER_DENYLIST:
                stripped.append(f"{k}: {v}")

        issuer = jwt_claims.get("iss", "")
        sub = jwt_claims.get("sub", "")
        if issuer not in IDP_ISSUER_MAP or not sub:
            raise PermissionError(
                f"Hop 1 IAP/OIDC Verification Failed: Untrusted issuer '{issuer}' or missing subject."
            )

        resolved_tenant_id = IDP_ISSUER_MAP[issuer]
        profile = self.tenant_profiles[resolved_tenant_id]

        if not dpop_proof_jkt or len(dpop_proof_jkt) < 8:
            raise PermissionError("Hop 1 DPoP Verification Failed: Missing RFC 9449 DPoP proof jkt.")

        obo_material = f"urn:ietf:params:oauth:grant-type:token-exchange|{resolved_tenant_id}|{sub}|{dpop_proof_jkt}"
        obo_hash = hashlib.sha256(obo_material.encode("utf-8")).hexdigest()[:24]

        ctx = CryptographicContext(
            tenant_id=resolved_tenant_id,
            user_principal=sub,
            tier=profile.tier,
            idp=profile.idp,
            obo_access_token_hash=obo_hash,
            dpop_jkt_thumbprint=dpop_proof_jkt,
            session_id=session_id,
            stripped_forged_headers=stripped,
            active_topology=topology,
        )

        audit = HopAuditRecord(
            hop_number=1,
            hop_name="Hop 1 • Edge Identity PEP (Cloud Armor / IAP + RFC 8693 OBO + DPoP)",
            decision="ALLOW",
            status_code=200,
            detail=(
                f"Authenticated {sub} -> tenant='{resolved_tenant_id}' ({profile.tier.value}). "
                f"Stripped {len(stripped)} forged header(s)."
            ),
            metadata={
                "stripped_forged_headers": stripped,
                "obo_token_hash": obo_hash,
                "dpop_jkt": dpop_proof_jkt,
                "idp": profile.idp.value,
            },
        )
        return ctx, audit
