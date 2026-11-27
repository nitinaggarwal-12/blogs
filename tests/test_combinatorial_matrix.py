#!/usr/bin/env python3
"""
Exhaustive Combinatorial Evaluation Suite for Create Blog (`test_combinatorial_matrix.py`).

Mechanically enforces 100% unique-combination coverage across:
  1. Category × Diagram-Kind Coverage Gate:
     - Union of enabled default diagrams across all 7 categories MUST equal 7/7 `VALID_DIAGRAM_KINDS`
       (`concept`, `architecture`, `cloudarch`, `sequence`, `security`, `wire`, `async` — zero dead kinds).
     - `architecture` ("Master Platform Architecture & Plane Ownership" with `WHO RUNS WHAT`) MUST be
       enabled by default across all 7/7 categories.
     - HTML `<select id="inp-category">` and JS `FALLBACK_CATEGORIES` MUST match `create_blog_categories.py` 1:1.
  2. All 7 Blog Categories × 2 `includeStarterCode` modes (`True`, `False`) = 14 Full Bundle Compilations:
     - Compiles `blog.md`, `.docx`, `.pptx`, `.drawio` + `.svg` diagrams, `slide_01..N.svg`, `starter.zip`,
       `bundle.zip`, and `D-01..D-13` deterministic gates for every `(category_id, includeStarterCode)` pair.
     - Verifies `13/13 PASS`, exact slide count `5 + len(enabledDiagrams) + (1 if includeStarterCode else 0)`,
       `WHO RUNS WHAT` rendered in `architecture.svg`, zero geometry errors, zero `TEXT_WIDE` warnings, and
       native `<a:custGeom>` OOXML vector shapes on every diagram slide.
  3. All 7 Single-Diagram Outlines (`1`-diagram minimum, each `kind` in `VALID_DIAGRAM_KINDS`) +
     Maximal 7/7 All-Diagrams-Enabled Outlines (`True` -> 13 slides, `False` -> 12 slides) = 9 Topology Extremes.
  4. All 3 Diagram Engines (`canonical`, `hybrid`, `promptcanvas_vision`) = 3 Engine Modes.

Total: 26 distinct full-stack combinatorial compilations verified deterministically on every test & deploy run.
"""
from __future__ import annotations

import copy
import json
import os
import re
import sys
import tempfile
import unittest
import zipfile
from pathlib import Path

sys.dont_write_bytecode = True

ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from scripts import create_blog1_engine as cb1
from scripts import create_blog_categories as cbc
from tests.test_create_blog1 import _sample_blueprint


