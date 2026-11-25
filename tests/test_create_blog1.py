#!/usr/bin/env python3
"""
Hermetic, fail-closed unit & HTTP API test suite for the Create Blog1 studio page
(`GET /create-blog1`, `scripts/create_blog1_engine.py`, `templates/create_blog1_page.html`,
and `js/create_blog1.js`).
"""

from __future__ import annotations

import base64
import io
import json
import os
import re
import struct
import tempfile
import threading
import unittest
import urllib.error
import urllib.request
import xml.etree.ElementTree as ET
import zipfile
import zlib
from http.server import ThreadingHTTPServer
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent
import sys

if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

import server as srv  # noqa: E402
from scripts import create_blog1_engine as cb1  # noqa: E402


def _make_valid_png(width: int = 640, height: int = 360, rgb: tuple = (26, 115, 232)) -> bytes:
    """Pure-stdlib valid PNG generator (IHDR + IDAT + IEND) for upload/embed tests."""
    def _chunk(ctype: bytes, data: bytes) -> bytes:
        crc = zlib.crc32(ctype + data) & 0xFFFFFFFF
        return struct.pack(">I", len(data)) + ctype + data + struct.pack(">I", crc)

    ihdr = struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0)
    row = b"\x00" + bytes(rgb) * width
    raw = zlib.compress(row * height, level=1)
    return b"\x89PNG\r\n\x1a\n" + _chunk(b"IHDR", ihdr) + _chunk(b"IDAT", raw) + _chunk(b"IEND", b"")


