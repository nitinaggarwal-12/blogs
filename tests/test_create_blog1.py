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
                    {"id": "c6", "label": "Cloud DLP Redactor", "sub": "Sensitive Data Prot.", "role": "Scrub egress tokens"},
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
        }
        os.environ["GEAP_CREATE_BLOG1_DIR"] = cls._tmpdir.name
        os.environ["GEAP_DISABLE_GCS_SYNC"] = "1"

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
        self.assertEqual(manifest["schemaVersion"], "2.0")
        self.assertEqual(len(manifest["diagrams"]), 5)
        self.assertGreaterEqual(manifest["diagrams"]["architecture"]["iconCount"], 4)
        self.assertEqual(manifest["quality"]["deterministic"]["total"], 12)
        self.assertEqual(manifest["quality"]["deterministic"]["passed"], 12, manifest["quality"]["deterministic"])

        # All 5 diagrams available through /api/drawio/item/<slug>-<kind>
        for k in ("architecture", "sequence", "security", "wire", "async"):
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
            for di in (3, 5, 6, 7, 8):
                rel = zf.read(f"ppt/slides/_rels/slide{di}.xml.rels").decode("utf-8")
                self.assertIn("viewer.diagrams.net", rel)

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
        self.assertEqual(len(applied), 1)
        # Meta-changelog summary must NOT overwrite reader-facing BLUF
        self.assertTrue(bp["summary"].startswith("Design a strongly consistent"))
        self.assertIn("ARRAY<FLOAT32>(vector_length=>768)", bp["sections"][0]["paragraphs"][0])
        self.assertIn("ARRAY<FLOAT32>(vector_length=>768)", bp["sections"][0]["codeBlocks"][0]["code"])
        self.assertIn("ARRAY<FLOAT32>(vector_length=>768)", bp["sections"][0]["table"]["rows"][0][1])
        self.assertIn("ARRAY<FLOAT32>(vector_length=>768)", bp["slides"][0]["bullets"][0])
        self.assertIn("CREATE TABLE Policy", bp["codeStarter"]["schemaSql"])

if __name__ == "__main__":
    unittest.main(verbosity=2)