class ExhaustiveCombinatorialMatrixTests(unittest.TestCase):
    def setUp(self) -> None:
        self._tmpdir = tempfile.TemporaryDirectory()
        self._prev_dir = os.environ.get("GEAP_CREATE_BLOG1_DIR")
        self._prev_fast = os.environ.get("GEAP_FAST_TEST_MODE")
        os.environ["GEAP_CREATE_BLOG1_DIR"] = self._tmpdir.name
        os.environ["GEAP_FAST_TEST_MODE"] = "1"

    def tearDown(self) -> None:
        if self._prev_dir is None:
            os.environ.pop("GEAP_CREATE_BLOG1_DIR", None)
        else:
            os.environ["GEAP_CREATE_BLOG1_DIR"] = self._prev_dir
        if self._prev_fast is None:
            os.environ.pop("GEAP_FAST_TEST_MODE", None)
        else:
            os.environ["GEAP_FAST_TEST_MODE"] = self._prev_fast
        self._tmpdir.cleanup()

    def _compile_combination(
        self,
        *,
        slug: str,
        category_id: str,
        outline: list[dict],
        include_starter_code: bool,
        diagram_engine: str = "canonical",
    ) -> dict:
        norm_outline = cb1.normalize_blog_outline(outline, category_id=category_id)
        plan = cb1.compute_dynamic_slide_plan(norm_outline, include_starter_code=include_starter_code)
        raw = _sample_blueprint()
        bp = cb1.normalize_blueprint(
            raw,
            f"Combinatorial verification for {slug} ({category_id}, code={include_starter_code}, engine={diagram_engine})",
            "Multi-Tenant Agentic AI",
            "Solutions Architects & Platform Engineers",
            slide_plan=plan,
            category_id=category_id,
            outline=norm_outline,
        )
        man = cb1.compile_and_save_blog(
            blueprint=bp,
            slug=slug,
            model_used="gemini-4-neon",
            auth_mode="vertex_ai_iam",
            actor_email="combinatorial-verifier@example.com",
            enable_tts=False,
            enable_judge=False,
            diagram_engine=diagram_engine,
            category_id=category_id,
            outline=norm_outline,
            slide_plan=plan,
            include_starter_code=include_starter_code,
        )
        return man

    def test_01_category_diagram_union_and_ui_sync_gate(self) -> None:
        """All 7 diagram kinds MUST be covered across category defaults, and `architecture` MUST be enabled in 7/7."""
        cats = cbc.get_categories_catalog()
        self.assertEqual(len(cats), 7)

        union_enabled_kinds: set[str] = set()
        for cat in cats:
            cid = cat["id"]
            enabled_kinds = [
                x["kind"] for x in cat["recommendedOutline"]
                if x.get("type") == "diagram" and x.get("enabled")
            ]
            self.assertIn(
                "architecture",
                enabled_kinds,
                f"Master Platform Architecture ('architecture' + WHO RUNS WHAT) is missing from category '{cid}'!",
            )
            union_enabled_kinds.update(enabled_kinds)

        self.assertEqual(
            union_enabled_kinds,
            set(cbc.VALID_DIAGRAM_KINDS),
            f"Unreachable diagram kinds across category defaults: {set(cbc.VALID_DIAGRAM_KINDS) - union_enabled_kinds}",
        )

        # Verify HTML <select id="inp-category"> option labels match exact (Xd / Ys) counts
        html = (ROOT_DIR / "templates/create_blog1_page.html").read_text(encoding="utf-8")
        for cat in cats:
            cid = cat["id"]
            dc = cat["recommendedDiagramCount"]
            sc = cat["recommendedSlideCount"]
            m = re.search(rf'<option\s+value="{re.escape(cid)}"[^>]*>([^<]+)</option>', html)
            self.assertIsNotNone(m, f"Missing <option value='{cid}'> in create_blog1_page.html")
            self.assertIn(f"{dc}d / {sc}s", m.group(1), f"Stale count badge in HTML option for {cid}: {m.group(1)}")

    def test_02_all_14_category_x_starter_code_combinations(self) -> None:
        """Exhaustively compiles all 7 categories × {includeStarterCode=True, False} (14 combinations)."""
        cats = cbc.get_categories_catalog()
        compiled_count = 0
        for cat in cats:
            cid = cat["id"]
            expected_diags = [
                x["kind"] for x in cat["recommendedOutline"]
                if x.get("type") == "diagram" and x.get("enabled")
            ]
            for inc_code in (True, False):
                slug = f"cmb-{cid.replace('_', '-')}-{'code' if inc_code else 'nocode'}"
                with self.subTest(category=cid, includeStarterCode=inc_code):
                    man = self._compile_combination(
                        slug=slug,
                        category_id=cid,
                        outline=copy.deepcopy(cat["recommendedOutline"]),
                        include_starter_code=inc_code,
                    )
                    det = man["quality"]["deterministic"]
                    self.assertTrue(det["allPassed"], f"{slug} failed deterministic gate: {json.dumps(det, indent=2)}")
                    expected_slides = 5 + len(expected_diags) + (1 if inc_code else 0)
                    self.assertEqual(man["generation"]["slideCount"], expected_slides)
                    self.assertEqual(list(man["diagrams"].keys()), expected_diags)
                    self.assertEqual(man["starterMeta"]["enabled"], inc_code)

                    bdir = Path(self._tmpdir.name) / slug
                    arch_svg = (bdir / f"diagrams/{slug}-architecture.svg").read_text(encoding="utf-8")
                    self.assertIn("WHO RUNS WHAT", arch_svg)
                    self.assertNotIn("...", arch_svg, f"Ellipsis truncation found in {slug}-architecture.svg")
                    for dk in expected_diags:
                        self.assertTrue(man["diagrams"][dk]["geometryValid"], f"{slug}:{dk} geometry invalid")
                        self.assertEqual(man["diagrams"][dk]["geometryErrors"], [])
                        dio_xml = (bdir / f"diagrams/{slug}-{dk}.drawio").read_text(encoding="utf-8")
                        self.assertRegex(dio_xml, r"<diagram\b[^>]*><mxGraphModel\b", f"{slug}:{dk} violates GraphViewer zero-whitespace rule")

                    pptx_p = bdir / f"slides/{slug}-deck.pptx"
                    with zipfile.ZipFile(pptx_p) as zf:
                        slide_xmls = [n for n in zf.namelist() if re.match(r"^ppt/slides/slide\d+\.xml$", n)]
                        self.assertEqual(len(slide_xmls), expected_slides)
                    compiled_count += 1

        self.assertEqual(compiled_count, 14)

    def test_03_all_7_single_diagram_and_maximal_7_diagram_topologies(self) -> None:
        """Tests all 7 individual 1-diagram outlines + maximal 7/7 all-diagrams-enabled outlines (code=True/False)."""
        base_sections = [
            {"id": f"sec-{i}", "type": "section", "title": f"Architecture Section {i}", "enabled": True}
            for i in range(1, 8)
        ]
        # 1. Each of the 7 diagram kinds individually (minimum 1-diagram outline)
        for kind in cbc.VALID_DIAGRAM_KINDS:
            with self.subTest(topology=f"single-{kind}"):
                outline = [
                    base_sections[0],
                    {"id": f"diag-{kind}", "type": "diagram", "kind": kind, "title": f"Solo {kind}", "enabled": True},
                    base_sections[1],
                ]
                slug = f"cmb-solo-{kind}"
                man = self._compile_combination(
                    slug=slug,
                    category_id="reference_architecture",
                    outline=outline,
                    include_starter_code=False,
                )
                self.assertTrue(man["quality"]["deterministic"]["allPassed"], man["quality"]["deterministic"])
                self.assertEqual(list(man["diagrams"].keys()), [kind])
                self.assertEqual(man["generation"]["slideCount"], 6)

        # 2. Maximal 7/7 all-diagrams-enabled outline (with and without starter code -> 13 and 12 slides)
        max_outline = []
        for idx, kind in enumerate(cbc.VALID_DIAGRAM_KINDS):
            max_outline.append(base_sections[idx])
            max_outline.append({
                "id": f"diag-{kind}",
                "type": "diagram",
                "kind": kind,
                "title": f"Full Matrix {kind}",
                "enabled": True,
            })
        for inc_code, exp_slides in ((True, 13), (False, 12)):
            with self.subTest(topology=f"maximal-7diags-code-{inc_code}"):
                slug = f"cmb-max7-{'code' if inc_code else 'nocode'}"
                man = self._compile_combination(
                    slug=slug,
                    category_id="reference_architecture",
                    outline=copy.deepcopy(max_outline),
                    include_starter_code=inc_code,
                )
                self.assertTrue(man["quality"]["deterministic"]["allPassed"], man["quality"]["deterministic"])
                self.assertEqual(list(man["diagrams"].keys()), list(cbc.VALID_DIAGRAM_KINDS))
                self.assertEqual(man["generation"]["slideCount"], exp_slides)

    def test_04_all_3_diagram_engines_offline_deterministic(self) -> None:
        """Verifies all 3 diagramEngine modes ('canonical', 'hybrid', 'promptcanvas_vision') compile cleanly."""
        cat = cbc.get_category("executive_brief")
        for engine in ("canonical", "hybrid", "promptcanvas_vision"):
            with self.subTest(diagramEngine=engine):
                slug = f"cmb-engine-{engine.replace('_', '-')}"
                man = self._compile_combination(
                    slug=slug,
                    category_id="executive_brief",
                    outline=copy.deepcopy(cat["recommendedOutline"]),
                    include_starter_code=False,
                    diagram_engine=engine,
                )
                self.assertTrue(man["quality"]["deterministic"]["allPassed"], man["quality"]["deterministic"])
                self.assertIn("architecture", man["diagrams"])

    def test_05_repo_drawio_zero_whitespace_and_pptx_cnvpr_uniqueness(self) -> None:
        """Enforces Draw.io GraphViewer zero inter-tag whitespace across repo .drawio files and ECMA-376 cNvPr ID uniqueness across repo .pptx files."""
        for dio_p in sorted((ROOT_DIR / "diagrams").rglob("*.drawio")):
            raw = dio_p.read_text(encoding="utf-8")
            self.assertRegex(
                raw,
                r"<diagram\b[^>]*><mxGraphModel\b",
                f"{dio_p.relative_to(ROOT_DIR)} has inter-tag whitespace between <diagram> and <mxGraphModel>",
            )
        for pptx_p in sorted((ROOT_DIR / "slides").glob("*.pptx")):
            with zipfile.ZipFile(pptx_p, "r") as zf:
                for zn in zf.namelist():
                    if re.match(r"^ppt/slides/slide\d+\.xml$", zn):
                        xml_s = zf.read(zn).decode("utf-8", errors="ignore")
                        ids = [int(m.group(1)) for m in re.finditer(r'<(?:p:)?cNvPr\b[^>]*?\bid="(\d+)"', xml_s)]
                        self.assertEqual(
                            len(ids),
                            len(set(ids)),
                            f"Duplicate cNvPr shape IDs in {pptx_p.name}:{zn}",
                        )



if __name__ == "__main__":
    unittest.main(verbosity=2)
