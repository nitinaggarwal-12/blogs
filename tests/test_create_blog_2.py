#!/usr/bin/env python3
"""
Hermetic 12-Gate + Opt-In Fail-Closed Live E2E Test Suite for Create Blog 2
(`GET /create-blog-2`, `/api/create-blog-2/*`, `scripts/create_blog_2_engine.py`,
`templates/create_blog_2_page.html`, and `js/create_blog_2.js`).
"""

from __future__ import annotations

import base64
import hashlib
from http.server import ThreadingHTTPServer
import io
import json
import os
from pathlib import Path
import re
import struct
import subprocess
import sys
import tempfile
import threading
import time
import unittest
import urllib.error
import urllib.request
import xml.etree.ElementTree as ET
import zipfile
import zlib

sys.dont_write_bytecode = True

ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from scripts import create_blog1_engine as cb1  # noqa: E402
from scripts import create_blog_2_engine as cb2  # noqa: E402
import server as srv  # noqa: E402


def _make_png_with_text_chunk(width: int = 1280, height: int = 720, rgb: tuple = (26, 115, 232), text_payload: bytes = b"Comment\x00secret-metadata") -> bytes:
    """Builds a valid PNG with an ancillary tEXt chunk to verify metadata stripping."""
    def _chunk(ctype: bytes, data: bytes) -> bytes:
        crc = zlib.crc32(ctype + data) & 0xFFFFFFFF
        return struct.pack(">I", len(data)) + ctype + data + struct.pack(">I", crc)

    ihdr = struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0)
    row = b"\x00" + bytes(rgb) * width
    raw = zlib.compress(row * height, level=1)
    return (
        b"\x89PNG\r\n\x1a\n"
        + _chunk(b"IHDR", ihdr)
        + _chunk(b"tEXt", text_payload)
        + _chunk(b"IDAT", raw)
        + _chunk(b"IEND", b"")
    )


def _sample_blueprint_12() -> dict:
    raw = {
        "title": "Zero-Trust Multi-Tenant MCP Gateway on Cloud Run",
        "subtitle": "Enforcing per-tenant isolation, IAM verification, and DLP egress controls for agentic tools.",
        "slugHint": "zt-mcp-gateway-cb2",
        "summary": (
            "This reference architecture illustrates a multi-tenant Model Context Protocol (MCP) gateway hosted "
            "on Cloud Run with Identity-Aware Proxy, Private Service Connect ingress, Sensitive Data Protection egress filtering, "
            "and tamper-evident BigQuery audit logs."
        ),
        "domain": "Multi-Tenant Agentic AI",
        "audience": "Solutions Architects & Platform Engineers",
        "estimatedReadMinutes": 11,
        "keyTakeaways": [
            "Bind every tenant request to cryptographic JWT claims before routing to downstream MCP servers.",
            "Enforce VPC Service Controls and Private Service Connect so tools never traverse the public internet.",
            "Apply Sensitive Data Protection egress redaction before streaming responses back to callers.",
        ],
        "architectureZones": [
            {
                "id": "z1",
                "title": "Edge & Ingress",
                "subtitle": "External HTTPS & WAF",
                "components": [
                    {"id": "c1", "label": "Global Cloud LB", "sub": "TLS 1.3 + Cloud Armor", "role": "WAF & rate limits"},
                    {"id": "c2", "label": "Identity-Aware Proxy", "sub": "OIDC / ES256 JWT", "role": "Verify user identity"},
                ],
            },
            {
                "id": "z2",
                "title": "Control & Security",
                "subtitle": "Policy & Auth Plane",
                "components": [
                    {"id": "c3", "label": "IAM Policy Engine", "sub": "Fail-closed RBAC", "role": "Authorize tool scope"},
                    {"id": "c4", "label": "Cloud KMS CMEK", "sub": "Customer keys", "role": "Revocable encryption"},
                ],
            },
            {
                "id": "z3",
                "title": "Compute & Runtime",
                "subtitle": "Serverless MCP Pool",
                "components": [
                    {"id": "c5", "label": "Cloud Run MCP Proxy", "sub": "gVisor sandbox", "role": "Execute stateless proxy"},
                    {"id": "c6", "label": "Sensitive Data Protection", "sub": "Cloud DLP Redactor", "role": "Scrub egress tokens"},
                ],
            },
            {
                "id": "z4",
                "title": "Data & Telemetry",
                "subtitle": "Durable Governance",
                "components": [
                    {"id": "c7", "label": "BigQuery Audit Table", "sub": "Row-Level Security", "role": "Immutable audit log"},
                    {"id": "c8", "label": "Cloud Storage State", "sub": "CMEK + Versioning", "role": "Durable artifact store"},
                ],
            },
        ],
        "architectureEdges": [
            {"from": "c1", "to": "c2", "label": "HTTPS / TLS 1.3", "dashed": False},
            {"from": "c2", "to": "c3", "label": "Signed JWT", "dashed": False},
            {"from": "c3", "to": "c5", "label": "Scoped Call", "dashed": False},
            {"from": "c5", "to": "c6", "label": "Inspect Egress", "dashed": False},
            {"from": "c6", "to": "c7", "label": "Write Audit Log", "dashed": True},
            {"from": "c4", "to": "c8", "label": "CMEK Key Check", "dashed": True},
        ],
        "sequenceActors": [
            {"id": "a1", "label": "Caller / Agent", "sub": "OIDC Token"},
            {"id": "a2", "label": "Cloud LB & IAP", "sub": "Edge Verify"},
            {"id": "a3", "label": "Policy Engine", "sub": "RBAC Check"},
            {"id": "a4", "label": "MCP Gateway", "sub": "Cloud Run"},
            {"id": "a5", "label": "BigQuery Audit", "sub": "RLS Sink"},
        ],
        "sequenceSteps": [
            {"num": 1, "from": "a1", "to": "a2", "label": "POST /mcp/call with bearer JWT", "kind": "request"},
            {"num": 2, "from": "a2", "to": "a3", "label": "Verify JWT signature & tenant binding", "kind": "guard"},
            {"num": 3, "from": "a3", "to": "a4", "label": "Dispatch authorized tool request", "kind": "request"},
            {"num": 4, "from": "a4", "to": "a5", "label": "Append signed audit event record", "kind": "guard"},
            {"num": 5, "from": "a4", "to": "a1", "label": "HTTP 200 redacted response payload", "kind": "response"},
        ],
        "sections": [
            {
                "heading": "Executive Summary & Architectural Challenge",
                "paragraphs": [
                    "Exposing internal enterprise tools to autonomous agents creates acute lateral-movement and data-exfiltration risk. "
                    "Shared headers alone can be spoofed when multi-tenant agents operate behind a single reverse proxy. "
                    "A fail-closed MCP gateway decouples identity verification from downstream tool invocation so every call carries verifiable tenant provenance within a 150 ms latency target."
                ],
                "bullets": [
                    "Reject unauthenticated or cross-tenant requests before spawning container workers.",
                    "Avoid hardcoding long-lived service-account keys in environment variables.",
                    "Tag every modeled target separately from official published GCP SLAs.",
                ],
                "table": {
                    "headers": ["Control", "Implementation", "Failure Mode"],
                    "rows": [
                        ["Ingress Auth", "Identity-Aware Proxy ES256 JWT", "HTTP 403 fail-closed"],
                        ["Egress DLP", "Sensitive Data Protection inspect", "Block or redact response"],
                    ],
                },
            },
            {
                "heading": "Control Plane, Networking & CMEK Revocation",
                "paragraphs": [
                    "Private Service Connect confines backend API traffic inside private allocations without exposing external endpoints. "
                    "Pairing Cloud Storage and BigQuery artifacts with Customer-Managed Encryption Keys gives enterprise tenants "
                    "a single cryptographic kill-switch if an account requires urgent containment."
                ],
                "bullets": [
                    "Enable VPC Service Controls around BigQuery datasets and Cloud Storage buckets.",
                    "Separate reader and administrator IAM bindings via Workload Identity.",
                ],
            },
            {
                "heading": "Operational Trade-offs & Quota Guardrails",
                "paragraphs": [
                    "Inline DLP scanning adds predictable per-request latency while lowering accidental secret exposure risk. "
                    "Size Cloud Run concurrency, memory, and per-tenant rate limits defensively to insulate bursty callers from shared workers."
                ],
                "bullets": [
                    "Use sliding-window per-tenant rate counters to prevent noisy-neighbor exhaustion.",
                    "Emit structured JSON audit records for every rejected or redacted invocation.",
                ],
                "table": {
                    "headers": ["Pattern", "Isolation", "Latency Impact"],
                    "rows": [
                        ["Pooled Gateway", "Logical JWT + RLS", "Lowest overhead"],
                        ["Dedicated Spoke", "Project / VPC-SC Silo", "Moderate setup cost"],
                    ],
                },
            },
        ],
        "slides": [
            {
                "number": i,
                "kicker": f"PART {i}",
                "title": f"Architecture Control Point {i} — Zero-Trust MCP",
                "subtitle": f"Takeaway summary for slide {i}",
                "bullets": [f"Key architecture control {i}.A", f"Verification boundary {i}.B", f"Operational guardrail {i}.C"],
                "calloutLabel": "Target Ceiling" if i == 2 else "",
                "calloutValue": "150 ms" if i == 2 else "",
                "table": {"headers": ["Plane", "Service", "Control"], "rows": [["Edge", "Cloud LB", "WAF"], ["Data", "BigQuery", "RLS"]]} if i in (4, 11) else None,
                "codeSnippet": "def verify_tenant(jwt_sub: str) -> bool:\n    return bool(jwt_sub)\n" if i == 10 else "",
                "speakerNotes": f"This section examines the engineering controls covering part {i} of the MCP gateway reference architecture.",
            }
            for i in range(1, 13)
        ],
        "codeStarter": {
            "readmeSummary": "Verify variables.tf and run terraform plan inside a dedicated sandbox project.",
            "terraformMain": 'terraform {\n  required_version = ">= 1.5.0"\n}\nresource "google_cloud_run_v2_service" "mcp" {\n  name = "mcp-gw"\n  location = "us-central1"\n}\n',
            "terraformVars": 'variable "project_id" {\n  type = string\n}\n',
            "pythonApp": '"""Starter proxy check."""\n\ndef check_tenant(tenant_id: str) -> dict:\n    return {"tenant": tenant_id, "allowed": bool(tenant_id)}\n',
            "deploySh": "#!/usr/bin/env bash\nset -euo pipefail\necho 'Dry run only'\n",
            "verifySh": "#!/usr/bin/env bash\nset -euo pipefail\npython3 -m py_compile app.py\n",
        },
        "claimLedger": [
            {"id": "CLM-01", "claim": "Gateway authorization mode", "value": "Fail-closed (HTTP 403)", "provenance": "GCP_DOCUMENTED", "sourceUrl": "https://cloud.google.com/run/docs/securing/overview", "basis": "IAP / RBAC default-deny"},
            {"id": "CLM-02", "claim": "Gateway added proxy p95 overhead", "value": "150 ms", "provenance": "EXAMPLE_TARGET", "basis": "Illustrative latency budget prior to live load test"},
            {"id": "CLM-03", "claim": "Estimated reading time", "value": "11 min", "provenance": "DERIVED_MODEL", "basis": "Word count estimate"},
        ],
        "faq": [
            {"question": "Does this template replace live penetration testing?", "answer": "No. Review and test all IAM rules in a staging project first."},
        ],
        "references": [
            {"title": "Google Cloud Architecture Center", "url": "https://cloud.google.com/architecture", "note": "Reference standards"},
            {"title": "Cloud Run Security Overview", "url": "https://cloud.google.com/run/docs/securing/overview", "note": "IAM & sandboxing"},
        ],
    }
    return cb1.normalize_blueprint(raw, "Build a zero-trust MCP gateway on Cloud Run", "Multi-Tenant Agentic AI", "Architects", target_slides=12)


