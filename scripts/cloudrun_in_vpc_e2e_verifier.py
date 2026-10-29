#!/usr/bin/env python3
"""
In-VPC Live HTTP 200 & DOM Payload Verifier for Internal-Ingress Cloud Run Services.

Runs inside Cloud Run Job `cloudrun-live-e2e-verifier` in `ramp-portal-dev` (`us-west1`)
attached to `cr-infra-vpc-network` / `cr-infra-subnetwork` (`--vpc-egress=all-traffic`),
satisfying `ingress: internal-and-cloud-load-balancing` without external mocks or proxies.
Mints real OIDC identity tokens from `metadata.google.internal` for each target Cloud Run
service URL, performs live HTTPS GET requests, verifies HTTP 200 + expected DOM/JSON
markers, and emits structured `CLOUDRUN_LIVE_E2E_VERIFICATION_RESULT` telemetry.
"""

from __future__ import annotations

import datetime as dt
import json
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from typing import Any, Dict, List

DEFAULT_TARGETS: List[Dict[str, Any]] = [
    {
        "service": "ge-blogs",
        "baseUrl": "https://ge-blogs-mi7l4h536a-uw.a.run.app",
        "checks": [
            {"path": "/", "markers": ["Multi-Tenancy Architecture", "Pattern A"]},
            {"path": "/api/health", "markers": ["HEALTHY", "cymbal-geap-multitenant-portal"]},
        ],
    },
    {
        "service": "promptcanvas",
        "baseUrl": "https://promptcanvas-mi7l4h536a-uw.a.run.app",
        "checks": [
            {"path": "/blogs", "markers": ["Architecture", "blogs"]},
            {"path": "/api/blogs/gcp-verify", "markers": ["ramp-portal-dev", "bbar-138hf0"]},
        ],
    },
    {
        "service": "ge-demos",
        "baseUrl": "https://ge-demos-mi7l4h536a-uw.a.run.app",
        "checks": [
            {"path": "/", "markers": ["<!DOCTYPE html"]},
            {"path": "/health", "markers": ["online", "toolsCount"]},
        ],
    },
    {
        "service": "cymbal-multi-tenant-patterns",
        "baseUrl": "https://cymbal-multi-tenant-patterns-mi7l4h536a-uw.a.run.app",
        "checks": [
            {"path": "/", "markers": ["E2E_MULTI_TENANT_PATTERNS_20_20_PASS", "\"assertions_passed\": 20"]},
        ],
    },
]


def mint_identity_token(audience: str) -> str:
    url = (
        "http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/identity?audience="
        + urllib.parse.quote(audience, safe="")
    )
    req = urllib.request.Request(url, headers={"Metadata-Flavor": "Google"})
    with urllib.request.urlopen(req, timeout=10) as resp:
        return resp.read().decode("utf-8").strip()


def verify_target(target: Dict[str, Any]) -> Dict[str, Any]:
    svc = target["service"]
    base_url = target["baseUrl"].rstrip("/")
    id_token = mint_identity_token(base_url)
    route_results = []
    all_ok = True

    for chk in target.get("checks", []):
        path = chk["path"]
        markers = chk.get("markers", [])
        full_url = f"{base_url}{path}"
        t0 = time.time()
        status_code = 0
        body_text = ""
        err_msg = ""
        try:
            req = urllib.request.Request(
                full_url,
                headers={
                    "Authorization": f"Bearer {id_token}",
                    "Accept": "text/html,application/json,*/*",
                    "User-Agent": "CloudRun-InVPC-E2E-Verifier/1.0",
                },
            )
            with urllib.request.urlopen(req, timeout=45) as resp:
                status_code = resp.status
                raw = resp.read()
                body_text = raw.decode("utf-8", errors="replace")
        except urllib.error.HTTPError as exc:
            status_code = exc.code
            body_text = exc.read().decode("utf-8", errors="replace")[:500]
            err_msg = f"HTTPError {exc.code}"
        except Exception as exc:
            err_msg = str(exc)

        elapsed_ms = round((time.time() - t0) * 1000, 1)
        matched = [m for m in markers if m.lower() in body_text.lower()]
        missing = [m for m in markers if m.lower() not in body_text.lower()]
        passed = status_code == 200 and len(missing) == 0
        if not passed:
            all_ok = False
        route_results.append(
            {
                "path": path,
                "url": full_url,
                "httpStatus": status_code,
                "responseBytes": len(body_text.encode("utf-8")),
                "latencyMs": elapsed_ms,
                "markersMatched": matched,
                "markersMissing": missing,
                "passed": passed,
                "error": err_msg,
            }
        )

    return {
        "service": svc,
        "baseUrl": base_url,
        "passed": all_ok,
        "routes": route_results,
    }


def main() -> int:
    raw_targets = os.environ.get("TARGET_SERVICES_JSON", "").strip()
    filter_csv = os.environ.get("TARGET_SERVICE_NAMES", "").strip()
    override_url = os.environ.get("TARGET_OVERRIDE_BASE_URL", "").strip()
    if raw_targets:
        targets = json.loads(raw_targets)
    else:
        targets = [dict(t) for t in DEFAULT_TARGETS]
    if filter_csv:
        wanted = [s.strip() for s in filter_csv.split(",") if s.strip()]
        matched = [dict(t) for t in targets if t["service"] in set(wanted)]
        known = {t["service"] for t in matched}
        for w in wanted:
            if w not in known:
                matched.append(
                    {
                        "service": w,
                        "baseUrl": override_url or f"https://{w}-mi7l4h536a-uw.a.run.app",
                        "checks": [{"path": "/", "markers": []}],
                    }
                )
        targets = matched
    if override_url and len(targets) == 1:
        targets[0]["baseUrl"] = override_url

    results = [verify_target(t) for t in targets]
    overall_passed = all(r["passed"] for r in results)
    summary = {
        "verifiedAt": dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "verifierExecution": os.environ.get("CLOUD_RUN_EXECUTION", "local"),
        "project": os.environ.get("VERIFIER_PROJECT_ID", "bbar-138hf0"),
        "region": "us-west1",
        "overallPassed": overall_passed,
        "servicesVerified": len(results),
        "results": results,
    }
    print("CLOUDRUN_LIVE_E2E_VERIFICATION_RESULT:" + json.dumps(summary), flush=True)
    return 0 if overall_passed else 1


if __name__ == "__main__":
    raise SystemExit(main())
