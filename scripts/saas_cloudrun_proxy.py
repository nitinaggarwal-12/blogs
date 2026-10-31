#!/usr/bin/env python3
"""
Authenticated Local Developer Reverse-Proxy for Google Cloud Run SaaS Containers.

Solves the Google Cloud Organization DRS (Domain Restricted Sharing) constraint:
- Services are deployed with `--no-allow-unauthenticated` in project `bbar-138hf0`.
- Standard browsers cannot directly open `.run.app` URLs because Chrome does not attach IAM Identity Tokens.
- `gcloud run services proxy` fails because it injects `Authorization: Bearer <ID_TOKEN>`,
  overwriting the downstream application's own Authorization headers (breaking Directus, Metabase, etc.).

This proxy solves both:
1. Listens on `http://localhost:<port>`
2. Mints an OIDC Identity Token with audience = target Cloud Run service URL (`gcloud auth print-identity-token --audiences=<url>`).
3. Injects `X-Serverless-Authorization: Bearer <token>` (the official Google Cloud Run header that passes through GFE and leaves the downstream app's `Authorization` header and cookies intact).
4. Forwards requests, handles redirects and cookies, and opens the user's browser.
"""
from __future__ import annotations

import argparse
import http.server
import json
import os
import re
import socketserver
import subprocess
import sys
import threading
import time
import urllib.error
import urllib.parse
import urllib.request
import webbrowser
from typing import Any
from pathlib import Path

SERVICES = {
    "directus": {
        "service_name": "cymbal-gcp-directus-hcm",
        "url": "https://cymbal-gcp-directus-hcm-fm3mts5x3a-uw.a.run.app",
        "default_port": 8080,
        "entry_path": "/admin/login",
        "title": "Directus Data Studio v11.1.0 (HCM Compensation RLS)",
        "credentials": "Email: sre-lead@finvault.com | Password: FinVault#2026!",
    },
    "seq": {
        "service_name": "cymbal-gcp-seq-apm",
        "url": "https://cymbal-gcp-seq-apm-fm3mts5x3a-uw.a.run.app",
        "default_port": 8081,
        "entry_path": "/#/events",
        "title": "Datalust Seq Observability v2024.3 (OpenTelemetry Spans)",
        "credentials": "No authentication required (Open access)",
    },
    "metabase": {
        "service_name": "cymbal-gcp-metabase-bi",
        "url": "https://cymbal-gcp-metabase-bi-fm3mts5x3a-uw.a.run.app",
        "default_port": 8082,
        "entry_path": "/question/27",
        "title": "Metabase Enterprise BI v0.50.26 (Saved Question #27 Liveboard)",
        "credentials": "Email: sre-lead@finvault.com | Password: FinVault#2026!",
    },
    "grafana": {
        "service_name": "cymbal-gcp-grafana-ent",
        "url": "https://cymbal-gcp-grafana-ent-fm3mts5x3a-uw.a.run.app",
        "default_port": 8083,
        "entry_path": "/d/finvault-sre-wb",
        "title": "Grafana Enterprise v11.2.0 (FinVault SRE Workbench)",
        "credentials": "Email: sre-lead@finvault.com | Password: FinVault#2026!",
    },
    "redmine": {
        "service_name": "cymbal-gcp-redmine-itsm",
        "url": "https://cymbal-gcp-redmine-itsm-fm3mts5x3a-uw.a.run.app",
        "default_port": 8084,
        "entry_path": "/projects/finvault-itsm/issues",
        "title": "Redmine ITSM v5.1 (FinVault Bank Support Cases)",
        "credentials": "Username: admin | Password: FinVault#2026!",
    },
    "nocodb": {
        "service_name": "cymbal-gcp-nocodb-edc",
        "url": "https://cymbal-gcp-nocodb-edc-fm3mts5x3a-uw.a.run.app",
        "default_port": 8085,
        "entry_path": "/#/nc/p7hoixnq3pk7t5j/mwlpti8f0afxn8s",
        "title": "NocoDB EDC / GxP v0.255.2 (Clinical Trial Records)",
        "credentials": "Email: sre-lead@finvault.com | Password: FinVault#2026!",
    },
    "gitea": {
        "service_name": "cymbal-gcp-gitea-sre",
        "url": "https://cymbal-gcp-gitea-sre-fm3mts5x3a-uw.a.run.app",
        "default_port": 8086,
        "entry_path": "/finvault/sre-escalations/issues/1",
        "title": "Gitea Enterprise Git v1.22.3 (SRE Escalation Repo)",
        "credentials": "Username: sre-lead | Password: FinVault#2026!",
    },
    "trino": {
        "service_name": "cymbal-gcp-trino-sql",
        "url": "https://cymbal-gcp-trino-sql-fm3mts5x3a-uw.a.run.app",
        "default_port": 8087,
        "entry_path": "/ui/",
        "title": "Trino Distributed SQL v440 (Query Coordinator)",
        "credentials": "Username: sre-lead@finvault.com (No password)",
    },
    "clickhouse": {
        "service_name": "cymbal-gcp-clickhouse-dw",
        "url": "https://cymbal-gcp-clickhouse-dw-fm3mts5x3a-uw.a.run.app",
        "default_port": 8088,
        "entry_path": "/play",
        "title": "ClickHouse Data Warehouse v24.8 (SQL Console)",
        "credentials": "Username: finvault_user | Password: FinVault#2026!",
    },
    "vault": {
        "service_name": "cymbal-gcp-vault-cmek",
        "url": "https://cymbal-gcp-vault-cmek-fm3mts5x3a-uw.a.run.app",
        "default_port": 8089,
        "entry_path": "/ui/vault/secrets/secret/show/tenants/finvault",
        "title": "HashiCorp Vault v1.13.3 (CMEK Key Namespace)",
        "credentials": "Method: Token | Token: fv-token-finvault-sre-2026",
    },
}