def _snapshot_git_tracked_hashes() -> Tuple[str, Dict[str, str]]:
    st = subprocess.check_output(["git", "status", "--porcelain"], cwd=str(ROOT_DIR), text=True)
    tracked = subprocess.check_output(["git", "ls-files"], cwd=str(ROOT_DIR), text=True).splitlines()
    hashes: Dict[str, str] = {}
    for rel in tracked:
        p = ROOT_DIR / rel
        if p.is_file():
            hashes[rel] = hashlib.sha256(p.read_bytes()).hexdigest()
    return (st, hashes)


class TestCreateBlog2HermeticSuite(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls._git_status_before, cls._tracked_hashes_before = _snapshot_git_tracked_hashes()
        cls._tmpdir = tempfile.TemporaryDirectory(prefix="cb2_test_")
        cls._old_env = {
            "GEAP_CREATE_BLOG2_DIR": os.environ.get("GEAP_CREATE_BLOG2_DIR"),
            "GEAP_DISABLE_GCS_SYNC": os.environ.get("GEAP_DISABLE_GCS_SYNC"),
            "GEAP_DISABLE_VERTEX_AUTH": os.environ.get("GEAP_DISABLE_VERTEX_AUTH"),
            "K_SERVICE": os.environ.get("K_SERVICE"),
            "GEMINI_API_KEY": os.environ.get("GEMINI_API_KEY"),
            "PORTAL_CSRF_HMAC_SECRET": os.environ.get("PORTAL_CSRF_HMAC_SECRET"),
        }
        os.environ["GEAP_CREATE_BLOG2_DIR"] = cls._tmpdir.name
        os.environ["GEAP_DISABLE_GCS_SYNC"] = "1"
        os.environ["PORTAL_CSRF_HMAC_SECRET"] = "unit-test-shared-hmac-secret-key-2026-cb2"

        cb2._TEST_URL_HEAD_FN = lambda u: u.startswith(("https://cloud.google.com/", "https://docs.cloud.google.com/"))
        cb2._TEST_REDIRECT_RESOLVER_FN = lambda u: (
            "https://cloud.google.com/run/docs/securing/overview"
            if "grounding-api-redirect/valid-run-sec" in u
            else ""
        )

        cls.httpd = ThreadingHTTPServer(("127.0.0.1", 0), srv.PortalRequestHandler)
        cls.port = cls.httpd.server_address[1]
        cls.base = f"http://127.0.0.1:{cls.port}"
        cls.thread = threading.Thread(target=cls.httpd.serve_forever, daemon=True)
        cls.thread.start()

    @classmethod
    def tearDownClass(cls) -> None:
        cls.httpd.shutdown()
        cls.httpd.server_close()
        cb2._TEST_URL_HEAD_FN = None
        cb2._TEST_REDIRECT_RESOLVER_FN = None
        cb2._TEST_OCR_INSPECTOR_FN = None
        cb2._TEST_TTS_TRANSPORT_FN = None
        cb2._TEST_GCS_MEM_STORE = None
        for k, v in cls._old_env.items():
            if v is None:
                os.environ.pop(k, None)
            else:
                os.environ[k] = v
        cls._tmpdir.cleanup()

    def _req(self, path: str, method: str = "GET", body: dict | None = None, headers: dict | None = None, raw_data: bytes | None = None) -> tuple[int, dict, bytes]:
        hdrs = dict(headers or {})
        data = raw_data
        if body is not None:
            data = json.dumps(body).encode("utf-8")
            hdrs.setdefault("Content-Type", "application/json")
        req = urllib.request.Request(self.base + path, data=data, headers=hdrs, method=method)
        try:
            with urllib.request.urlopen(req, timeout=20) as resp:
                return resp.status, {k.lower(): v for k, v in resp.headers.items()}, resp.read()
        except urllib.error.HTTPError as exc:
            return exc.code, {k.lower(): v for k, v in exc.headers.items()}, exc.read()

    def test_01_header_nav_page_csp_permissions_policy_and_zero_banned_dom_sinks(self) -> None:
        hdr_html = (ROOT_DIR / "templates" / "header.html").read_text(encoding="utf-8")
        self.assertIn('id="nav-link-create-blog-2"', hdr_html)
        self.assertIn('href="/create-blog-2"', hdr_html)
        self.assertIn("Create Blog 2", hdr_html)

        status, hdrs, body = self._req("/create-blog-2")
        self.assertEqual(status, 200)
        self.assertIn("camera=()", hdrs.get("permissions-policy", ""))
        self.assertIn("microphone=(self)", hdrs.get("permissions-policy", ""))
        self.assertIn("default-src 'self'", hdrs.get("content-security-policy", ""))
        html_text = body.decode("utf-8")
        self.assertIn("Create Blog 2", html_text)
        self.assertNotIn("__CSRF_TOKEN__", html_text)

        js_status, _, js_body = self._req("/js/create_blog_2.js")
        self.assertEqual(js_status, 200)
        js_text = js_body.decode("utf-8")

        banned = (
            "innerHTML", "outerHTML", "insertAdjacentHTML", "document.write(",
            "eval(", "new Function(", "window.alert(", "window.confirm(",
            "window.prompt(", "localStorage", "sessionStorage",
        )
        for sink in banned:
            self.assertNotIn(sink, html_text, f"Banned sink {sink} in create_blog_2_page.html")
            self.assertNotIn(sink, js_text, f"Banned sink {sink} in create_blog_2.js")

        # Verify buildMarkdownDom exists in create_blog_2.js and sanitize_svg_strict rejects XSS SVGs
        self.assertIn("function buildMarkdownDom(", js_text)
        for bad_svg in (
            '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>',
            '<svg xmlns="http://www.w3.org/2000/svg"><foreignObject><div>xss</div></foreignObject></svg>',
            '<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"></svg>',
            '<svg xmlns="http://www.w3.org/2000/svg"><image href="https://evil.example.com/x.png"/></svg>',
        ):
            with self.assertRaises(cb2.CreateBlog2Error):
                cb2.sanitize_svg_strict(bad_svg)

    def test_02_fail_closed_503_model_auth_tts_and_ocr_unavailable(self) -> None:
        csrf_tok = cb2.mint_create_blog_2_csrf_token("local-operator")
        os.environ["GEAP_DISABLE_VERTEX_AUTH"] = "1"
        os.environ.pop("GEMINI_API_KEY", None)
        cb2._TEST_TTS_TRANSPORT_FN = None
        cb2._TEST_OCR_INSPECTOR_FN = None
        try:
            st_503, _, b_503 = self._req(
                "/api/create-blog-2/generate",
                method="POST",
                body={"prompt": "Build an enterprise Zero-Trust BigQuery architecture"},
                headers={"X-Portal-CSRF": csrf_tok},
            )
            self.assertEqual(st_503, 503)
            self.assertEqual(json.loads(b_503.decode("utf-8"))["code"], "MODEL_AUTH_UNAVAILABLE")

            # Verify TTS fails closed with BLOCKED_TTS_UNAVAILABLE (zero synthetic WAV)
            bp = _sample_blueprint_12()
            with self.assertRaises(cb2.CreateBlog2Error) as ctx_tts:
                cb2.compile_and_save_blog(
                    blueprint=bp,
                    slug="tts-fail-closed-test",
                    model_used="gemini-2.5-flash",
                    auth_mode="unit_test_fixture",
                    actor_email="local-operator",
                    enable_tts=True,
                    strict_tts=True,
                    enable_judge=False,
                )
            self.assertEqual(ctx_tts.exception.status_code, 503)
            self.assertEqual(ctx_tts.exception.code, "BLOCKED_TTS_UNAVAILABLE")

            # Non-strict TTS records ttsStatus == BLOCKED_TTS_UNAVAILABLE and 0 audio files
            m_nostrict = cb2.compile_and_save_blog(
                blueprint=_sample_blueprint_12(),
                slug="tts-blocked-status-test",
                model_used="gemini-2.5-flash",
                auth_mode="unit_test_fixture",
                actor_email="local-operator",
                enable_tts=True,
                strict_tts=False,
                enable_judge=False,
            )
            self.assertEqual(m_nostrict["audio"]["ttsStatus"], "BLOCKED_TTS_UNAVAILABLE")
            self.assertEqual(m_nostrict["audio"]["tracksGenerated"], 0)

            # Verify OCR inspector fails closed with 503 OCR_INSPECTOR_UNAVAILABLE when unauthenticated
            with self.assertRaises(cb2.CreateBlog2Error) as ctx_ocr:
                cb2.inspect_media_pixels_for_f13_leaks(_make_png_with_text_chunk(), "image/png")
            self.assertEqual(ctx_ocr.exception.status_code, 503)
            self.assertEqual(ctx_ocr.exception.code, "OCR_INSPECTOR_UNAVAILABLE")
        finally:
            os.environ.pop("GEAP_DISABLE_VERTEX_AUTH", None)

    def test_03_grounding_redirect_resolution_and_support_segment_binding(self) -> None:
        bp = _sample_blueprint_12()
        bp["claimLedger"] = [
            {
                "id": "CLM-01",
                "claim": "Cloud Run request timeout ceiling",
                "value": "3600 seconds",
                "provenance": "GCP_DOCUMENTED",
                "sourceUrl": "https://cloud.google.com/run/docs/securing/overview",
                "basis": "Official Cloud Run quota table",
            },
            {
                "id": "CLM-02",
                "claim": "Invented unverified latency delta",
                "value": "99.4% reduction",
                "provenance": "GCP_DOCUMENTED",
                "sourceUrl": "https://cloud.google.com/architecture",
                "basis": "Model-written Pass-2 reference not in Pass-1 support segments",
            },
        ]
        grounding_fixture = {
            "webSearchQueries": ["cloud run request timeout"],
            "groundingChunks": [
                {
                    "web": {
                        "uri": "https://vertexaisearch.cloud.google.com/grounding-api-redirect/valid-run-sec",
                        "title": "cloud.google.com",
                    }
                }
            ],
            "groundingSupports": [
                {
                    "segment": {"text": "Cloud Run services support a maximum request timeout of 3600 seconds."},
                    "groundingChunkIndices": [0],
                    "confidenceScores": [0.92],
                }
            ],
            "searchEntryPoint": {"renderedContent": "<div>Google Search Suggestions</div>"},
        }
        g_out = cb2.bind_and_validate_grounding_metadata(grounding_fixture, bp)
        self.assertEqual(g_out["status"], "GROUNDED")
        self.assertEqual(g_out["resolvedChunkCount"], 1)
        self.assertTrue(g_out["searchEntryPointProvided"])
        # CLM-01 matched both resolved Pass-1 URL and support segment -> stays GCP_DOCUMENTED
        self.assertEqual(bp["claimLedger"][0]["provenance"], "GCP_DOCUMENTED")
        # CLM-02 used a Pass-2-only URL and value was absent from support segments -> downgraded to DERIVED_MODEL
        self.assertEqual(bp["claimLedger"][1]["provenance"], "DERIVED_MODEL")
        self.assertIn("CLM-02", g_out["downgradedClaims"])

    def test_04_d13_numeric_claim_coverage_all_units_inline_code_and_fail_closed(self) -> None:
        bp = _sample_blueprint_12()
        # Inject un-ledgered metrics across time, storage, bare count, AI tokens, and inline backticks, plus a fenced code block
        md_with_unledgered = (
            "---\nstatus: \"DRAFT_AWAITING_PROOF\"\n---\n\n"
            "# Architecture\n"
            "Achieves RTO 15 minutes with 32 GB per tenant across 10,000 tenants and a 128K-token context window "
            "while enforcing `p99 < 42 ms` latency.\n\n"
            "```hcl\n"
            "timeout = \"777s\"\n"
            "memory  = \"999GiB\"\n"
            "```\n"
        )
        ok, missing = cb2.check_d13_numeric_claim_coverage(bp, md_with_unledgered)
        self.assertFalse(ok)
        missing_blob = " | ".join(missing)
        self.assertIn("15 minutes", missing_blob)
        self.assertIn("32 GB", missing_blob)
        self.assertIn("10,000", missing_blob)
        self.assertIn("128K-token", missing_blob)
        self.assertIn("42 ms", missing_blob)
        # Fenced code block literals must NOT be flagged
        self.assertNotIn("777s", missing_blob)
        self.assertNotIn("999GiB", missing_blob)

        # Fail closed when fail_on_d13_without_auto_bind=True
        bp_bad = _sample_blueprint_12()
        bp_bad["sections"][0]["paragraphs"].append("This un-ledgered claim promises 9,500 requests per second.")
        with self.assertRaises(cb2.CreateBlog2Error) as ctx_d13:
            cb2.compile_and_save_blog(
                blueprint=bp_bad,
                slug="d13-fail-closed-test",
                model_used="gemini-2.5-flash",
                auth_mode="unit_test_fixture",
                actor_email="local-operator",
                enable_tts=False,
                enable_judge=False,
                fail_on_d13_without_auto_bind=True,
            )
        self.assertEqual(ctx_d13.exception.status_code, 422)
        self.assertEqual(ctx_d13.exception.code, "UNGROUNDED_NUMERIC_CLAIMS")

    def test_05_resolve_icon_key_strict_and_truthful_icon_provenance(self) -> None:
        self.assertEqual(cb2.resolve_icon_key_strict("Pub/Sub"), "pubsub")
        self.assertNotEqual(cb2.resolve_icon_key_strict("Pub/Sub"), "api_gateway")
        self.assertEqual(cb2.resolve_icon_key_strict("Cloud Dataflow"), "dataflow")
        self.assertNotEqual(cb2.resolve_icon_key_strict("Cloud Dataflow"), "cloud_run")
        self.assertEqual(cb2.resolve_icon_key_strict("Sensitive Data Protection (DLP)"), "cloud_dlp")
        self.assertNotEqual(cb2.resolve_icon_key_strict("Sensitive Data Protection (DLP)"), "model_armor")
        self.assertEqual(cb2.resolve_icon_key_strict("Apigee API Gateway"), "apigee")
        self.assertEqual(cb2.resolve_icon_key_strict("API Gateway"), "api_gateway")
        self.assertEqual(cb2.resolve_icon_key_strict("Cloud NAT Gateway"), "cloud_nat")
        self.assertEqual(cb2.resolve_icon_key_strict("TotallyUnknownQuantumService"), "gcp_cloud")

        prov = cb2.verify_icon_pack_provenance()
        self.assertTrue(prov["allVerified"], prov)
        self.assertGreaterEqual(prov["publicGcpPackageIcons"], 25)
        self.assertGreaterEqual(prov["portalArchitecturalGlyphs"], 5)

    def test_06_compile_6_diagrams_12_slides_ooxml_integrity_and_zero_code_exec(self) -> None:
        bp = _sample_blueprint_12()
        slug = "zt-mcp-full-compile"
        manifest = cb2.compile_and_save_blog(
            blueprint=bp,
            slug=slug,
            model_used="gemini-2.5-flash",
            auth_mode="unit_test_fixture",
            actor_email="owner-a@example.com",
            enable_tts=False,
            enable_judge=False,
        )
        self.assertEqual(manifest["status"], "DRAFT_AWAITING_PROOF")
        self.assertEqual(manifest["proofStatus"], "DRAFT_AWAITING_PROOF")
        self.assertEqual(len(manifest["diagrams"]), 6)
        self.assertEqual(manifest["quality"]["deterministic"]["total"], 13)
        self.assertEqual(manifest["quality"]["deterministic"]["passed"], 13, manifest["quality"]["deterministic"])
        self.assertTrue(manifest["quality"]["ooxmlIntegrity"]["valid"], manifest["quality"]["ooxmlIntegrity"])
        self.assertEqual(manifest["starterMeta"]["starterStatus"], "GENERATED_TEMPLATE_UNDEPLOYED")

        # Verify cb2-<slug>-<kind> studio integration and sandbox CSP header on assets
        for k in ("architecture", "cloudarch", "sequence", "security", "wire", "async"):
            st, _, raw = self._req(f"/api/drawio/item/cb2-{slug}-{k}")
            self.assertEqual(st, 200)
            obj = json.loads(raw.decode("utf-8"))
            self.assertEqual(obj["item"]["id"], f"cb2-{slug}-{k}")
            self.assertIn("<mxfile", obj["xml"])

        st_svg, hdrs_svg, _ = self._req(f"/api/create-blog-2/blogs/{slug}/asset/diagrams/{slug}-architecture.svg")
        self.assertEqual(st_svg, 200)
        self.assertIn("sandbox", hdrs_svg.get("content-security-policy", ""))

        # Verify dangerous starter Python imports fail static AST gate (zero code execution)
        ok_ast, err_ast = cb2.validate_generated_python_ast_safe("import subprocess\nsubprocess.run(['id'])\n")
        self.assertFalse(ok_ast)
        self.assertIn("subprocess", err_ast)

        # Verify destructive commands fail D-11 gate
        d_findings = cb2.scan_starter_security_and_destructive_cmds({"destroy.sh": "gcloud projects delete my-proj\n"})
        self.assertTrue(any(f["id"] == "SH-DESTRUCT-01" for f in d_findings))

    def test_07_two_instance_stateless_hmac_csrf_same_origin_and_edge_assertion(self) -> None:
        # 1. Token minted on Instance A validates on Instance B with a different _PORTAL_CSRF_TOKEN
        tok_a = cb2.mint_create_blog_2_csrf_token("architect@example.com")
        self.assertTrue(
            cb2.verify_create_blog_2_csrf_token(
                tok_a,
                actor_email="architect@example.com",
                portal_csrf_fallback="completely-different-instance-b-random-token",
            )
        )
        self.assertFalse(
            cb2.verify_create_blog_2_csrf_token(
                tok_a[:-4] + "0000",
                actor_email="architect@example.com",
                portal_csrf_fallback="completely-different-instance-b-random-token",
            )
        )

        # 2. Non-JSON Content-Type rejected (415) and Sec-Fetch-Site: same-site / cross-site rejected (403)
        st_ct, _, _ = self._req(
            "/api/create-blog-2/generate",
            method="POST",
            raw_data=b'{"prompt": "Valid prompt text for test"}',
            headers={"Content-Type": "text/plain", "X-Portal-CSRF": tok_a},
        )
        self.assertEqual(st_ct, 415)

        for bad_sfs in ("cross-site", "same-site"):
            st_sfs, _, b_sfs = self._req(
                "/api/create-blog-2/generate",
                method="POST",
                body={"prompt": "Valid prompt text for test"},
                headers={"X-Portal-CSRF": tok_a, "Sec-Fetch-Site": bad_sfs},
            )
            self.assertEqual(st_sfs, 403)
            self.assertEqual(json.loads(b_sfs.decode("utf-8"))["code"], "SEC_FETCH_SITE_FORBIDDEN")

        # 3. Cloud Run K_SERVICE mode: fails closed 503 if PORTAL_CSRF_HMAC_SECRET is unset,
        #    and derives identity ONLY from ECDSA P-256 verify_signed_edge_assertion_header (ignoring spoofed X-Goog-* headers)
        priv_d = 0x123456789ABCDEF0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF1
        pub_xy = cb1._p256_mul(priv_d, cb1._P256_G)
        assert pub_xy is not None
        xb = pub_xy[0].to_bytes(32, "big")
        yb = pub_xy[1].to_bytes(32, "big")
        kh = cb1.compute_edge_assertion_ec_key_hash(xb, yb)
        pub_keys_json = json.dumps({"keys": [{"kty": "EC", "crv": "P-256", "x": xb.hex(), "y": yb.hex()}]})

        def _varint(val: int) -> bytes:
            out = bytearray()
            while val >= 0x80:
                out.append((val & 0x7F) | 0x80)
                val >>= 7
            out.append(val)
            return bytes(out)

        def _fb(fnum: int, b: bytes) -> bytes:
            return _varint((fnum << 3) | 2) + _varint(len(b)) + b

        def _fv(fnum: int, v: int) -> bytes:
            return _varint((fnum << 3) | 0) + _varint(v)

        def _der_int(val: int) -> bytes:
            b = val.to_bytes((val.bit_length() + 7) // 8 or 1, "big")
            if b[0] & 0x80:
                b = b"\x00" + b
            return bytes([0x02, len(b)]) + b

        def _sign_assertion(email: str, host: str, ts: int) -> str:
            payload = _fv(1, 2) + _fb(2, email.encode("utf-8")) + _fb(5, host.encode("utf-8")) + _fb(6, _fv(1, ts)) + _fv(8, 2)
            pb64 = base64.urlsafe_b64encode(payload).decode("ascii").rstrip("=")
            msg = pb64.encode("ascii") + b"\x00"
            z = int.from_bytes(hashlib.sha256(msg).digest(), "big")
            k = 0x0F0E0D0C0B0A0908070605040302010102030405060708090A0B0C0D0E0F1123
            rp = cb1._p256_mul(k, cb1._P256_G)
            assert rp is not None
            r = rp[0] % cb1._P256_N
            sig_s = (pow(k, -1, cb1._P256_N) * (z + r * priv_d)) % cb1._P256_N
            ri, si = _der_int(r), _der_int(sig_s)
            der = bytes([0x30, len(ri) + len(si)]) + ri + si
            sb64 = base64.urlsafe_b64encode(b"\x00" + kh + der).decode("ascii").rstrip("=")
            return f"{pb64}.{sb64}"

        now = int(time.time())
        verified_edge_email = "edge-owner@example.com"
        valid_edge_hdr = _sign_assertion(verified_edge_email, "portal.example.com:443", now)

        try:
            os.environ["K_SERVICE"] = "ge-blogs"
            os.environ["EDGE_AUTH_ASSERTION_HEADER"] = "X-Edge-Signed-Assertion"
            os.environ["EDGE_AUTH_EXPECTED_HOSTS"] = "portal.example.com"
            os.environ["EDGE_AUTH_PUBLIC_KEYS_JSON"] = pub_keys_json
            os.environ["GEAP_DISABLE_VERTEX_AUTH"] = "1"

            # Without PORTAL_CSRF_HMAC_SECRET on K_SERVICE, GET /create-blog-2 fails closed with 503 CSRF_SECRET_UNCONFIGURED
            os.environ.pop("PORTAL_CSRF_HMAC_SECRET", None)
            st_nosec, _, b_nosec = self._req("/create-blog-2", headers={"X-Edge-Signed-Assertion": valid_edge_hdr})
            self.assertEqual(st_nosec, 503)
            self.assertEqual(json.loads(b_nosec.decode("utf-8"))["code"], "CSRF_SECRET_UNCONFIGURED")

            os.environ["PORTAL_CSRF_HMAC_SECRET"] = "unit-test-shared-hmac-secret-key-2026-cb2"
            edge_csrf = cb2.mint_create_blog_2_csrf_token(verified_edge_email)

            # Spoofed X-Goog-Authenticated-User-Email + fake JWT without valid edge assertion -> 403 ADMIN_IAP_REQUIRED
            st_spoof, _, b_spoof = self._req(
                "/api/create-blog-2/generate",
                method="POST",
                body={"prompt": "Build a Spanner Graph multi-tenant memory plane"},
                headers={
                    "X-Portal-CSRF": edge_csrf,
                    "X-Goog-Authenticated-User-Email": "accounts.google.com:spoofed@example.com",
                    "X-Goog-IAP-JWT-Assertion": "eyJhbGciOiJFUzI1NiJ9.eyJpc3MiOiJodHRwczovL2Nsb3VkLmdvb2dsZS5jb20vaWFwIiwiZW1haWwiOiJzcG9vZmVkQGV4YW1wbGUuY29tIiwiZXhwIjo5OTk5OTk5OTk5fQ.sig",
                },
            )
            self.assertEqual(st_spoof, 403)
            self.assertEqual(json.loads(b_spoof.decode("utf-8"))["code"], "ADMIN_IAP_REQUIRED")

            # Valid ECDSA P-256 edge assertion + stateless HMAC CSRF passes auth and reaches 503 MODEL_AUTH_UNAVAILABLE
            st_valid, _, b_valid = self._req(
                "/api/create-blog-2/generate",
                method="POST",
                body={"prompt": "Build a Spanner Graph multi-tenant memory plane"},
                headers={
                    "X-Portal-CSRF": edge_csrf,
                    "X-Edge-Signed-Assertion": valid_edge_hdr,
                },
            )
            self.assertEqual(st_valid, 503)
            self.assertEqual(json.loads(b_valid.decode("utf-8"))["code"], "MODEL_AUTH_UNAVAILABLE")
        finally:
            os.environ.pop("K_SERVICE", None)
            os.environ.pop("EDGE_AUTH_ASSERTION_HEADER", None)
            os.environ.pop("EDGE_AUTH_EXPECTED_HOSTS", None)
            os.environ.pop("EDGE_AUTH_PUBLIC_KEYS_JSON", None)
            os.environ.pop("GEAP_DISABLE_VERTEX_AUTH", None)
            os.environ["PORTAL_CSRF_HMAC_SECRET"] = "unit-test-shared-hmac-secret-key-2026-cb2"

    def test_08_owner_scoping_across_all_6_mutation_routes_and_soft_delete(self) -> None:
        slug = "zt-mcp-owner-scope"
        cb2.compile_and_save_blog(
            blueprint=_sample_blueprint_12(),
            slug=slug,
            model_used="gemini-2.5-flash",
            auth_mode="unit_test_fixture",
            actor_email="alice-owner@example.com",
            enable_tts=False,
            enable_judge=False,
        )
        # Non-owner bob@example.com must receive 403 BLOG_OWNER_REQUIRED across all 6 mutation operations
        with self.assertRaises(cb2.CreateBlog2Error) as c1:
            cb2.attach_proof_screenshot(slug, {"stage": "BEFORE", "caption": "Test proof", "dataBase64": "AA=="}, actor_email="bob-intruder@example.com")
        self.assertEqual(c1.exception.code, "BLOG_OWNER_REQUIRED")

        with self.assertRaises(cb2.CreateBlog2Error) as c2:
            cb2.delete_proof_screenshot(slug, "prf-1", actor_email="bob-intruder@example.com")
        self.assertEqual(c2.exception.code, "BLOG_OWNER_REQUIRED")

        with self.assertRaises(cb2.CreateBlog2Error) as c3:
            cb2.upload_video_chunk(slug, {"uploadId": "upl-123456", "chunkIndex": 0, "totalChunks": 1, "dataBase64": "AA=="}, actor_email="bob-intruder@example.com")
        self.assertEqual(c3.exception.code, "BLOG_OWNER_REQUIRED")

        with self.assertRaises(cb2.CreateBlog2Error) as c4:
            cb2.save_diagram_2way(slug, "architecture", {"xml": "<mxfile><diagram><mxGraphModel><root><mxCell id='0'/><mxCell id='1' parent='0'/></root></mxGraphModel></diagram></mxfile>"}, actor_email="bob-intruder@example.com")
        self.assertEqual(c4.exception.code, "BLOG_OWNER_REQUIRED")

        with self.assertRaises(cb2.CreateBlog2Error) as c5:
            cb2.sync_to_google_workspace(slug, actor_email="bob-intruder@example.com")
        self.assertEqual(c5.exception.code, "BLOG_OWNER_REQUIRED")

        with self.assertRaises(cb2.CreateBlog2Error) as c6:
            cb2.delete_blog(slug, actor_email="bob-intruder@example.com")
        self.assertEqual(c6.exception.code, "BLOG_OWNER_REQUIRED")

        # Owner alice-owner@example.com deletes cleanly and archives to _trash/
        del_res = cb2.delete_blog(slug, actor_email="alice-owner@example.com")
        self.assertTrue(del_res["ok"])
        self.assertTrue((Path(self._tmpdir.name) / del_res["trashArchive"]).is_file())
        self.assertFalse((Path(self._tmpdir.name) / slug).exists())

    def test_09_proof_upload_magic_bytes_1280x720_metadata_strip_and_pixel_ocr_gate(self) -> None:
        slug = "zt-mcp-proof-gates"
        cb2.compile_and_save_blog(
            blueprint=_sample_blueprint_12(),
            slug=slug,
            model_used="gemini-2.5-flash",
            auth_mode="unit_test_fixture",
            actor_email="local-operator",
            enable_tts=False,
            enable_judge=False,
        )
        csrf_tok = cb2.mint_create_blog_2_csrf_token("local-operator")

        # 1. Sub-HD 640x360 rejected with 400 PROOF_RESOLUTION_TOO_LOW
        small_b64 = base64.b64encode(_make_png_with_text_chunk(640, 360)).decode("ascii")
        st_sm, _, b_sm = self._req(
            f"/api/create-blog-2/blogs/{slug}/proofs",
            method="POST",
            body={"stage": "BEFORE", "caption": "Too small capture", "dataBase64": small_b64},
            headers={"X-Portal-CSRF": csrf_tok},
        )
        self.assertEqual(st_sm, 400)
        self.assertEqual(json.loads(b_sm.decode("utf-8"))["code"], "PROOF_RESOLUTION_TOO_LOW")

        # 2. Banned origin (*.run.app or localhost) rejected with 400
        hd_png = _make_png_with_text_chunk(1280, 720, text_payload=b"Comment\x00should-be-stripped")
        hd_b64 = base64.b64encode(hd_png).decode("ascii")
        st_run, _, b_run = self._req(
            f"/api/create-blog-2/blogs/{slug}/proofs",
            method="POST",
            body={"stage": "BEFORE", "caption": "Run app URL", "sourceUrl": "https://fake-demo-abc.a.run.app/ui", "dataBase64": hd_b64},
            headers={"X-Portal-CSRF": csrf_tok},
        )
        self.assertEqual(st_run, 400)

        # 3. Pixel-level OCR catching F-13 token or personal email -> rejected with 422 PROOF_F13_PIXEL_LEAK_DETECTED
        cb2._TEST_OCR_INSPECTOR_FN = lambda _b, _m: "Console header signed in as engineer@personal-domain.org and b/98765432"
        st_leak, _, b_leak = self._req(
            f"/api/create-blog-2/blogs/{slug}/proofs",
            method="POST",
            body={"stage": "BEFORE", "caption": "Cloud Run ingress baseline", "sourceUrl": "https://console.cloud.google.com/run", "dataBase64": hd_b64},
            headers={"X-Portal-CSRF": csrf_tok},
        )
        self.assertEqual(st_leak, 422)
        self.assertEqual(json.loads(b_leak.decode("utf-8"))["code"], "PROOF_F13_PIXEL_LEAK_DETECTED")

        # 4. Pixel-level OCR with allowlisted GCP service account (*.iam.gserviceaccount.com) succeeds,
        #    strips PNG tEXt metadata, and transitions to USER_ATTESTED_PROOF_ATTACHED after BEFORE + AFTER!
        cb2._TEST_OCR_INSPECTOR_FN = lambda _b, _m: "Cloud Run revision healthy; SA: mcp-proxy@project-1.iam.gserviceaccount.com"
        st_bef, _, b_bef = self._req(
            f"/api/create-blog-2/blogs/{slug}/proofs",
            method="POST",
            body={"stage": "BEFORE", "caption": "Cloud Run ingress BEFORE policy", "sourceUrl": "https://console.cloud.google.com/run", "dataBase64": hd_b64},
            headers={"X-Portal-CSRF": csrf_tok},
        )
        self.assertEqual(st_bef, 201, b_bef.decode("utf-8", errors="replace"))
        res_bef = json.loads(b_bef.decode("utf-8"))
        self.assertEqual(res_bef["proof"]["verificationTier"], "USER_ATTESTED_HD_CAPTURE")
        self.assertEqual(res_bef["proofStatus"], "DRAFT_AWAITING_PROOF")

        # Verify tEXt chunk was stripped from stored PNG on disk
        stored_png = (Path(self._tmpdir.name) / slug / res_bef["proof"]["relPath"]).read_bytes()
        self.assertIn(b"should-be-stripped", hd_png)
        self.assertNotIn(b"should-be-stripped", stored_png)

        # Upload Retina 2x AFTER proof (2560x1440) -> status flips to USER_ATTESTED_PROOF_ATTACHED
        retina_b64 = base64.b64encode(_make_png_with_text_chunk(2560, 1440, rgb=(19, 115, 51))).decode("ascii")
        st_aft, _, b_aft = self._req(
            f"/api/create-blog-2/blogs/{slug}/proofs",
            method="POST",
            body={"stage": "AFTER", "caption": "Cloud Run ingress AFTER policy", "sourceUrl": "https://console.cloud.google.com/run", "dataBase64": retina_b64},
            headers={"X-Portal-CSRF": csrf_tok},
        )
        self.assertEqual(st_aft, 201)
        res_aft = json.loads(b_aft.decode("utf-8"))
        self.assertEqual(res_aft["proof"]["verificationTier"], "USER_ATTESTED_RETINA_2X_CAPTURE")
        self.assertEqual(res_aft["proofStatus"], "USER_ATTESTED_PROOF_ATTACHED")

    def test_10_stateless_video_chunk_compose_quarantine_crc32c_and_ocr_promotion(self) -> None:
        slug = "zt-mcp-video-chunks"
        cb2._TEST_GCS_MEM_STORE = {}
        try:
            cb2.compile_and_save_blog(
                blueprint=_sample_blueprint_12(),
                slug=slug,
                model_used="gemini-2.5-flash",
                auth_mode="unit_test_fixture",
                actor_email="local-operator",
                enable_tts=False,
                enable_judge=False,
            )
            csrf_tok = cb2.mint_create_blog_2_csrf_token("local-operator")

            # Build a 2-chunk valid WebM byte stream (starts with 1A 45 DF A3)
            part0 = b"\x1a\x45\xdf\xa3" + b"WEBM_PART_0_PAYLOAD_" * 120
            part1 = b"WEBM_PART_1_PAYLOAD_" * 150
            full_webm = part0 + part1
            full_sha = hashlib.sha256(full_webm).hexdigest()

            # 1. Quarantine blocks video when server OCR detects F-13 leak
            cb2._TEST_OCR_INSPECTOR_FN = lambda _b, _m: "Visible URL bar with auth" + "user=0"
            for idx, pb in enumerate((part0, part1)):
                st_c, _, b_c = self._req(
                    f"/api/create-blog-2/blogs/{slug}/video-chunk",
                    method="POST",
                    body={
                        "uploadId": "upl-badvideo01",
                        "target": "live_walkthrough",
                        "chunkIndex": idx,
                        "totalChunks": 2,
                        "chunkSha256": hashlib.sha256(pb).hexdigest(),
                        "chunkCrc32c": cb2.format_crc32c_b64(cb2.compute_crc32c_int(pb)),
                        "expectedTotalBytes": len(full_webm),
                        "expectedSha256": full_sha,
                        "isLastChunk": idx == 1,
                        "dataBase64": base64.b64encode(pb).decode("ascii"),
                    },
                    headers={"X-Portal-CSRF": csrf_tok},
                )
                if idx == 0:
                    self.assertEqual(st_c, 200)
                else:
                    self.assertEqual(st_c, 422)
                    self.assertEqual(json.loads(b_c.decode("utf-8"))["code"], "VIDEO_F13_OR_PII_LEAK_DETECTED")
            # Quarantined object must be deleted on failure
            self.assertNotIn(f"{slug}/_quarantine/upl-badvideo01.webm", cb2._TEST_GCS_MEM_STORE)

            # 2. Clean OCR promotes composite video from _quarantine/ to recordings/live_walkthrough.webm
            cb2._TEST_OCR_INSPECTOR_FN = lambda _b, _m: "Clean Cloud Run console walkthrough"
            for idx, pb in enumerate((part0, part1)):
                st_ok, _, b_ok = self._req(
                    f"/api/create-blog-2/blogs/{slug}/video-chunk",
                    method="POST",
                    body={
                        "uploadId": "upl-goodvideo02",
                        "target": "live_walkthrough",
                        "chunkIndex": idx,
                        "totalChunks": 2,
                        "chunkSha256": hashlib.sha256(pb).hexdigest(),
                        "chunkCrc32c": cb2.format_crc32c_b64(cb2.compute_crc32c_int(pb)),
                        "expectedTotalBytes": len(full_webm),
                        "expectedSha256": full_sha,
                        "isLastChunk": idx == 1,
                        "dataBase64": base64.b64encode(pb).decode("ascii"),
                    },
                    headers={"X-Portal-CSRF": csrf_tok},
                )
                self.assertEqual(st_ok, 200, b_ok.decode("utf-8", errors="replace"))
                if idx == 1:
                    res_v = json.loads(b_ok.decode("utf-8"))
                    self.assertEqual(res_v["status"], "PUBLISHED")
                    self.assertEqual(res_v["recording"]["sha256"], full_sha)
                    self.assertTrue(res_v["recording"]["pixelOcrVerified"])

            # Verify HTTP 206 byte-range playback on published recording
            st_206, hdrs_206, body_206 = self._req(
                f"/api/create-blog-2/blogs/{slug}/asset/recordings/live_walkthrough.webm",
                headers={"Range": "bytes=0-15"},
            )
            self.assertEqual(st_206, 206)
            self.assertEqual(len(body_206), 16)
            self.assertEqual(body_206[:4], b"\x1a\x45\xdf\xa3")

            # Verify 24h TTL sweeper cleans stale _chunks/_quarantine files
            stale_p = Path(self._tmpdir.name) / slug / "_quarantine" / "stale.webm"
            stale_p.parent.mkdir(parents=True, exist_ok=True)
            stale_p.write_bytes(b"old")
            sweep_res = cb2.sweep_stale_chunks_and_quarantine(max_age_sec=60, now_ts=time.time() + 120)
            self.assertGreaterEqual(sweep_res["removedLocalFiles"], 1)
            self.assertFalse(stale_p.exists())
        finally:
            cb2._TEST_GCS_MEM_STORE = None

    def test_11_law9_rule49_native_gdocs_sync_2way_drawio_save_and_gcs_cas_lru(self) -> None:
        slug = "zt-mcp-law9-and-2way"
        cb2._TEST_GCS_MEM_STORE = {}
        try:
            cb2.compile_and_save_blog(
                blueprint=_sample_blueprint_12(),
                slug=slug,
                model_used="gemini-2.5-flash",
                auth_mode="unit_test_fixture",
                actor_email="local-operator",
                enable_tts=False,
                enable_judge=False,
            )
            csrf_tok = cb2.mint_create_blog_2_csrf_token("local-operator")

            # 1. Without Drive OAuth token, sync returns 412 WORKSPACE_OAUTH_REQUIRED
            st_412, _, b_412 = self._req(
                f"/api/create-blog-2/blogs/{slug}/sync-workspace",
                method="POST",
                body={},
                headers={"X-Portal-CSRF": csrf_tok},
            )
            self.assertEqual(st_412, 412)
            self.assertEqual(json.loads(b_412.decode("utf-8"))["code"], "WORKSPACE_OAUTH_REQUIRED")

            # 2. With mock OAuth token, verify Law 9 / Rule 49 native files.copy + _sync_markdown_into_existing_google_doc
            calls_log: List[str] = []

            class _MockBridge:
                @staticmethod
                def get_drive_access_token() -> str:
                    return "mock-oauth-token"

                @staticmethod
                def _sync_markdown_into_existing_google_doc(doc_id: str, md_path: Path, title: str, token: str) -> int:
                    calls_log.append(f"batchUpdate:{doc_id}:{md_path.name}")
                    return 24

            def _mock_copy(tok: str, tpl_id: str, new_title: str) -> dict:
                calls_log.append(f"files.copy:{tpl_id}")
                return {"id": "1nativeDocCopiedId123", "name": new_title}

            def _mock_slides_upload(tok: str, fname: str, src_mime: str, dst_mime: str, raw_b: bytes) -> dict:
                self.assertEqual(dst_mime, "application/vnd.google-apps.presentation")
                calls_log.append(f"slides.import:{dst_mime}")
                return {"id": "1nativeSlidesId456", "name": fname}

            sync_out = cb2.sync_to_google_workspace(
                slug,
                actor_email="local-operator",
                bridge_mod=_MockBridge,
                drive_copy_fn=_mock_copy,
                slides_upload_fn=_mock_slides_upload,
            )
            self.assertTrue(sync_out["ok"])
            self.assertEqual(sync_out["workspaceSync"]["method"], "LAW9_NATIVE_FILES_COPY_AND_BATCH_UPDATE")
            self.assertTrue(any(c.startswith("files.copy:") for c in calls_log))
            self.assertTrue(any(c.startswith("batchUpdate:1nativeDocCopiedId123:blog.md") for c in calls_log))

            # 3. Two-Way Draw.io Save updates .drawio, .svg, and recompiles .pptx, .docx, blog.md
            arch_p = Path(self._tmpdir.name) / slug / "diagrams" / f"{slug}-architecture.drawio"
            edited_xml = arch_p.read_text(encoding="utf-8").replace("Zero-Trust Multi-Tenant MCP Gateway", "Zero-Trust Multi-Tenant MCP Gateway v2 Edited")
            st_ds, _, b_ds = self._req(
                f"/api/create-blog-2/blogs/{slug}/diagrams/architecture/save",
                method="POST",
                body={"xml": edited_xml},
                headers={"X-Portal-CSRF": csrf_tok},
            )
            self.assertEqual(st_ds, 200, b_ds.decode("utf-8", errors="replace"))
            ds_json = json.loads(b_ds.decode("utf-8"))
            self.assertEqual(ds_json["diagramId"], f"cb2-{slug}-architecture")
            self.assertIn("Zero-Trust Multi-Tenant MCP Gateway v2 Edited", arch_p.read_text(encoding="utf-8"))

            # 4. Verify 256 MiB /tmp LRU eviction evicts cold binary cache files when budget is exceeded
            dummy_cold = Path(self._tmpdir.name) / "cold-slug" / "recordings" / "big.webm"
            dummy_cold.parent.mkdir(parents=True, exist_ok=True)
            dummy_cold.write_bytes(b"X" * 4096)
            os.utime(dummy_cold, (time.time() - 3600, time.time() - 3600))
            evicted = cb2._enforce_tmp_cache_budget(max_bytes=1024, protected_slugs={slug})
            self.assertGreaterEqual(evicted, 4096)
            self.assertFalse(dummy_cold.exists())
        finally:
            cb2._TEST_GCS_MEM_STORE = None

    def test_12_f11_tracked_files_sha256_and_git_status_invariance(self) -> None:
        st_after, tracked_after = _snapshot_git_tracked_hashes()
        self.assertEqual(self._git_status_before, st_after, "Untracked or modified repo files created during runtime!")
        self.assertEqual(
            self._tracked_hashes_before,
            tracked_after,
            "Git-tracked repository files were modified during Create Blog 2 runtime operations (F-11 violation)!",
        )

    def test_13_opt_in_fail_closed_live_gemini_and_tts_e2e(self) -> None:
        if os.environ.get("CREATE_BLOG_2_LIVE_E2E") != "1":
            return
        # When CREATE_BLOG_2_LIVE_E2E=1 is requested, NEVER skip — fail closed if credentials are missing!
        cb2._TEST_URL_HEAD_FN = None
        cb2._TEST_REDIRECT_RESOLVER_FN = None
        cb2._TEST_OCR_INSPECTOR_FN = None
        cb2._TEST_TTS_TRANSPORT_FN = None
        cap = cb2.get_capabilities()
        self.assertTrue(cap["liveGeminiReady"], "CREATE_BLOG_2_LIVE_E2E=1 requires live Gemini credentials!")
        res, meta = cb1.call_gemini_json(
            system_prompt='Return ONLY JSON {"title":"Live Cloud Run Private Service Connect Hub","summary":"Verified live Gemini 2.5 synthesis."}',
            user_prompt="Synthesize a 1-sentence Cloud Run PSC summary.",
            model="gemini-2.5-flash",
            max_output_tokens=512,
            thinking_budget=0,
            temperature=0.1,
            timeout_s=30.0,
        )
        self.assertIn("title", res)
        mp3_b, tts_err = cb2.synthesize_tts_track_fail_closed(
            "This reference architecture enforces zero-trust Private Service Connect ingress on Cloud Run.",
            voice_name="en-US-Chirp3-HD-Charon",
        )
        self.assertIsNotNone(mp3_b, f"Live Cloud TTS failed: {tts_err}")
        self.assertGreater(len(mp3_b or b""), 1000)


if __name__ == "__main__":
    unittest.main()
