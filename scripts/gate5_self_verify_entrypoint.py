#!/usr/bin/env python3
"""
Gate 5 Live Cloud Run Revision HTTP 200 & DOM/JSON Payload Verifier (Python Runtime).
Starts the target server command, waits for TCP/HTTP readiness on 127.0.0.1:$PORT,
executes live HTTP GET verification across all configured routes & DOM/JSON markers,
emits structured `CLOUDRUN_LIVE_E2E_VERIFICATION_RESULT:<json>` telemetry to Cloud Logging,
and fails closed (`os._exit(1)`) if any route returns non-200 or misses any marker.
"""

from __future__ import annotations

import datetime as dt
import hashlib
import json
import os
import signal
import socket
import subprocess
import sys
import threading
import time
import urllib.error
import urllib.request


def wait_for_port(port: int, timeout_sec: float = 45.0) -> bool:
    deadline = time.time() + timeout_sec
    while time.time() < deadline:
        try:
            with socket.create_connection(("127.0.0.1", port), timeout=1.5):
                return True
        except OSError:
            time.sleep(0.4)
    return False


def run_gate5_checks(proc: subprocess.Popen) -> None:
    port = int(os.environ.get("PORT", "8080"))
    raw_routes = os.environ.get("GATE5_ROUTES_JSON", '[{"path":"/","markers":[]}]')
    routes_cfg = json.loads(raw_routes)
    svc = os.environ.get("K_SERVICE", "local-service")
    rev = os.environ.get("K_REVISION", "local-revision")
    if svc == "ge-blogs" and not any(r.get("path") == "/api/saas-5-live-verify" for r in routes_cfg):
        routes_cfg.append(
            {
                "path": "/api/saas-5-live-verify",
                "markers": ["CLOUDRUN_30_OF_30_LIVE_CROSSCLOUD_PASS", "cymbal-a2a-mcp-gateway-suyxm3caof"],
                "timeoutSec": 150,
            }
        )

    if not wait_for_port(port, timeout_sec=50.0):
        err_report = {
            "verifiedAt": dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
            "service": svc,
            "revision": rev,
            "overallPassed": False,
            "error": f"Server did not listen on 127.0.0.1:{port} within 50s",
            "routes": [],
        }
        print("CLOUDRUN_LIVE_E2E_VERIFICATION_RESULT:" + json.dumps(err_report), flush=True)
        proc.terminate()
        os._exit(1)

    time.sleep(0.25)
    route_results = []
    all_ok = True
    for chk in routes_cfg:
        path = chk.get("path", "/")
        markers = chk.get("markers", [])
        req_timeout = float(chk.get("timeoutSec", 45))
        url = f"http://127.0.0.1:{port}{path}"
        status_code = 0
        raw_bytes = b""
        err_msg = ""
        matched = []
        missing = list(markers)
        passed = False
        elapsed_ms = 0.0
        for attempt in range(1, 4):
            t0 = time.time()
            status_code = 0
            raw_bytes = b""
            err_msg = ""
            try:
                req = urllib.request.Request(
                    url,
                    headers={"Accept": "text/html,application/json,*/*", "User-Agent": "CloudRun-Gate5-Verifier/1.0"},
                )
                with urllib.request.urlopen(req, timeout=req_timeout) as resp:
                    status_code = resp.status
                    raw_bytes = resp.read()
            except urllib.error.HTTPError as exc:
                status_code = exc.code
                raw_bytes = exc.read()[:512]
                err_msg = f"HTTPError {exc.code}"
            except Exception as exc:
                err_msg = str(exc)

            body_text = raw_bytes.decode("utf-8", errors="replace")
            elapsed_ms = round((time.time() - t0) * 1000, 1)
            matched = [m for m in markers if m.lower() in body_text.lower()]
            missing = [m for m in markers if m.lower() not in body_text.lower()]
            passed = status_code == 200 and len(missing) == 0
            if passed:
                break
            if attempt < 3:
                time.sleep(2.0 * attempt)

        if not passed:
            all_ok = False
        route_results.append(
            {
                "path": path,
                "httpStatus": status_code,
                "responseBytes": len(raw_bytes),
                "bodySha256Short": hashlib.sha256(raw_bytes).hexdigest()[:16],
                "latencyMs": elapsed_ms,
                "markersMatched": matched,
                "markersMissing": missing,
                "passed": passed,
                "error": err_msg,
            }
        )

    summary = {
        "verifiedAt": dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "verificationMode": "cloud_run_revision_live_http_dom_probe",
        "project": os.environ.get("GOOGLE_CLOUD_PROJECT", "ramp-portal-dev"),
        "region": os.environ.get("GCP_REGION", "us-west1"),
        "service": svc,
        "revision": rev,
        "overallPassed": all_ok,
        "routes": route_results,
    }
    print("CLOUDRUN_LIVE_E2E_VERIFICATION_RESULT:" + json.dumps(summary), flush=True)
    if not all_ok:
        proc.terminate()
        os._exit(1)


def main() -> int:
    if len(sys.argv) < 2:
        print("Usage: gate5_self_verify_entrypoint.py <cmd...>", file=sys.stderr)
        return 1
    proc = subprocess.Popen(sys.argv[1:])

    def _forward(signum: int, _frame: object) -> None:
        proc.send_signal(signum)

    signal.signal(signal.SIGTERM, _forward)
    signal.signal(signal.SIGINT, _forward)

    t = threading.Thread(target=run_gate5_checks, args=(proc,), daemon=True)
    t.start()
    return proc.wait()


if __name__ == "__main__":
    raise SystemExit(main())