_TOKEN_CACHE: dict[str, tuple[str, float]] = {}


OIDC_CACHE_FILE = Path("/tmp/cymbal_gcp_cloudrun_oidc_cache.json")
COMPUTE_SA = "48439189383-compute@developer.gserviceaccount.com"


def get_oidc_token(audience: str) -> str:
    now = time.time()
    # 1. In-memory cache
    cached = _TOKEN_CACHE.get(audience)
    if cached and cached[1] > now:
        return cached[0]

    # 2. Check /tmp/cymbal_gcp_cloudrun_oidc_cache.json
    clean_aud = audience.rstrip("/")
    if OIDC_CACHE_FILE.is_file():
        try:
            cache_data = json.loads(OIDC_CACHE_FILE.read_text(encoding="utf-8"))
            if float(cache_data.get("expires_at", 0)) > now:
                tokens = cache_data.get("tokens", {})
                for k, v in tokens.items():
                    _TOKEN_CACHE[k.rstrip("/")] = (v, float(cache_data.get("expires_at", now + 1800)))
                if clean_aud in _TOKEN_CACHE:
                    return _TOKEN_CACHE[clean_aud][0]
        except Exception:
            pass

    # 3. Try gcloud impersonation of compute SA
    cmd_imp = [
        "gcloud", "auth", "print-identity-token",
        f"--impersonate-service-account={COMPUTE_SA}",
        f"--audiences={clean_aud}",
    ]
    try:
        proc = subprocess.run(cmd_imp, capture_output=True, text=True)
        tok = proc.stdout.strip()
        if proc.returncode == 0 and tok.startswith("ey"):
            _TOKEN_CACHE[clean_aud] = (tok, now + 2400)
            return tok
    except Exception:
        pass

    # 4. Fallback: Trigger Cloud Run oidc-minter batch job
    print(f"\n==> [OIDC Minter] Minting audience token via Cloud Run minter job for {clean_aud}...")
    minter_script = Path(__file__).resolve().parent / "provision_gcp_cloudrun_third_party_apps.py"
    if minter_script.is_file():
        try:
            subprocess.run(
                [sys.executable, "-B", str(minter_script), "--mint-tokens-only"],
                check=True,
            )
            if OIDC_CACHE_FILE.is_file():
                cache_data = json.loads(OIDC_CACHE_FILE.read_text(encoding="utf-8"))
                tokens = cache_data.get("tokens", {})
                for k, v in tokens.items():
                    _TOKEN_CACHE[k.rstrip("/")] = (v, float(cache_data.get("expires_at", now + 1800)))
                if clean_aud in _TOKEN_CACHE:
                    return _TOKEN_CACHE[clean_aud][0]
        except Exception as exc:
            print(f"[WARN] Cloud Run minter job invocation returned: {exc}")

    raise RuntimeError(
        f"Unable to mint Cloud Run OIDC token for audience: {audience}. "
        f"Please run 'python3 scripts/provision_gcp_cloudrun_third_party_apps.py --mint-tokens-only' on your Mac."
    )