def _sample_blueprint() -> dict:
    raw = {
        "title": "Zero-Trust MCP Gateway on Cloud Run",
        "subtitle": "Enforcing per-tenant isolation, IAM verification, and DLP egress controls for agentic tools.",
        "slugHint": "zero-trust-mcp-gateway",
        "summary": (
            "This reference architecture illustrates a multi-tenant Model Context Protocol (MCP) gateway hosted "
            "on Cloud Run with Identity-Aware Proxy, Private Service Connect ingress, Cloud DLP egress filtering, "
            "and tamper-evident BigQuery audit logs."
        ),
        "domain": "Multi-Tenant Agentic AI",
        "audience": "Solutions Architects & Platform Engineers",
        "estimatedReadMinutes": 11,
        "keyTakeaways": [
            "Bind every tenant request to cryptographic JWT claims before routing to downstream MCP servers.",
            "Enforce VPC Service Controls and Private Service Connect so tools never traverse the public internet.",
            "Apply Cloud DLP egress redaction before streaming responses back to callers.",
        ],
        "platformDiagram": {
            "governanceBanner": "Google Cloud — Zero-Trust MCP Governance & Control Plane",
            "controlCards": [
                {"title": "Auth & IAP Broker", "iconKey": "iap", "bullets": ["Verifies ES256 IAP JWT", "Enforces tenant claims"]},
                {"title": "Cloud Armor WAF", "iconKey": "cloud_armor", "bullets": ["OWASP filtering", "Per-tenant rate limit"]},
                {"title": "Cloud DLP Egress", "iconKey": "cloud_dlp", "bullets": ["Redacts PII/secrets", "Fail-closed inspect"]},
            ],
            "ingressCardA": {"title": "Cloud LB & WAF", "iconKey": "load_balancing", "bullets": ["TLS 1.3 ingress", "Cloud Armor policy"]},
            "ingressCardB": {"title": "Identity-Aware Proxy", "iconKey": "iap", "bullets": ["Verify ES256 JWT", "Bind tenant_id"]},
            "frontendTitle": "MCP Clients",
            "frontendTiles": [{"label": "Gemini", "iconKey": "gemini"}, {"label": "ADK", "iconKey": "adk"}, {"label": "Run", "iconKey": "cloud_run"}, {"label": "IAM", "iconKey": "cloud_iam"}],
            "gatewayIn": {"title": "MCP Ingress PEP", "iconKey": "apigee", "bullets": ["Validate JWT aud/iss", "Check RBAC scope"]},
            "runtimeCard": {"title": "Cloud Run MCP Proxy", "iconKey": "cloud_run", "bullets": ["gVisor sandbox", "Stateless workers"]},
            "gatewayOut": {"title": "Cloud DLP Egress PEP", "iconKey": "cloud_dlp", "bullets": ["Inspect outbound body", "Redact sensitive keys"]},
            "hotStateCard": {"title": "Tenant Context Guard", "iconKey": "cloud_iam", "bullets": ["Zero cross-tenant cache", "Scoped policy check"]},
            "dataStoreTitle": "Durable Audit & State Stores",
            "dataStores": [
                {"title": "BigQuery Audit Table", "sub": "Row-Level Security", "iconKey": "bigquery"},
                {"title": "Cloud Storage Artifacts", "sub": "CMEK + Versioning", "iconKey": "cloud_storage"},
            ],
            "bulkheadCard": {"title": "Rate & Quota Guard", "iconKey": "cloud_monitoring", "bullets": ["Per-tenant RPM cap", "Token budget check"]},
            "targets": [
                {"title": "BigQuery Analytics", "sub": "Private Service Connect", "iconKey": "bigquery"},
                {"title": "Cloud KMS CMEK", "sub": "Revocable HSM key", "iconKey": "cloud_kms"},
            ],
            "observabilityBar": "Cloud Logging & Cloud Monitoring — Immutable audit trail · HTTP 401/403/429 fail-closed",
        },
        "cloudArchDiagram": {
            "userLabel": "Enterprise AI Agent",
            "edgeServices": [
                {"name": "Cloud Armor", "iconKey": "cloud_armor"},
                {"name": "Identity-Aware Proxy", "iconKey": "iap"},
                {"name": "Cloud Load Balancing", "iconKey": "load_balancing"},
            ],
            "hubTitle": "Zero-Trust MCP Hub",
            "hubServices": [
                {"name": "Cloud Run MCP Proxy", "iconKey": "cloud_run"},
                {"name": "Cloud DLP Redactor", "iconKey": "cloud_dlp"},
            ],
            "spokeATitle": "Sync Tool & Policy Spoke",
            "spokeAServices": [
                {"name": "Cloud IAM Policy", "iconKey": "cloud_iam"},
                {"name": "Cloud Storage", "iconKey": "cloud_storage"},
            ],
            "spokeBTitle": "Async Audit & Governance Spoke",
            "spokeBMode": "async",
            "spokeBServices": [
                {"name": "Pub/Sub Audit Bus", "iconKey": "pubsub"},
                {"name": "BigQuery Audit", "iconKey": "bigquery"},
            ],
            "rightRailServices": [
                {"name": "Cloud KMS", "iconKey": "cloud_kms"},
                {"name": "Cloud Logging", "iconKey": "cloud_logging"},
                {"name": "Cloud Monitoring", "iconKey": "cloud_monitoring"},
            ],
            "edgeLabels": {
                "edgeToHub": "Verified IAP JWT",
                "hubToSpokeA": "Scoped tool call",
                "hubToSpokeB": "Async audit event",
                "spokeAToSpokeB": "Audit stream",
            },
        },
        "sequenceDiagram": {
            "actors": [
                {"title": "Caller / Agent", "sub": "OIDC Token", "iconKey": "client_user"},
                {"title": "Cloud LB & IAP", "sub": "Edge Verify", "iconKey": "iap"},
                {"title": "MCP Gateway", "sub": "Cloud Run v2", "iconKey": "cloud_run"},
                {"title": "Cloud DLP", "sub": "Egress Guard", "iconKey": "cloud_dlp"},
                {"title": "BigQuery Audit", "sub": "RLS Sink", "iconKey": "bigquery"},
            ],
            "steps": [
                {"fromIdx": 0, "toIdx": 1, "title": "POST /mcp/call with bearer JWT", "detail": "HTTPS TLS 1.3 ingress request", "wire": "HTTPS TLS 1.3", "kind": "request"},
                {"fromIdx": 1, "toIdx": 2, "title": "Forward IAP-verified assertion", "detail": "Attaches ES256 signed JWT", "wire": "X-Goog-IAP-JWT-Assertion", "kind": "guard"},
                {"fromIdx": 2, "toIdx": 3, "title": "Inspect tool output via Cloud DLP", "detail": "Scans for PII & credentials", "wire": "gRPC Private", "kind": "guard"},
                {"fromIdx": 3, "toIdx": 2, "title": "Return redacted response payload", "detail": "Sensitive fields masked", "wire": "gRPC 200 OK", "kind": "response"},
                {"fromIdx": 2, "toIdx": 4, "title": "Append signed audit event record", "detail": "Tenant-scoped audit row", "wire": "Storage Write API", "kind": "request"},
                {"fromIdx": 2, "toIdx": 0, "title": "HTTP 200 redacted response payload", "detail": "Verified caller receives answer", "wire": "HTTPS 200 OK", "kind": "response"},
            ],
        },
        "sections": [
            {
                "heading": "Executive Summary & Architectural Challenge",
                "paragraphs": [
                    "Exposing internal enterprise tools to autonomous agents creates acute lateral-movement and data-exfiltration risk. "
                    "Shared headers alone can be spoofed when multi-tenant agents operate behind a single reverse proxy. "
                    "A fail-closed MCP gateway decouples identity verification from downstream tool invocation so every call carries verifiable tenant provenance."
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
                    "Private Service Connect confines backend API traffic inside private RFC 1918 allocations without exposing external endpoints. "
                    "Pairing Cloud Storage and BigQuery artifacts with Customer-Managed Encryption Keys (CMEK) gives enterprise tenants "
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
            {"number": i, "kicker": f"PART {i}", "title": f"Slide {i} Title — Zero-Trust MCP", "subtitle": f"Takeaway summary for slide {i}",
             "bullets": [f"Key architecture control point {i}.A", f"Verification boundary {i}.B", f"Operational guardrail {i}.C"],
             "calloutLabel": "Target Ceiling" if i == 2 else "",
             "calloutValue": "p95 < 150 ms (EXAMPLE_TARGET)" if i == 2 else "",
             "table": {"headers": ["Plane", "Service", "Control"], "rows": [["Edge", "Cloud LB", "WAF"], ["Data", "BigQuery", "RLS"]]} if i in (4, 8) else None,
             "codeSnippet": "def verify_tenant(jwt_sub: str) -> bool:\n    return bool(jwt_sub)\n" if i == 6 else "",
             "speakerNotes": f"In this section we examine the core engineering controls covering slide {i} of the MCP gateway reference architecture."}
            for i in range(1, 10)
        ],
        "codeStarter": {
            "readmeSummary": "Verify variables.tf and run terraform plan inside a dedicated sandbox project.",
            "terraformMain": 'terraform {\n  required_version = ">= 1.5.0"\n}\n',
            "terraformVars": 'variable "project_id" {\n  type = string\n}\n',
            "pythonApp": '"""Starter proxy check."""\n\ndef check_tenant(tenant_id: str) -> dict:\n    return {"tenant": tenant_id, "allowed": bool(tenant_id)}\n',
            "deploySh": "#!/usr/bin/env bash\nset -euo pipefail\necho 'Dry run only'\n",
            "verifySh": "#!/usr/bin/env bash\nset -euo pipefail\npython3 -m py_compile app.py\n",
        },
        "claimLedger": [
            {"id": "CLM-01", "claim": "Gateway authorization mode", "value": "Fail-closed (HTTP 403)", "provenance": "GCP_DOCUMENTED", "basis": "IAP / RBAC default-deny"},
            {"id": "CLM-02", "claim": "Gateway added proxy p95 overhead", "value": "< 150 ms", "provenance": "EXAMPLE_TARGET", "basis": "Illustrative latency budget prior to live load test"},
            {"id": "CLM-03", "claim": "Default Cloud Run request timeout", "value": "300 s", "provenance": "GCP_DOCUMENTED", "basis": "Cloud Run service spec"},
        ],
        "faq": [
            {"question": "Does this template replace live penetration testing?", "answer": "No. Review and test all IAM rules in a staging project first."},
        ],
        "references": [
            {"title": "Google Cloud Architecture Center", "url": "https://cloud.google.com/architecture", "note": "Reference standards"},
            {"title": "Cloud Run Security Overview", "url": "https://cloud.google.com/run/docs/securing/overview", "note": "IAM & sandboxing"},
        ],
    }
    return cb1.normalize_blueprint(raw, "Build a zero-trust MCP gateway on Cloud Run", "Multi-Tenant Agentic AI", "Architects")


class TestCreateBlog1EngineAndRoutes(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls._tmpdir = tempfile.TemporaryDirectory(prefix="cb1_test_")
        cls._old_env = {
            "GEAP_CREATE_BLOG1_DIR": os.environ.get("GEAP_CREATE_BLOG1_DIR"),
            "GEAP_DISABLE_GCS_SYNC": os.environ.get("GEAP_DISABLE_GCS_SYNC"),
            "GEAP_DISABLE_VERTEX_AUTH": os.environ.get("GEAP_DISABLE_VERTEX_AUTH"),
            "K_SERVICE": os.environ.get("K_SERVICE"),
            "GEMINI_API_KEY": os.environ.get("GEMINI_API_KEY"),
            "CREATE_BLOG1_DISABLE_GDRIVE_CLI": os.environ.get("CREATE_BLOG1_DISABLE_GDRIVE_CLI"),
        }
        os.environ["GEAP_CREATE_BLOG1_DIR"] = cls._tmpdir.name
        os.environ["GEAP_DISABLE_GCS_SYNC"] = "1"
        os.environ["CREATE_BLOG1_DISABLE_GDRIVE_CLI"] = "1"

        cls.httpd = ThreadingHTTPServer(("127.0.0.1", 0), srv.PortalRequestHandler)
        cls.port = cls.httpd.server_address[1]
        cls.base = f"http://127.0.0.1:{cls.port}"
        cls.thread = threading.Thread(target=cls.httpd.serve_forever, daemon=True)
        cls.thread.start()

    @classmethod
    def tearDownClass(cls) -> None:
        cls.httpd.shutdown()
        cls.httpd.server_close()
        for k, v in cls._old_env.items():
            if v is None:
                os.environ.pop(k, None)
            else:
                os.environ[k] = v
        cls._tmpdir.cleanup()

    def _req(self, path: str, method: str = "GET", body: dict | None = None, headers: dict | None = None) -> tuple[int, dict, bytes]:
        hdrs = dict(headers or {})
        data = None
        if body is not None:
            data = json.dumps(body).encode("utf-8")
            hdrs.setdefault("Content-Type", "application/json")
        req = urllib.request.Request(self.base + path, data=data, headers=hdrs, method=method)
        try:
            with urllib.request.urlopen(req, timeout=15) as resp:
                return resp.status, dict(resp.headers), resp.read()
        except urllib.error.HTTPError as exc:
            return exc.code, dict(exc.headers), exc.read()

    def test_01_header_nav_and_page_serves_cleanly_zero_banned_dom_sinks(self) -> None:
        hdr_html = (ROOT_DIR / "templates" / "header.html").read_text(encoding="utf-8")
        self.assertIn('href="/create-blog1"', hdr_html)
        self.assertIn("Create Blog1", hdr_html)

        status, _, body = self._req("/create-blog1")
        self.assertEqual(status, 200)
        html_text = body.decode("utf-8")
        self.assertIn("Create Blog1", html_text)
        self.assertIn(srv._PORTAL_CSRF_TOKEN, html_text)
        self.assertNotIn("__CSRF_TOKEN__", html_text)

        js_status, js_hdrs, js_body = self._req("/js/create_blog1.js")
        self.assertEqual(js_status, 200)
        js_text = js_body.decode("utf-8")

        banned = (
            "innerHTML",
            "outerHTML",
            "insertAdjacentHTML",
            "document.write(",
            "eval(",
            "new Function(",
            "window.alert(",
            "window.confirm(",
            "window.prompt(",
            "localStorage",
            "sessionStorage",
        )
        for sink in banned:
            self.assertNotIn(sink, html_text, f"Banned sink {sink} in create_blog1_page.html")
            self.assertNotIn(sink, js_text, f"Banned sink {sink} in create_blog1.js")

        # Duplicate class attribute guard
        self.assertFalse(re.search(r"<[^>]+\bclass=[^>]*\bclass=", html_text))

    def test_02_compile_complete_asset_kit_ooxml_and_drawio_validity(self) -> None:
        bp = _sample_blueprint()
        slug = "zt-mcp-unit-test"
        manifest = cb1.compile_and_save_blog(
            blueprint=bp,
            slug=slug,
            model_used="gemini-2.5-flash",
            auth_mode="unit_test_fixture",
            actor_email="unit-test",
            enable_tts=False,
            enable_judge=False,
        )
        self.assertEqual(manifest["slug"], slug)
        self.assertTrue(manifest["quality"]["deterministic"]["allPassed"], manifest["quality"]["deterministic"])
        self.assertEqual(manifest["quality"]["deterministic"]["passed"], 12)

        blog_dir = Path(self._tmpdir.name) / slug
        # Draw.io checks: zero flowAnimation=1, valid XML, sequence has dashed lifelines
        arch_xml = (blog_dir / "diagrams" / f"{slug}-architecture.drawio").read_text(encoding="utf-8")
        seq_xml = (blog_dir / "diagrams" / f"{slug}-sequence.drawio").read_text(encoding="utf-8")
        ET.fromstring(arch_xml)
        ET.fromstring(seq_xml)
        self.assertNotIn("flowAnimation=1", arch_xml)
        self.assertNotIn("flowAnimation=1", seq_xml)
        self.assertIn("dashed=1;dashPattern=6 4;", seq_xml)
        self.assertNotIn("edit in draw.io", arch_xml.lower())

        # PPTX OOXML integrity
        pptx_p = blog_dir / "slides" / f"{slug}-deck.pptx"
        with zipfile.ZipFile(pptx_p, "r") as zf:
            names = set(zf.namelist())
            for i in range(1, 10):
                self.assertIn(f"ppt/slides/slide{i}.xml", names)
                self.assertIn(f"ppt/notesSlides/notesSlide{i}.xml", names)
                sb = zf.read(f"ppt/slides/slide{i}.xml")
                ET.fromstring(sb)
                self.assertNotRegex(sb, rb'<a:tr\s+h="0"')
            r3 = zf.read("ppt/slides/_rels/slide3.xml.rels").decode("utf-8")
            r5 = zf.read("ppt/slides/_rels/slide5.xml.rels").decode("utf-8")
            self.assertIn("viewer.diagrams.net", r3)
            self.assertIn("viewer.diagrams.net", r5)

        # DOCX OOXML integrity
        docx_p = blog_dir / "docs" / f"{slug}-whitepaper.docx"
        with zipfile.ZipFile(docx_p, "r") as zf:
            doc_xml = zf.read("word/document.xml")
            ET.fromstring(doc_xml)
            self.assertIn(b"Zero-Trust MCP Gateway", doc_xml)

        # Starter zip carries explicit GENERATED_TEMPLATE_UNDEPLOYED marker
        starter_p = blog_dir / f"{slug}-starter.zip"
        with zipfile.ZipFile(starter_p, "r") as zf:
            names = zf.namelist()
            self.assertIn(f"{slug}-starter/main.tf", names)
            self.assertIn(f"{slug}-starter/app.py", names)
            self.assertIn(b"GENERATED_TEMPLATE_UNDEPLOYED", zf.read(f"{slug}-starter/app.py"))

        # GET /api/drawio/item/<slug>-architecture integrates with local studio
        st_d, _, d_body = self._req(f"/api/drawio/item/{slug}-architecture")
        self.assertEqual(st_d, 200)
        d_json = json.loads(d_body.decode("utf-8"))
        self.assertIn("<mxfile", d_json["xml"])
        self.assertTrue(d_json["selfContainedHash"].startswith("R"))

        # HTTP 206 byte range serving works on generated assets
        st_r, r_hdrs, r_body = self._req(
            f"/api/create-blog1/blogs/{slug}/asset/blog.md",
            headers={"Range": "bytes=0-31"},
        )
        self.assertEqual(st_r, 206)
        self.assertEqual(len(r_body), 32)
        self.assertIn("bytes 0-31/", r_hdrs.get("Content-Range", ""))

        # Path traversal rejected
        st_t, _, _ = self._req(f"/api/create-blog1/blogs/{slug}/asset/..%2F..%2Fserver.py")
        self.assertEqual(st_t, 400)

        # Workspace sync fails honestly with HTTP 412 when no Drive OAuth token is mounted
        st_ws, _, ws_body = self._req(
            f"/api/create-blog1/blogs/{slug}/sync-workspace",
            method="POST",
            body={},
            headers={"X-Portal-CSRF": srv._PORTAL_CSRF_TOKEN},
        )
        self.assertIn(st_ws, (200, 412))
        if st_ws == 412:
            ws_json = json.loads(ws_body.decode("utf-8"))
            self.assertEqual(ws_json["code"], "WORKSPACE_OAUTH_REQUIRED")
            self.assertIn(".pptx", ws_json["pptxDownloadUrl"])

    def test_03_proof_upload_embeds_png_in_pptx_slide7_and_docx(self) -> None:
        bp = _sample_blueprint()
        slug = "zt-mcp-proof-test"
        cb1.compile_and_save_blog(
            blueprint=bp,
            slug=slug,
            model_used="gemini-2.5-flash",
            auth_mode="unit_test_fixture",
            actor_email="unit-test",
            enable_tts=False,
            enable_judge=False,
        )
        # Reject spoofed text payload masquerading as PNG
        fake_b64 = base64.b64encode(b"<html>not a real png at all 1234567890</html>").decode("ascii")
        st_bad, _, _ = self._req(
            f"/api/create-blog1/blogs/{slug}/proofs",
            method="POST",
            body={"stage": "BEFORE", "caption": "Invalid fake image", "dataBase64": fake_b64},
            headers={"X-Portal-CSRF": srv._PORTAL_CSRF_TOKEN},
        )
        self.assertEqual(st_bad, 400)

        # Reject localhost sourceUrl masquerading as genuine proof
        png_bytes = _make_valid_png(640, 360)
        png_b64 = base64.b64encode(png_bytes).decode("ascii")
        st_loc, _, _ = self._req(
            f"/api/create-blog1/blogs/{slug}/proofs",
            method="POST",
            body={
                "stage": "BEFORE",
                "caption": "Console snapshot",
                "sourceUrl": "http://localhost:8095/fake",
                "dataBase64": png_b64,
            },
            headers={"X-Portal-CSRF": srv._PORTAL_CSRF_TOKEN},
        )
        self.assertEqual(st_loc, 400)

        # Accept valid PNG and verify PPTX Slide 7 <p:pic> + DOCX word/media embed
        st_ok, _, ok_body = self._req(
            f"/api/create-blog1/blogs/{slug}/proofs",
            method="POST",
            body={
                "stage": "BEFORE",
                "caption": "Cloud Run ingress baseline state",
                "sourceUrl": "https://console.cloud.google.com/run",
                "dataBase64": "data:image/png;base64," + png_b64,
            },
            headers={"X-Portal-CSRF": srv._PORTAL_CSRF_TOKEN},
        )
        self.assertEqual(st_ok, 201, ok_body.decode("utf-8", errors="replace"))
        proof_id = json.loads(ok_body.decode("utf-8"))["proof"]["id"]

        blog_dir = Path(self._tmpdir.name) / slug
        with zipfile.ZipFile(blog_dir / "slides" / f"{slug}-deck.pptx", "r") as zf:
            self.assertIn("ppt/media/proof_1.png", zf.namelist())
            s7 = zf.read("ppt/slides/slide7.xml").decode("utf-8")
            self.assertIn("<p:pic>", s7)
        with zipfile.ZipFile(blog_dir / "docs" / f"{slug}-whitepaper.docx", "r") as zf:
            self.assertIn("word/media/proof_1.png", zf.namelist())
            dxml = zf.read("word/document.xml").decode("utf-8")
            self.assertIn("w:drawing", dxml)

        # Delete proof and verify deck rebuild removes media
        st_del, _, _ = self._req(
            f"/api/create-blog1/blogs/{slug}/proofs/delete",
            method="POST",
            body={"proofId": proof_id},
            headers={"X-Portal-CSRF": srv._PORTAL_CSRF_TOKEN},
        )
        self.assertEqual(st_del, 200)
        with zipfile.ZipFile(blog_dir / "slides" / f"{slug}-deck.pptx", "r") as zf:
            self.assertNotIn("ppt/media/proof_1.png", zf.namelist())

    def test_04_security_guards_csrf_origin_iap_and_fail_closed_auth(self) -> None:
        # Missing CSRF rejected
        st_nocsrf, _, b_nc = self._req(
            "/api/create-blog1/generate",
            method="POST",
            body={"prompt": "Valid length topic about Vertex AI RAG"},
        )
        self.assertEqual(st_nocsrf, 403)
        self.assertEqual(json.loads(b_nc.decode("utf-8"))["code"], "CSRF_INVALID")

        # Cross-origin blocked
        st_orig, _, b_orig = self._req(
            "/api/create-blog1/generate",
            method="POST",
            body={"prompt": "Valid length topic about Vertex AI RAG"},
            headers={"X-Portal-CSRF": srv._PORTAL_CSRF_TOKEN, "Origin": "https://evil.example.com"},
        )
        self.assertEqual(st_orig, 403)
        self.assertEqual(json.loads(b_orig.decode("utf-8"))["code"], "ORIGIN_FORBIDDEN")

        # Cloud Run IAP check enforced when K_SERVICE set
        os.environ["K_SERVICE"] = "ge-blogs"
        try:
            st_iap, _, b_iap = self._req(
                "/api/create-blog1/generate",
                method="POST",
                body={"prompt": "Valid length topic about Vertex AI RAG"},
                headers={"X-Portal-CSRF": srv._PORTAL_CSRF_TOKEN},
            )
            self.assertEqual(st_iap, 403)
            self.assertEqual(json.loads(b_iap.decode("utf-8"))["code"], "ADMIN_IAP_REQUIRED")
        finally:
            os.environ.pop("K_SERVICE", None)

        # Fail-closed HTTP 503 when NO Vertex token AND NO GEMINI_API_KEY
        os.environ["GEAP_DISABLE_VERTEX_AUTH"] = "1"
        os.environ.pop("GEMINI_API_KEY", None)
        try:
            st_503, _, b_503 = self._req(
                "/api/create-blog1/generate",
                method="POST",
                body={"prompt": "Build an enterprise Zero-Trust BigQuery architecture"},
                headers={"X-Portal-CSRF": srv._PORTAL_CSRF_TOKEN},
            )
            self.assertEqual(st_503, 503)
            self.assertEqual(json.loads(b_503.decode("utf-8"))["code"], "MODEL_AUTH_UNAVAILABLE")
        finally:
            os.environ.pop("GEAP_DISABLE_VERTEX_AUTH", None)

    def test_05_secret_redaction_and_f13_leak_scanner(self) -> None:
        fake_key = "".join(["AI", "za", "SyFakeUnitTestKey123456789012345678"])
        red = cb1._redact_secret(f"error calling key={fake_key} fail", fake_key)
        self.assertNotIn(fake_key, red)
        self.assertIn("[REDACTED", red)
        leaks = cb1.scan_for_f13_leaks("See b/12345678 and go/internal-doc and " + "corp." + "google.com")
        self.assertGreaterEqual(len(leaks), 3)

    def test_06_delete_blog_route_cleans_up_files_and_index(self) -> None:
        bp = _sample_blueprint()
        slug = "zt-mcp-delete-me"
        cb1.compile_and_save_blog(
            blueprint=bp,
            slug=slug,
            model_used="gemini-2.5-flash",
            auth_mode="unit_test_fixture",
            actor_email="unit-test",
            enable_tts=False,
            enable_judge=False,
        )
        st, _, raw = self._req(
            f"/api/create-blog1/blogs/{slug}/delete",
            method="POST",
            body={},
            headers={"X-Portal-CSRF": srv._PORTAL_CSRF_TOKEN},
        )
        self.assertEqual(st, 200, raw.decode("utf-8", errors="replace"))
        self.assertFalse((Path(self._tmpdir.name) / slug).exists())
        st_g, _, _ = self._req(f"/api/create-blog1/blogs/{slug}")
        self.assertEqual(st_g, 404)


    def test_07_signed_edge_assertion_ecdsa_p256_gate(self) -> None:
        import hashlib, time as _t

        def _der_int(val: int) -> bytes:
            b = val.to_bytes((val.bit_length() + 7) // 8 or 1, "big")
            if b[0] & 0x80:
                b = b"\x00" + b
            return bytes([0x02, len(b)]) + b

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

        priv_d = 0x123456789ABCDEF0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF1
        pub_xy = cb1._p256_mul(priv_d, cb1._P256_G)
        assert pub_xy is not None
        xb = pub_xy[0].to_bytes(32, "big")
        yb = pub_xy[1].to_bytes(32, "big")
        kh = cb1.compute_edge_assertion_ec_key_hash(xb, yb)
        pub_keys_json = json.dumps({"keys": [{"kty": "EC", "crv": "P-256", "x": xb.hex(), "y": yb.hex()}]})

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

        now = int(_t.time())
        admin_email = "admin-test" + "@" + "google.com"
        valid_hdr = _sign_assertion(admin_email, "portal.example.com:443", now)
        stale_hdr = _sign_assertion(admin_email, "portal.example.com:443", now - 1200)
        wrong_host = _sign_assertion(admin_email, "evil.example.com", now)
        non_admin = _sign_assertion("ext@example.com", "portal.example.com", now)

        old_k = os.environ.get("K_SERVICE")
        old_hosts = os.environ.get("EDGE_AUTH_EXPECTED_HOSTS")
        old_keys = os.environ.get("EDGE_AUTH_PUBLIC_KEYS_JSON")
        old_dis = os.environ.get("GEAP_DISABLE_VERTEX_AUTH")
        try:
            os.environ["K_SERVICE"] = "ge-blogs"
            os.environ["EDGE_AUTH_ASSERTION_HEADER"] = "X-Edge-Signed-Assertion"
            os.environ["EDGE_AUTH_EXPECTED_HOSTS"] = "portal.example.com"
            os.environ["EDGE_AUTH_PUBLIC_KEYS_JSON"] = pub_keys_json
            os.environ["GEAP_DISABLE_VERTEX_AUTH"] = "1"

            # Valid signed assertion passes admin gate and reaches fail-closed 503 MODEL_AUTH_UNAVAILABLE (not 403!)
            st_ok, _, b_ok = self._req(
                "/api/create-blog1/generate",
                method="POST",
                body={"prompt": "Build an enterprise bi-temporal Spanner Graph agent memory"},
                headers={"X-Edge-Signed-Assertion": valid_hdr},
            )
            self.assertEqual(st_ok, 503, b_ok.decode("utf-8", errors="replace"))
            self.assertEqual(json.loads(b_ok.decode("utf-8"))["code"], "MODEL_AUTH_UNAVAILABLE")

            # Tampered, stale, wrong-host, and non-admin all fail closed with 403 ADMIN_IAP_REQUIRED
            p_part, s_part = valid_hdr.split(".")
            tampered = p_part[:-1] + ("A" if p_part[-1] != "A" else "B") + "." + s_part
            for bad_label, bad_val in [("tampered", tampered), ("stale", stale_hdr), ("host", wrong_host), ("non_admin", non_admin)]:
                st_b, _, bb = self._req(
                    "/api/create-blog1/generate",
                    method="POST",
                    body={"prompt": "Build an enterprise bi-temporal Spanner Graph agent memory"},
                    headers={"X-Edge-Signed-Assertion": bad_val},
                )
                self.assertEqual(st_b, 403, f"Expected 403 for {bad_label}, got {st_b}: {bb!r}")
        finally:
            for key, prev in [
                ("K_SERVICE", old_k),
                ("EDGE_AUTH_ASSERTION_HEADER", os.environ.get("_NONE_")),
                ("EDGE_AUTH_EXPECTED_HOSTS", old_hosts),
                ("EDGE_AUTH_PUBLIC_KEYS_JSON", old_keys),
                ("GEAP_DISABLE_VERTEX_AUTH", old_dis),
            ]:
                if prev is None:
                    os.environ.pop(key, None)
                else:
                    os.environ[key] = prev

    def test_08_job_status_gcs_fallback_and_validation(self) -> None:
        # Reject malformed job IDs (blocks path traversal to GCS _jobs/)
        for bad_id in ("../index", "cb1-nothexzzzzzz", "cb1-123", ""):
            with self.assertRaises(cb1.CreateBlog1Error) as ctx:
                cb1.get_job_status(bad_id)
            self.assertEqual(ctx.exception.status_code, 404)

        # Cross-instance lookup falls back to GCS _jobs/<jobId>.json when absent from local _JOBS
        fake_jid = "cb1-a1b2c3d4e5f6"
        expected = {"jobId": fake_jid, "status": "RUNNING", "progress": 72, "stage": "SYNTHESIZE_TTS"}
        orig_dl = cb1._gcs_download_bytes
        try:
            cb1._gcs_download_bytes = lambda rel: (
                json.dumps(expected).encode("utf-8") if rel == f"_jobs/{fake_jid}.json" else None
            )
            got = cb1.get_job_status(fake_jid)
            self.assertEqual(got["status"], "RUNNING")
            self.assertEqual(got["progress"], 72)
        finally:
            cb1._gcs_download_bytes = orig_dl


    def test_09_v2_five_c4_diagrams_12_slides_and_tf_d11_security_gate(self) -> None:
        bp = _sample_blueprint()
        # Expand to 12 slides & attach codeBlock + inline **markdown** bold to confirm zero leaks!
        s_extra = [
            {"number": n, "kicker": f"SLIDE {n}", "title": f"**Bold Title {n}**", "subtitle": "Check `sub`", "bullets": [f"**Check {n}:** clean plain text"], "speakerNotes": f"Natural narration for slide {n}."}
            for n in range(10, 13)
        ]
        bp["slides"] = list(bp["slides"]) + s_extra
        bp["slides"][2]["bullets"] = ["**Ingress:** IAP verified", "**Compute:** `Cloud Run` v2"]
        bp["sections"][0]["codeBlocks"] = [{"language": "sql", "caption": "Bi-temporal graph check", "code": "SELECT * FROM GRAPH_TABLE(kg MATCH (a) RETURN a);"}]
        bp["codeStarter"]["schemaSql"] = "CREATE PROPERTY GRAPH AgentGraph NODE TABLES (Entities);"
        slug = "zt-mcp-v2-parity-test"
        manifest = cb1.compile_and_save_blog(
            blueprint=bp,
            slug=slug,
            model_used="gemini-2.5-flash",
            auth_mode="unit_test_fixture",
            actor_email="unit-test",
            enable_tts=False,
            enable_judge=False,
        )
        self.assertEqual(manifest["schemaVersion"], "3.0")
        self.assertEqual(len(manifest["diagrams"]), 6)
        self.assertGreaterEqual(manifest["diagrams"]["architecture"]["iconCount"], 4)
        self.assertEqual(manifest["quality"]["deterministic"]["total"], 12)
        self.assertEqual(manifest["quality"]["deterministic"]["passed"], 12, manifest["quality"]["deterministic"])

        # All 5 diagrams available through /api/drawio/item/<slug>-<kind>
        for k in ("architecture", "cloudarch", "sequence", "security", "wire", "async"):
            st, _, raw = self._req(f"/api/drawio/item/{slug}-{k}")
            self.assertEqual(st, 200, f"studio missing {k}")
            obj = json.loads(raw.decode("utf-8"))
            self.assertIn("<mxfile", obj["xml"])

        # PPTX has 12 slides, 12 notesSlides, 5 viewer.diagrams.net links, zero raw ** leakage
        pptx_p = Path(self._tmpdir.name) / slug / "slides" / f"{slug}-deck.pptx"
        with zipfile.ZipFile(pptx_p, "r") as zf:
            names = set(zf.namelist())
            for i in range(1, 13):
                self.assertIn(f"ppt/slides/slide{i}.xml", names)
                self.assertIn(f"ppt/notesSlides/notesSlide{i}.xml", names)
                s_txt = zf.read(f"ppt/slides/slide{i}.xml").decode("utf-8")
                if i != 9:
                    self.assertNotIn("**", s_txt, f"Raw markdown asterisk leaked into slide {i}")
            for di in (3, 4, 5, 6, 7, 8):
                rel = zf.read(f"ppt/slides/_rels/slide{di}.xml.rels").decode("utf-8")
                self.assertIn("viewer.diagrams.net", rel)

        # WS1-parity density & geometry validation on all 6 diagrams + native editable DrawingML PPTX slides
        self.assertGreaterEqual(manifest["diagrams"]["architecture"].get("vertexCount", 0), 90)
        self.assertGreaterEqual(manifest["diagrams"]["architecture"].get("edgeCount", 0), 20)
        self.assertGreaterEqual(manifest["diagrams"]["architecture"].get("iconCount", 0), 18)
        for kind in ("architecture", "cloudarch", "sequence", "security", "wire", "async"):
            self.assertTrue(manifest["diagrams"][kind].get("geometryValid"), f"{kind} geometry errors: {manifest['diagrams'][kind].get('geometryErrors')}")
        with zipfile.ZipFile(pptx_p, "r") as zf:
            for di in (3, 4, 5, 6, 7, 8):
                s_xml = zf.read(f"ppt/slides/slide{di}.xml").decode("utf-8")
                self.assertGreaterEqual(s_xml.count("<p:sp>"), 20, f"slide{di}.xml should contain native DrawingML diagram vector shapes")
                self.assertIn("Edit in Draw.io", s_xml)

        # D-11 Terraform linter catches public allUsers & deprecated v1 Cloud Run
        bad_tf = {
            "main.tf": 'resource "google_cloud_run_service" "x" {}\nmember = "allUsers"\n',
            "variables.tf": "",
            "deploy.sh": "gcloud run deploy svc --allow-unauthenticated",
        }
        findings = cb1._pipe_v2.scan_terraform_security(bad_tf)
        ids = {f["id"] for f in findings}
        self.assertIn("TF-SEC-01", ids)
        self.assertIn("TF-DEP-01", ids)
        self.assertIn("SH-SEC-01", ids)


    def test_10_auto_revision_inplace_replacements_and_bluf_guard(self) -> None:
        bp = {
            "summary": "Design a strongly consistent bi-temporal knowledge graph using Spanner Graph.",
            "sections": [{
                "heading": "DDL Schema",
                "paragraphs": ["Embeddings use VECTOR<FLOAT32, 768> today."],
                "codeBlocks": [{"language": "sql", "caption": "Old DDL", "code": "embedding VECTOR<FLOAT32, 768>"}],
                "table": {"headers": ["Col", "Type"], "rows": [["embedding", "VECTOR<FLOAT32, 768>"]]},
            }],
            "slides": [{"bullets": ["Column VECTOR<FLOAT32, 768>."], "speakerNotes": "Replace VECTOR<FLOAT32, 768>"}],
            "codeStarter": {"schemaSql": "CREATE TABLE T (embedding VECTOR<FLOAT32, 768>);"},
        }
        patch = {
            "summary": "Revised the architecture document to fix DDL bugs and claim numbers.",
            "appliedFixes": ["Fixed vector column syntax across prose, DDL, slides, and schema.sql."],
            "textReplacements": [
                {"old": "VECTOR<FLOAT32, 768>", "new": "ARRAY<FLOAT32>(vector_length=>768)"},
            ],
            "schemaSql": "CREATE TABLE Policy (id STRING(36) NOT NULL, embedding ARRAY<FLOAT32>(vector_length=>768)) PRIMARY KEY (id);",
        }
        applied = cb1._pipe_v2.apply_revision_patch(
            bp,
            patch,
            allowed_tags=cb1.ALLOWED_PROVENANCE_TAGS,
            sanitize_fn=cb1._sanitize_for_public_output,
            strip_emoji_fn=cb1.strip_inline_md,
        )
        self.assertGreaterEqual(len(applied), 2)
        self.assertTrue(any("Verified replacement" in x for x in applied))
        self.assertTrue(any("schema.sql" in x for x in applied))
        # Meta-changelog summary must NOT overwrite reader-facing BLUF
        self.assertTrue(bp["summary"].startswith("Design a strongly consistent"))
        self.assertIn("ARRAY<FLOAT32>(vector_length=>768)", bp["sections"][0]["paragraphs"][0])
        self.assertIn("ARRAY<FLOAT32>(vector_length=>768)", bp["sections"][0]["codeBlocks"][0]["code"])
        self.assertIn("ARRAY<FLOAT32>(vector_length=>768)", bp["sections"][0]["table"]["rows"][0][1])
        self.assertIn("ARRAY<FLOAT32>(vector_length=>768)", bp["slides"][0]["bullets"][0])
        self.assertIn("CREATE TABLE Policy", bp["codeStarter"]["schemaSql"])

    def test_11_v3_capabilities_canonical_diagrams_wrap_and_anti_downgrade(self) -> None:
        # 1. Live capabilities payload must never raise AttributeError (prevent HTTP 503 regression)
        cap = cb1.get_capabilities()
        self.assertIsInstance(cap, dict)
        self.assertGreaterEqual(cap["capabilities"]["officialGcpSvgIcons"], 20)
        self.assertEqual(cap["capabilities"]["diagramLayersPerBlog"], 6)

        # 2. wrap_px splits ultra-long identifiers without orphaned leading bullets or border overflow
        cc = cb1._diag_v2._cc
        wrapped = cc.wrap_px("• INGRESS_TRAFFIC_INTERNAL_ONLY", 134, 9.1, max_lines=3)
        self.assertGreaterEqual(len(wrapped), 2)
        self.assertNotEqual(wrapped[0].strip(), "•")
        for ln in wrapped:
            self.assertLessEqual(cc.est_text_width_px(ln, 9.1), 136.0)

        # 3. normalize_blueprint preserves canonical v3 security/wire/async diagram fields verbatim
        bp_in = {
            "title": "Spanner Graph Memory",
            "subtitle": "Sub",
            "summary": "Executive summary covering Spanner Graph architecture.",
            "securityDiagram": {
                "layers": [
                    {"layer": "L1 · EDGE WAF", "name": "Cloud Armor & External ALB", "detail": "TLS 1.3 and OWASP WAF.", "iconKey": "cloud_armor"},
                    {"layer": "L2 · IDENTITY", "name": "Identity-Aware Proxy", "detail": "ECDSA JWT assertion.", "iconKey": "iap"},
                ],
                "threats": [
                    {"id": "T-01", "vector": "Token Replay", "control": "Short-lived ECDSA JWT verified against JWKS with aud check."},
                ],
                "breakers": [{"code": "HTTP 401", "trigger": "Expired bearer token"}],
            },
            "wireDiagram": {
                "hops": [
                    {"hop": "HOP 1 · CLIENT", "name": "Signed HTTPS Ingress", "transport": "HTTPS / TLS 1.3", "iconKey": "saas_globe", "added": ["+ Authorization: Bearer <JWT>"], "stripped": ["- X-Tenant-ID"], "payload": "GET /v1/memory HTTP/2\nHost: api.example.com"},
                    {"hop": "HOP 2 · IAP", "name": "IAP Edge Assertion", "transport": "mTLS / HTTPS", "iconKey": "iap", "added": ["+ X-Goog-IAP-JWT-Assertion"], "stripped": ["- Raw cookie"], "payload": "sub: agent@example.com\naud: /projects/123"},
                ],
            },
            "asyncDiagram": {
                "stages": [
                    {"stage": "1. CAPTURE", "service": "Spanner Change Streams", "cadence": "Continuous", "iconKey": "spanner", "slo": "Stage 1 · <2s lag", "bullets": ["Streams graph mutations", "Immutable commit timestamps"]},
                    {"stage": "2. ANALYTICS", "service": "BigQuery Write API", "cadence": "Micro-batch", "iconKey": "bigquery", "slo": "Stage 2 · Off-Path", "bullets": ["Exactly-once append", "Partitioned by commit_date"]},
                ],
                "dlqNote": "Dead-letter replay handles malformed events cleanly.",
                "feedbackLabel": "Periodic audit checksum",
            },
            "sequenceDiagram": {
                "steps": [
                    {"title": "1. GET /memory?t=2026-01-15", "detail": "Signed bi-temporal query with OIDC token.", "wire": "HTTPS TLS 1.3"},
                ],
            },
        }
        norm = cb1.normalize_blueprint(bp_in, prompt="Bi-temporal memory architecture", domain="Data & Analytics / RAG", audience="Architects")
        self.assertEqual(norm["securityDiagram"]["layers"][0]["name"], "Cloud Armor & External ALB")
        self.assertEqual(norm["securityDiagram"]["threats"][0]["control"], "Short-lived ECDSA JWT verified against JWKS with aud check.")
        self.assertEqual(norm["wireDiagram"]["hops"][0]["name"], "Signed HTTPS Ingress")
        self.assertIn("GET /v1/memory", norm["wireDiagram"]["hops"][0]["payload"])
        self.assertEqual(norm["asyncDiagram"]["stages"][0]["bullets"][0], "Streams graph mutations")
        self.assertIn("Dead-letter replay", norm["asyncDiagram"]["dlqNote"])

        diags = cb1._diag_v2.compile_all_v2_diagrams(norm, "test-v3")
        self.assertIn("Cloud Armor &amp; External ALB", diags["security"]["svg"])
        self.assertNotIn("Mitigation control", diags["security"]["svg"])
        self.assertIn("Signed HTTPS Ingress", diags["wire"]["svg"])
        self.assertIn("GET /v1/memory", diags["wire"]["svg"])
        self.assertIn("Streams graph mutations", diags["async"]["svg"])
        # Sequence strips duplicate leading `1. ` prefix
        self.assertIn("GET /memory?t=2026-01-15", diags["sequence"]["svg"])
        self.assertNotIn("1. GET /memory?t=2026-01-15", diags["sequence"]["svg"])
        for dk in ("architecture", "cloudarch", "sequence", "security", "wire", "async"):
            self.assertTrue(diags[dk]["geometry"]["valid"], f"{dk} geometry errors: {diags[dk]['geometry']['errors']}")

        # 4. Auto-revision rejects Gemini 2.5 -> Gemini 1.5 downgrade replacements
        bp_rev = {
            "summary": "Architecture using Vertex AI Gemini 2.5 Pro for graph reasoning.",
            "sections": [{"heading": "Overview", "paragraphs": ["Powered by Vertex AI Gemini 2.5 Pro."], "codeBlocks": []}],
            "slides": [{"bullets": ["Uses Gemini 2.5 Flash."], "speakerNotes": "Runs on Gemini 2.5 Pro."}],
            "codeStarter": {"pythonApp": "MODEL = 'gemini-2.5-flash'"},
        }
        applied = cb1._pipe_v2.apply_revision_patch(
            bp_rev,
            {
                "appliedFixes": ["Replaced deprecated Gemini 2.5 Pro with Gemini 1.5 Pro."],
                "textReplacements": [{"old": "Gemini 2.5 Pro", "new": "Gemini 1.5 Pro"}],
            },
            allowed_tags=cb1.ALLOWED_PROVENANCE_TAGS,
            sanitize_fn=cb1._sanitize_for_public_output,
            strip_emoji_fn=cb1.strip_inline_md,
        )
        self.assertIn("Gemini 2.5 Pro", bp_rev["sections"][0]["paragraphs"][0])
        self.assertEqual(applied, [])

    def test_12_promptcanvas_vision_scene_compiler_offline(self) -> None:
        scene = {
            "titleBanner": {"text": "Spanner Graph Memory Hub", "subtext": "Zero-trust bi-temporal topology", "box_2d": [10, 20, 60, 960]},
            "containers": [
                {"id": "z_vpc", "label": "VPC-SC Perimeter", "box_2d": [110, 120, 880, 920], "fillHex": "#F8FAFC", "strokeHex": "#64748B", "dashed": True},
                {"id": "z_run", "label": "Ingress & Compute", "box_2d": [180, 160, 520, 480], "fillHex": "#E8F0FE", "strokeHex": "#1A73E8", "dashed": False},
            ],
            "nodes": [
                {"id": "n_user", "label": "AI Agent", "sublabel": "OIDC JWT", "box_2d": [280, 20, 380, 105], "fillHex": "#FFFFFF", "strokeHex": "#1A73E8", "iconKey": "client_user"},
                {"id": "n_run", "label": "Cloud Run v2 API", "sublabel": "Internal ingress", "box_2d": [260, 190, 400, 440], "fillHex": "#FFFFFF", "strokeHex": "#1A73E8", "iconKey": "cloud_run"},
                {"id": "n_spanner", "label": "Cloud Spanner Graph", "sublabel": "ISO GQL + Vector", "box_2d": [260, 560, 400, 850], "fillHex": "#FEF7E0", "strokeHex": "#EA8600", "iconKey": "spanner"},
            ],
            "edges": [
                {"id": "e1", "sourceId": "n_user", "targetId": "n_run", "label": "HTTPS TLS 1.3", "strokeHex": "#1A73E8"},
                {"id": "e2", "sourceId": "n_run", "targetId": "n_spanner", "label": "GRAPH_TABLE gRPC", "strokeHex": "#188038", "bidirectional": True},
            ],
        }
        out = cb1._pc_engine.compile_vision_scene_to_outputs(
            scene=scene,
            diagram_id="unit-pc-arch",
            diagram_name="Figure 1",
            fallback_title="Spanner Graph",
        )
        self.assertIn("PromptCanvas-Vision1to1", out["xml"])
        self.assertIn("data:image/svg+xml,", out["xml"])
        self.assertNotIn("flowAnimation=1", out["xml"])
        self.assertIn("edgeStyle=none;rounded=1;", out["xml"])
        self.assertNotIn("<script", out["svg"].lower())
        self.assertGreaterEqual(out["iconCount"], 2)
        self.assertEqual(out["audit"]["siblingOverlaps"], 0)
        self.assertIn("<p:sp>", out["ooxmlSlideXml"])
        self.assertIn("rId10", out["ooxmlSlideXml"])

    def test_13_gemini4_neon_routing_thinking_level_and_polish_fixes(self) -> None:
        # 1. Global endpoint routing for Gemini 4 & 3.x vs regional us-central1 for Gemini 2.5
        self.assertIn("gemini-4-neon", cb1.ALLOWED_MODELS)
        self.assertIn("gemini-4-carbon", cb1.ALLOWED_MODELS)
        self.assertIn("gemini-4-argon", cb1.ALLOWED_MODELS)
        self.assertIn("gemini-4-hydrogen", cb1.ALLOWED_MODELS)
        self.assertIn("gemini-3.8-flash", cb1.ALLOWED_MODELS)
        self.assertEqual(cb1.DEFAULT_MODEL, "gemini-4-neon")
        self.assertEqual(cb1.DEFAULT_IMAGE_MODEL, "gemini-3-pro-image")

        neon_url = cb1.build_vertex_generate_url("gemini-4-neon", "demo-proj", "us-central1")
        self.assertIn("https://aiplatform.googleapis.com/v1/projects/demo-proj/locations/global/publishers/google/models/gemini-4-neon:generateContent", neon_url)
        g38_url = cb1.build_vertex_generate_url("gemini-3.8-flash", "demo-proj", "us-central1")
        self.assertIn("/locations/global/", g38_url)
        g25_url = cb1.build_vertex_generate_url("gemini-2.5-flash", "demo-proj", "us-central1")
        self.assertIn("https://us-central1-aiplatform.googleapis.com/v1/projects/demo-proj/locations/us-central1/", g25_url)

        # 2. thinkingLevel (no thinkingBudget/temperature) on Gemini 4; thinkingBudget on Gemini 2.5
        cfg_neon = cb1.build_model_generation_config("gemini-4-neon", max_output_tokens=2048, temperature=0.2, thinking_budget=1024)
        self.assertNotIn("temperature", cfg_neon)
        self.assertEqual(cfg_neon["thinkingConfig"], {"thinkingLevel": "LOW"})
        self.assertNotIn("thinkingBudget", cfg_neon["thinkingConfig"])
        self.assertGreaterEqual(cfg_neon["maxOutputTokens"], 4096)

        cfg_g3 = cb1.build_model_generation_config("gemini-3.8-flash", max_output_tokens=2048, temperature=0.2, thinking_level="MEDIUM")
        self.assertEqual(cfg_g3["thinkingConfig"], {"thinkingLevel": "MEDIUM"})
        self.assertIn("temperature", cfg_g3)

        cfg_25 = cb1.build_model_generation_config("gemini-2.5-flash", max_output_tokens=2048, temperature=0.2, thinking_budget=512)
        self.assertEqual(cfg_25["thinkingConfig"], {"thinkingBudget": 512})

        # 3. Orthogonal peer critic pairing
        self.assertEqual(cb1.select_orthogonal_judge_model("gemini-4-neon"), "gemini-4-carbon")
        self.assertEqual(cb1.select_orthogonal_judge_model("gemini-4-carbon"), "gemini-4-neon")
        self.assertEqual(cb1.select_orthogonal_judge_model("gemini-4-argon"), "gemini-4-neon")
        self.assertEqual(cb1.select_orthogonal_judge_model("gemini-4-hydrogen"), "gemini-4-neon")
        self.assertEqual(cb1.select_orthogonal_judge_model("gemini-3.8-flash"), "gemini-4-neon")
        self.assertEqual(cb1.select_orthogonal_judge_model("gemini-2.5-flash"), "gemini-2.5-pro")
        self.assertEqual(cb1.select_orthogonal_judge_model("gemini-2.5-pro"), "gemini-2.5-flash")

        # 4. Wire diagram non-empty + ADDED fallback when model passes added=[]
        bp_wire = {
            "title": "Bi-Temporal Agent Memory",
            "wireDiagram": {
                "hops": [
                    {"hop": f"HOP {i+1}", "name": f"Stage {i+1}", "transport": "HTTPS / TLS 1.3", "added": [], "stripped": [], "payload": "GET /v1/memory"}
                    for i in range(4)
                ]
            },
        }
        w_spec = cb1._diag_v2.build_wire_spec_v3(bp_wire, "unit-wire")
        for i in range(4):
            card = next(c for c in w_spec["cards"] if c["id"] == f"wh_add_{i}")
            self.assertGreaterEqual(len(card["lines"]), 3, f"hop {i+1} +ADDED box must never be blank")

        # 5. Sequence bottom 3 milestone cards wrap long detail text across up to 2 lines
        bp_seq = {
            "title": "Bi-Temporal Agent Memory",
            "sequenceDiagram": {
                "stageSummaries": [
                    {"title": "1. Ingress", "headline": "Cloud Armor + IAP", "detail": "Verifies ES256 IAP assertion, checks DPoP proof token, and rejects untrusted spoofed client tenant headers before forwarding"},
                    {"title": "2. Engine", "headline": "Cloud Run + Neon", "detail": "Executes hybrid vector plus graph recall within strict budgeted latency windows"},
                    {"title": "3. Audit", "headline": "Spanner + KMS", "detail": "Persists immutable assert-time rows protected by customer-managed encryption keys"},
                ]
            },
        }
        seq_spec = cb1._diag_v2.build_sequence_spec_v3(bp_seq, "unit-seq")
        sum0 = next(c for c in seq_spec["cards"] if c["id"] == "sum_0")
        self.assertGreaterEqual(len(sum0["lines"]), 4, "long milestone detail should wrap onto 2 balanced lines")

        # 6. Auto-revision protects Gemini 4 Neon/3.8 from downgrade and supports deploySh patching
        bp_rev = {
            "summary": "Platform powered by gemini-4-neon and gemini-3.8-flash.",
            "sections": [{"heading": "Arch", "paragraphs": ["Runs on Gemini 4 Neon and Gemini 3.8 Flash."], "codeBlocks": []}],
            "slides": [{"bullets": ["Uses gemini-4-neon."], "speakerNotes": "Runs on Gemini 4 Neon."}],
            "codeStarter": {"deploySh": "gcloud run deploy api --allow-unauthenticated"},
        }
        cb1._pipe_v2.apply_revision_patch(
            bp_rev,
            {
                "appliedFixes": ["Downgraded Gemini 4 Neon to Gemini 1.5 Pro", "Hardened deploy.sh"],
                "textReplacements": [
                    {"old": "Gemini 4 Neon", "new": "Gemini 1.5 Pro"},
                    {"old": "--allow-unauthenticated", "new": "--no-allow-unauthenticated"},
                ],
            },
            allowed_tags=cb1.ALLOWED_PROVENANCE_TAGS,
            sanitize_fn=cb1._sanitize_for_public_output,
            strip_emoji_fn=cb1.strip_inline_md,
        )
        self.assertIn("Gemini 4 Neon", bp_rev["sections"][0]["paragraphs"][0])
        self.assertIn("--no-allow-unauthenticated", bp_rev["codeStarter"]["deploySh"])
        self.assertNotIn("--allow-unauthenticated", bp_rev["codeStarter"]["deploySh"])

        # 7. D-04 SVG XSS regex ignores benign SQL text like `is_tombstoned = TRUE` inside <text>,
        #    while rejecting real inline event handlers inside SVG tags (<rect onclick=...>).
        svg_ok = '<svg><text>Filter is_tombstoned = TRUE</text></svg>'
        svg_bad = '<svg><rect onclick="alert(1)"/></svg>'
        xss_pat = cb1.re.compile(r"(<script|<foreignobject|javascript:|<[^>]+\son[a-z]+\s*=)")
        self.assertIsNone(xss_pat.search(svg_ok.lower()))
        self.assertIsNotNone(xss_pat.search(svg_bad.lower()))


    def test_14_open_with_google_slides_docs_and_transient_oauth_sync(self) -> None:
        # 1. UI uses Open with Google Slides / Google Docs buttons (no raw .pptx/.docx hero download buttons)
        js_text = (ROOT_DIR / "js" / "create_blog1.js").read_text(encoding="utf-8")
        self.assertIn("Open with Google Slides", js_text)
        self.assertIn("Open with Google Docs", js_text)
        self.assertNotIn("Whitepaper (.docx)", js_text)
        self.assertNotIn("-Slide Deck (.pptx)", js_text)
        self.assertNotIn("Download .pptx (", js_text)

        # 2. Capabilities exposes OAuth client ID for browser 1-click Google Slides/Docs sync
        cap_st, _, cap_body = self._req("/api/create-blog1/capabilities")
        self.assertEqual(cap_st, 200)
        cap = json.loads(cap_body.decode("utf-8"))
        self.assertTrue(cap["capabilities"]["workspaceOauthClientId"].endswith(".apps.googleusercontent.com"))
        self.assertTrue(cap["capabilities"]["workspaceBrowserOauth"])

        # 3. Unmounted server without token returns 412 with oauthClientId + scopes
        bp = _sample_blueprint()
        slug = "zt-workspace-sync-test"
        cb1.compile_and_save_blog(
            blueprint=bp,
            slug=slug,
            model_used="gemini-4-neon",
            auth_mode="unit_test_fixture",
            actor_email="unit-test",
            enable_tts=False,
            enable_judge=False,
        )
        st412, _, body412 = self._req(
            f"/api/create-blog1/blogs/{slug}/sync-workspace",
            method="POST",
            body={},
            headers={"X-Portal-CSRF": srv._PORTAL_CSRF_TOKEN},
        )
        self.assertEqual(st412, 412)
        p412 = json.loads(body412.decode("utf-8"))
        self.assertEqual(p412["code"], "WORKSPACE_OAUTH_REQUIRED")
        self.assertIn("drive.file", p412["scopes"][0])

        # 4. Transient X-Google-Workspace-Token converts via multipart upload & supports in-place re-sync PATCH
        calls = []
        mod_ref = srv.create_blog1_mod
        orig_up = mod_ref._drive_multipart_upload
        def _fake_upload(token, filename, src_mime, dst_mime, raw_bytes, existing_id=None):
            calls.append((token, dst_mime, existing_id, len(raw_bytes)))
            if dst_mime.endswith("presentation"):
                return {"id": existing_id or "slide_abc123", "resourceKey": "0-rkSlide"}
            return {"id": existing_id or "doc_xyz789", "resourceKey": "0-rkDoc"}
        mod_ref._drive_multipart_upload = _fake_upload
        try:
            st1, _, b1 = self._req(
                f"/api/create-blog1/blogs/{slug}/sync-workspace",
                method="POST",
                body={},
                headers={"X-Portal-CSRF": srv._PORTAL_CSRF_TOKEN, "X-Google-Workspace-Token": "unit-test-oauth-bearer-fixture"},
            )
            self.assertEqual(st1, 200, b1.decode("utf-8"))
            r1 = json.loads(b1.decode("utf-8"))["workspaceSync"]
            self.assertEqual(r1["status"], "SYNCED")
            self.assertIn("docs.google.com/presentation/d/slide_abc123/edit?resourcekey=0-rkSlide", r1["slidesUrl"])
            self.assertIn("docs.google.com/document/d/doc_xyz789/edit?resourcekey=0-rkDoc", r1["docUrl"])
            self.assertEqual(calls[0][2], None)
            self.assertEqual(calls[1][2], None)

            # Re-sync passes existing_id to preserve permanent Google Slides & Docs links
            st2, _, b2 = self._req(
                f"/api/create-blog1/blogs/{slug}/sync-workspace",
                method="POST",
                body={},
                headers={"X-Portal-CSRF": srv._PORTAL_CSRF_TOKEN, "X-Google-Workspace-Token": "unit-test-oauth-bearer-fixture"},
            )
            self.assertEqual(st2, 200)
            self.assertEqual(calls[2][2], "slide_abc123")
            self.assertEqual(calls[3][2], "doc_xyz789")
        finally:
            mod_ref._drive_multipart_upload = orig_up


    def test_15_permanent_forensic_anti_regression_guards(self) -> None:
        """Fail-closed static & runtime guards preventing recurrence of every audited P0/P1/P2 defect."""
        # 1. Static source-code purge verification across compilers, pipeline, engine, HTML & JS
        compiler_src = (ROOT_DIR / "scripts" / "create_blog1_canonical_compiler.py").read_text(encoding="utf-8")
        diagrams_src = (ROOT_DIR / "scripts" / "create_blog1_diagrams_v2.py").read_text(encoding="utf-8")
        pipeline_src = (ROOT_DIR / "scripts" / "create_blog1_pipeline_v2.py").read_text(encoding="utf-8")
        engine_src = (ROOT_DIR / "scripts" / "create_blog1_engine.py").read_text(encoding="utf-8")
        html_src = (ROOT_DIR / "templates" / "create_blog1_page.html").read_text(encoding="utf-8")
        js_src = (ROOT_DIR / "js" / "create_blog1.js").read_text(encoding="utf-8")

        self.assertNotIn('tile.get("icon", "")[:4].upper()', compiler_src)
        self.assertNotIn("_node_by_plane", diagrams_src)
        for dead_edge in ("Sanitize & screen", "User authentication", "Scoped RAG / SQL", "Atomic commit / CDC"):
            self.assertNotIn(dead_edge, diagrams_src, f"Hardcoded WS1 edge label leaked back: {dead_edge}")
        for dead_key in ("architectureZones", "sequenceSteps", "compile_architecture_drawio_and_svg"):
            self.assertNotIn(dead_key, engine_src, f"Legacy v1 dead code leaked back: {dead_key}")
            self.assertNotIn(dead_key, pipeline_src, f"Legacy v1 dead code leaked back: {dead_key}")
        self.assertNotIn(".splitlines()[:45]", engine_src, "Silent 45-line DOCX code truncation leaked back")
        self.assertNotIn("[:3600]", pipeline_src, "Silent 3600-char code truncation leaked back")
        self.assertNotIn("Diagrams (5)", html_src)
        self.assertNotIn("notesSlide", js_src)
        self.assertNotIn("Slide 7", js_src)
        self.assertNotIn("Vector PPTX", js_src)
        self.assertNotIn("Edit in Draw.io (.pptx link)", engine_src)

        # 2. Native DrawingML <a:custGeom> icons present on ALL 6 diagram slides (3..8), zero GOO/GCP/SAA badges
        bp = _sample_blueprint()
        bp["slides"] = list(bp["slides"]) + [
            {"number": n, "kicker": f"SLIDE {n}", "title": f"Slide {n}", "subtitle": f"Sub {n}",
             "bullets": [f"Bullet {n}.1", f"Bullet {n}.2"], "speakerNotes": f"Narration {n}."}
            for n in range(10, 13)
        ]
        bp["sections"][0]["paragraphs"].append("Inline `CREATE PROPERTY GRAPH` and **bold** formatting check.")
        bp["sections"][0]["codeBlocks"] = [
            {"language": "yaml", "caption": "main.tf", "code": 'resource "google_storage_bucket" "b" {\n  name = "x"\n}'},
            {"language": "python", "caption": "app.py", "code": "def broken_syntax(:\n    pass"},
        ]
        bp["codeStarter"]["schemaSql"] = "CREATE PROPERTY GRAPH AgentMemoryGraph NODE TABLES (Entities);"
        bp["slides"][8]["codeSnippet"] = "SELECT * FROM GRAPH_TABLE(PolicyGraph MATCH (a) RETURN a);"
        slug = "anti-regression-v3"
        manifest = cb1.compile_and_save_blog(
            blueprint=bp,
            slug=slug,
            model_used="gemini-4-neon",
            auth_mode="unit_test_fixture",
            actor_email="secret-operator@google.com",
            enable_tts=False,
            enable_judge=False,
        )
        self.assertTrue(manifest["quality"]["deterministic"]["allPassed"], manifest["quality"]["deterministic"])

        blog_dir = Path(self._tmpdir.name) / slug
        # Single source of truth fixed YAML -> HCL, fixed broken inline Python, and replaced PolicyGraph on Slide 9
        md_txt = (blog_dir / "blog.md").read_text(encoding="utf-8")
        self.assertIn("```hcl", md_txt)
        self.assertNotIn("def broken_syntax(:", md_txt)
        self.assertNotIn("PolicyGraph", (blog_dir / "slides" / "slide_09.svg").read_text(encoding="utf-8"))

        # PPTX Slides 3..8 all have native <a:custGeom> icon shapes, Slide 2 has 0 raw (EXAMPLE_TARGET), Slide 10 says Slide 10
        with zipfile.ZipFile(blog_dir / "slides" / f"{slug}-deck.pptx", "r") as zf:
            s2 = zf.read("ppt/slides/slide2.xml").decode("utf-8")
            self.assertNotIn("EXAMPLE_TARGET", s2)
            s10 = zf.read("ppt/slides/slide10.xml").decode("utf-8")
            self.assertIn("Slide 10", s10)
            self.assertNotIn("Slide 7", s10)
            for di in (3, 4, 5, 6, 7, 8):
                sx = zf.read(f"ppt/slides/slide{di}.xml").decode("utf-8")
                self.assertGreaterEqual(sx.count('name="ico_'), 3, f"Slide {di} missing native DrawingML icons")
                self.assertIn("<a:custGeom>", sx)
                for bad_b in (">GOO<", ">GCP<", ">SAA<"):
                    self.assertNotIn(bad_b, sx)

        # DOCX has all 6 figures (incl. Figure 2), zero literal prose backticks, and full starter manifest
        with zipfile.ZipFile(blog_dir / "docs" / f"{slug}-whitepaper.docx", "r") as zf:
            dxml = zf.read("word/document.xml").decode("utf-8")
            for fi in range(1, 7):
                self.assertIn(f"Figure {fi}", dxml)
            self.assertNotIn("`CREATE PROPERTY GRAPH`", dxml)
            self.assertIn("Dockerfile", dxml)

        # Starter zip includes Dockerfile + requirements.txt + schema.sql listed in README.md
        with zipfile.ZipFile(blog_dir / f"{slug}-starter.zip", "r") as zf:
            snames = set(zf.namelist())
            self.assertIn(f"{slug}-starter/Dockerfile", snames)
            self.assertIn(f"{slug}-starter/requirements.txt", snames)
            self.assertIn(f"{slug}-starter/schema.sql", snames)
            readme = zf.read(f"{slug}-starter/README.md").decode("utf-8")
            self.assertIn("schema.sql", readme)
            self.assertIn("Dockerfile", readme)

        # Public bundle.zip redacts actorEmail (@google.com never leaks into downloadable archive)
        with zipfile.ZipFile(blog_dir / f"{slug}-bundle.zip", "r") as zf:
            b_manifest = zf.read(f"{slug}/manifest.json").decode("utf-8")
            self.assertNotIn("@google.com", b_manifest)
            self.assertNotIn("secret-operator", b_manifest)

        # 3. Upgraded D-11 catches SH-BUG-01, TF-FGAC-01, PY-AUTH-01, PY-ENV-01
        bad_starter = {
            "schema.sql": "CREATE ROLE memory_api_role;",
            "main.tf": 'resource "google_spanner_database_iam_member" "x" { role = "roles/spanner.databaseUser" }\nresource "google_cloud_run_v2_service" "s" { template { containers { env { name = "ONLY_ONE" } } } }',
            "variables.tf": "",
            "verify.sh": "gcloud run services describe api --format=\"value(spec.template.metadata.annotations['run.googleapis.com/ingress'])\"",
            "app.py": 'import os\nX = os.environ["MISSING_VAR"]\ndef f(req):\n    hdr = req.headers.get("X-Goog-IAP-JWT-Assertion")\n    return hdr\n',
        }
        f_ids = {f["id"] for f in cb1._pipe_v2.scan_terraform_security(bad_starter)}
        self.assertIn("SH-BUG-01", f_ids)
        self.assertIn("TF-FGAC-01", f_ids)
        self.assertIn("PY-AUTH-01", f_ids)
        self.assertIn("PY-ENV-01", f_ids)

        # 4. Auto-revision NEVER emits unverified appliedFixes when nothing mutated
        bp_noop = {"summary": "Unchanged", "sections": [], "slides": [], "codeStarter": {}}
        noop_applied = cb1._pipe_v2.apply_revision_patch(
            bp_noop,
            {"appliedFixes": ["Claimed fix that never happened"], "textReplacements": [{"old": "DOES_NOT_EXIST", "new": "X"}]},
            allowed_tags=cb1.ALLOWED_PROVENANCE_TAGS,
            sanitize_fn=cb1._sanitize_for_public_output,
            strip_emoji_fn=cb1.strip_inline_md,
        )
        self.assertEqual(noop_applied, [])


        # 5. Python 3.11 compatibility guard (Cloud Run uses python:3.11-slim — forbid PEP 701 backslashes in f-strings)
        import ast as _ast
        for rel_py in (
            "server.py",
            "scripts/create_blog1_canonical_compiler.py",
            "scripts/create_blog1_diagrams_v2.py",
            "scripts/create_blog1_engine.py",
            "scripts/create_blog1_pipeline_v2.py",
            "scripts/sync_create_blog1_workspace.py",
        ):
            src_py = (ROOT_DIR / rel_py).read_text(encoding="utf-8")
            tree_py = _ast.parse(src_py, filename=rel_py)
            for node in _ast.walk(tree_py):
                if isinstance(node, _ast.JoinedStr):
                    for val in node.values:
                        if isinstance(val, _ast.FormattedValue):
                            vseg = _ast.get_source_segment(src_py, val.value) or ""
                            self.assertNotIn("\\", vseg, f"Python 3.11-incompatible backslash inside f-string at {rel_py}:{val.lineno}: {vseg}")


if __name__ == "__main__":
    unittest.main(verbosity=2)