class CloudRunProxyHandler(http.server.BaseHTTPRequestHandler):
    target_url: str
    target_host: str
    target_parsed: urllib.parse.ParseResult
    local_port: int

    def log_message(self, format: str, *args: Any) -> None:
        pass  # Quiet logging

    def do_request(self, method: str) -> None:
        try:
            tok = get_oidc_token(self.target_url)
        except Exception:
            self.send_error(502, "Failed to authenticate to Google Cloud Run via gcloud")
            return

        target_full = f"{self.target_url}{self.path}"
        headers = {}
        for k, v in self.headers.items():
            k_lower = k.lower()
            if k_lower in ("host", "connection", "accept-encoding", "content-length"):
                continue
            headers[k] = v

        headers["Host"] = self.target_host
        headers["X-Serverless-Authorization"] = f"Bearer {tok}"

        body = None
        content_length = self.headers.get("Content-Length")
        if content_length:
            try:
                body = self.rfile.read(int(content_length))
            except Exception:
                body = None

        req = urllib.request.Request(target_full, data=body, method=method, headers=headers)
        
        # Don't follow redirects automatically so cookies/sessions can be rewritten
        class NoRedirectHandler(urllib.request.HTTPRedirectHandler):
            def http_error_302(self, req, fp, code, msg, headers):
                return fp
            http_error_301 = http_error_303 = http_error_307 = http_error_308 = http_error_302

        opener = urllib.request.build_opener(NoRedirectHandler)

        try:
            resp = opener.open(req, timeout=45)
            status = resp.status if hasattr(resp, "status") else resp.code
            resp_headers = resp.headers
            resp_body = resp.read()
        except urllib.error.HTTPError as exc:
            status = exc.code
            resp_headers = exc.headers
            resp_body = exc.read()
        except Exception as exc:
            self.send_error(502, f"Proxy upstream error: {exc}")
            return

        self.send_response(status)
        for hk, hv in resp_headers.items():
            hk_lower = hk.lower()
            if hk_lower in ("connection", "transfer-encoding"):
                continue
            if hk_lower == "location":
                # Rewrite Cloud Run URL to localhost:<port>
                hv = hv.replace(self.target_url, f"http://localhost:{self.local_port}")
            if hk_lower == "set-cookie":
                # Strip Secure and domain restriction so cookie works on localhost
                hv = re.sub(r";\s*secure\b", "", hv, flags=re.IGNORECASE)
                hv = re.sub(r";\s*domain=[^;]+", "", hv, flags=re.IGNORECASE)
                hv = re.sub(r";\s*samesite=none\b", "; SameSite=Lax", hv, flags=re.IGNORECASE)
            self.send_header(hk, hv)
        self.end_headers()

        try:
            self.wfile.write(resp_body)
        except (BrokenPipeError, ConnectionResetError):
            pass

    def do_GET(self) -> None:
        self.do_request("GET")

    def do_POST(self) -> None:
        self.do_request("POST")

    def do_PUT(self) -> None:
        self.do_request("PUT")

    def do_DELETE(self) -> None:
        self.do_request("DELETE")

    def do_PATCH(self) -> None:
        self.do_request("PATCH")

    def do_HEAD(self) -> None:
        self.do_request("HEAD")

    def do_OPTIONS(self) -> None:
        self.do_request("OPTIONS")


def run_service_proxy(key: str, port: int | None = None, open_browser: bool = True) -> None:
    spec = SERVICES.get(key)
    if not spec:
        print(f"Unknown service '{key}'. Available: {', '.join(SERVICES.keys())}")
        sys.exit(1)

    port = port or spec["default_port"]
    target_url = spec["url"]
    target_parsed = urllib.parse.urlparse(target_url)

    handler_cls = type(
        f"Proxy_{key}",
        (CloudRunProxyHandler,),
        {
            "target_url": target_url,
            "target_host": target_parsed.netloc,
            "target_parsed": target_parsed,
            "local_port": port,
        },
    )

    class ThreadedServer(socketserver.ThreadingMixIn, http.server.HTTPServer):
        daemon_threads = True
        allow_reuse_address = True

    try:
        httpd = ThreadedServer(("127.0.0.1", port), handler_cls)
    except OSError as e:
        print(f"[ERROR] Port {port} is already in use: {e}")
        print("Try stopping any existing proxy or use a different port, e.g. --port=8888")
        sys.exit(1)

    local_url = f"http://localhost:{port}{spec['entry_path']}"
    print("=" * 80)
    print(f"🚀 LIVE PROXY ACTIVE: {spec['title']}")
    print("=" * 80)
    print(f"  • Local URL    : {local_url}")
    print(f"  • Upstream Host: {target_url}")
    print(f"  • Credentials  : {spec['credentials']}")
    print(f"  • Security     : Autorefreshed X-Serverless-Authorization OIDC token injected")
    print("=" * 80)
    print("Press Ctrl+C to stop the proxy.\n")

    if open_browser:
        def _open():
            time.sleep(1.0)
            webbrowser.open(local_url)
        threading.Thread(target=_open, daemon=True).start()

    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n==> Proxy stopped.")
        httpd.server_close()


def run_all_proxies() -> None:
    print("=" * 80)
    print("🚀 LAUNCHING BACKGROUND PROXIES FOR ALL 10 SAAS PRODUCTS")
    print("=" * 80)
    threads = []
    for key, spec in SERVICES.items():
        port = spec["default_port"]
        target_url = spec["url"]
        target_parsed = urllib.parse.urlparse(target_url)
        handler_cls = type(
            f"Proxy_{key}",
            (CloudRunProxyHandler,),
            {
                "target_url": target_url,
                "target_host": target_parsed.netloc,
                "target_parsed": target_parsed,
                "local_port": port,
            },
        )
        class ThreadedServer(socketserver.ThreadingMixIn, http.server.HTTPServer):
            daemon_threads = True
            allow_reuse_address = True

        try:
            httpd = ThreadedServer(("127.0.0.1", port), handler_cls)
            t = threading.Thread(target=httpd.serve_forever, daemon=True)
            t.start()
            threads.append(httpd)
            print(f"  [{key:<10}] http://localhost:{port}{spec['entry_path']:<35} -> {spec['credentials']}")
        except OSError as e:
            print(f"  [{key:<10}] Port {port} in use, skipping.")

    print("=" * 80)
    print("All 10 proxies running locally. Open any link above in your browser.")
    print("Press Ctrl+C to stop all proxies.")
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\nStopping all proxies...")
        for h in threads:
            h.server_close()


def main() -> None:
    parser = argparse.ArgumentParser(description="Authenticated Cloud Run SaaS Reverse-Proxy")
    parser.add_argument(
        "service",
        nargs="?",
        default="directus",
        choices=list(SERVICES.keys()) + ["all"],
        help="SaaS service to proxy (default: directus, or 'all')",
    )
    parser.add_argument("--port", type=int, help="Override local listening port")
    parser.add_argument("--no-browser", action="store_true", help="Do not automatically open browser")

    args = parser.parse_args()
    if args.service == "all":
        run_all_proxies()
    else:
        run_service_proxy(args.service, port=args.port, open_browser=not args.no_browser)


if __name__ == "__main__":
    main()
