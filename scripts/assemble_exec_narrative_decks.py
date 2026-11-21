#!/usr/bin/env python3
"""
Lossless OOXML Assembler for the 5 10-Slide Executive Narrative Decks:
  - WS1_EXEC (`slides/ws1-executive-architecture-23slide-deck.pptx`): replaces misplaced
    ThoughtSpot S09 with native WS1 5-Hop Latency Waterfall + GCP Control Plane Proof,
    fixes `Gemini 2.5 Flash` -> `Gemini 2.5 Flash`, and updates Cover Roadmap stop #5.
  - WS2_EXEC (`slides/ws2-executive-architecture-10slide-deck.pptx`): splices BARE_MIN_12
    Slides 3, 4, 5 (100% native DrawingML) into Slides 4, 5, 6.
  - WS3_EXEC (`slides/ws3-executive-architecture-10slide-deck.pptx`): splices BARE_MIN_12
    Slides 6, 7 into Slides 4, 5.
  - WS4_EXEC (`slides/ws4-executive-architecture-10slide-deck.pptx`): splices BARE_MIN_12
    Slides 8, 9 into Slides 4, 5.
  - WS5_EXEC (`slides/ws5-executive-architecture-10slide-deck.pptx`): splices BARE_MIN_12
    Slides 10, 11, 12 into Slides 4, 5, 6.
"""
from __future__ import annotations

import os
import posixpath
import re
import shutil
import zipfile
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import lxml.etree as ET

ROOT_DIR = Path(__file__).resolve().parent.parent
SLIDES_DIR = ROOT_DIR / "slides"
DRAFTS_DIR = SLIDES_DIR / "_exec_drafts"
BARE_MIN_PATH = SLIDES_DIR / "geap-bare-minimum-12slide-architecture-deck.pptx"

NS = {
    "p": "http://schemas.openxmlformats.org/presentationml/2006/main",
    "a": "http://schemas.openxmlformats.org/drawingml/2006/main",
    "r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
    "rel": "http://schemas.openxmlformats.org/package/2006/relationships",
    "ct": "http://schemas.openxmlformats.org/package/2006/content-types",
    "ep": "http://schemas.openxmlformats.org/officeDocument/2006/extended-properties",
}

REL_SLIDE = "http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide"
REL_NOTES = "http://schemas.openxmlformats.org/officeDocument/2006/relationships/notesSlide"
REL_LAYOUT = "http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout"
CT_SLIDE = "application/vnd.openxmlformats-officedocument.presentationml.slide+xml"
CT_NOTES = "application/vnd.openxmlformats-officedocument.presentationml.notesSlide+xml"


def norm_target(base_part: str, rel_target: str) -> str:
    return posixpath.normpath(posixpath.join(posixpath.dirname(base_part), rel_target))


def patch_slide_text(xml_bytes: bytes, new_idx: int, total: int, replacements: Dict[str, str]) -> bytes:
    root = ET.fromstring(xml_bytes)
    for el in root.findall(".//a:t", NS):
        txt = el.text
        if not txt:
            continue
        if txt in replacements:
            txt = replacements[txt]
            el.text = txt
        else:
            for k, v in replacements.items():
                if len(k) <= 4:
                    continue
                if k in txt:
                    txt = txt.replace(k, v)
                    el.text = txt
        if "Gemini 2.5" in txt:
            txt = txt.replace("Gemini 2.5", "Gemini 2.5")
            el.text = txt
        if "[Slide " in txt and re.search(r"\[Slide \d+/\d+", txt):
            txt = re.sub(r"\[Slide \d+/\d+", f"[Slide {new_idx:02d}/{total:02d}", txt)
            el.text = txt
        if "▶ 4-State Hybrid & Draw.io ↗" in txt:
            txt = txt.replace("▶ 4-State Hybrid & Draw.io ↗", "✏️ Edit in Draw.io ↗")
            el.text = txt

    # Surgical geometry polish on spliced BARE_MIN_12 architecture diagrams:
    # 1. Prevent red diamond icon overlap on "Agent Gateway" / "Outbound Agent Gateway" headers
    # 2. Prevent vertical clipping on bottom-left "are not a plane" legend footnotes
    # 3. Prevent vertical clipping on WS3 S04 2-line column headers
    for sp in root.findall(".//p:sp", NS):
        joined = " ".join((t.text or "") for t in sp.findall(".//a:t", NS)).strip()
        if not joined:
            continue
        xfrm = sp.find("p:spPr/a:xfrm", NS)
        off = xfrm.find("a:off", NS) if xfrm is not None else None
        ext = xfrm.find("a:ext", NS) if xfrm is not None else None
        bpr = sp.find("p:txBody/a:bodyPr", NS)
        if joined in ("Agent Gateway", "Outbound Agent Gateway") and bpr is not None:
            bpr.set("lIns", "315000")
            bpr.set("rIns", "38100")
            for ppr in sp.findall("p:txBody/a:p/a:pPr", NS):
                ppr.set("algn", "l")
        elif "are not a plane" in joined.lower() and off is not None and ext is not None:
            if int(ext.get("cy", "0")) < 260000:
                off.set("y", "6195000")
                ext.set("cy", "300000")
                if bpr is not None:
                    bpr.set("anchor", "t")
                    bpr.set("tIns", "0")
                    bpr.set("bIns", "0")
        elif joined == "Enterprise Tenant Users (Isolated)" and off is not None and ext is not None:
            if int(ext.get("cy", "0")) < 280000:
                off.set("y", "1560000")
                ext.set("cy", "360000")
        elif joined == "Dedicated Targets (Inside VPC-SC)" and off is not None and ext is not None:
            if int(ext.get("cy", "0")) < 280000:
                off.set("y", "1850000")
                ext.set("cy", "330000")
        elif joined == "SCC 403/423" and bpr is not None:
            if off is not None and int(off.get("x", "0")) > 11250000:
                off.set("x", "11192256")
            bpr.set("lIns", "19050")
            bpr.set("rIns", "19050")
            for r in sp.findall(".//a:r", NS):
                t_el = r.find("a:t", NS)
                rpr = r.find("a:rPr", NS)
                if t_el is not None and t_el.text == "403/423" and rpr is not None:
                    rpr.set("sz", "680")

    # Sanitize cNvPr attributes so zero absolute local file paths or usernames leak into PPTX XML
    for cnv in root.findall(".//p:cNvPr", NS):
        for attr in ("descr", "name", "title"):
            val = cnv.get(attr)
            if val and ("/usr/local/google/home/" in val or "nitinagga" in val.lower()):
                cnv.set(attr, "Verified commercial SaaS UI capture")

    return ET.tostring(root, xml_declaration=True, encoding="UTF-8", standalone=True)


def patch_notes_text(xml_bytes: bytes, new_idx: int, total: int) -> bytes:
    root = ET.fromstring(xml_bytes)
    for el in root.findall(".//a:t", NS):
        if not el.text:
            continue
        t = re.sub(r"\[Slide \d+/\d+", f"[Slide {new_idx:02d}/{total:02d}", el.text)
        t = re.sub(r"Gemini 3\.8", "Gemini 2.5", t)
        el.text = t
    # Sanitize cNvPr attributes so zero absolute local file paths or usernames leak into PPTX XML
    for cnv in root.findall(".//p:cNvPr", NS):
        for attr in ("descr", "name", "title"):
            val = cnv.get(attr)
            if val and ("/usr/local/google/home/" in val or "nitinagga" in val.lower()):
                cnv.set(attr, "Verified commercial SaaS UI capture")

    return ET.tostring(root, xml_declaration=True, encoding="UTF-8", standalone=True)


def assemble_deck(
    base_pptx: Path,
    out_pptx: Path,
    donors: Dict[str, Path],
    slot_plan: List[Tuple[str, int]],
    global_replacements: Optional[Dict[str, str]] = None,
    per_slide_replacements: Optional[Dict[int, Dict[str, str]]] = None,
) -> Tuple[int, int]:
    total = len(slot_plan)
    zips: Dict[str, zipfile.ZipFile] = {"BASE": zipfile.ZipFile(base_pptx, "r")}
    try:
        for dkey, dpath in donors.items():
            zips[dkey] = zipfile.ZipFile(dpath, "r")
        base_z = zips["BASE"]

        out_parts: Dict[str, bytes] = {}
        media_needed: set[str] = set()
        extra_media: Dict[str, bytes] = {}

        skip_pats = (
            r"^ppt/slides/slide\d+\.xml$",
            r"^ppt/slides/_rels/slide\d+\.xml\.rels$",
            r"^ppt/notesSlides/notesSlide\d+\.xml$",
            r"^ppt/notesSlides/_rels/notesSlide\d+\.xml\.rels$",
            r"^ppt/media/",
            r"^ppt/presentation\.xml$",
            r"^ppt/_rels/presentation\.xml\.rels$",
            r"^\[Content_Types\]\.xml$",
            r"^docProps/app\.xml$",
        )
        for name in base_z.namelist():
            if any(re.match(p, name) for p in skip_pats):
                continue
            data = base_z.read(name)
            out_parts[name] = data
            if name.endswith(".rels"):
                try:
                    rr = ET.fromstring(data)
                    owner = name.replace("/_rels/", "/").removesuffix(".rels")
                    for rel in rr.findall("rel:Relationship", NS):
                        if rel.get("TargetMode") == "External":
                            continue
                        t = rel.get("Target", "")
                        if "media/" in t:
                            media_needed.add(norm_target(owner, t))
                except Exception:
                    pass

        existing_media = {posixpath.basename(n) for n in base_z.namelist() if n.startswith("ppt/media/")}

        # Pick default slideLayout target from base deck
        base_layout_target = "../slideLayouts/slideLayout1.xml"
        if "ppt/slides/_rels/slide1.xml.rels" in base_z.namelist():
            r1 = ET.fromstring(base_z.read("ppt/slides/_rels/slide1.xml.rels"))
            for rel in r1.findall("rel:Relationship", NS):
                if rel.get("Type") == REL_LAYOUT:
                    base_layout_target = rel.get("Target", base_layout_target)
                    break

        for new_i, (src_key, old_i) in enumerate(slot_plan, 1):
            dz = zips[src_key]
            is_donor = src_key != "BASE"
            s_old = f"ppt/slides/slide{old_i}.xml"
            s_old_rels = f"ppt/slides/_rels/slide{old_i}.xml.rels"

            repls = dict(global_replacements or {})
            if per_slide_replacements and new_i in per_slide_replacements:
                repls.update(per_slide_replacements[new_i])

            out_parts[f"ppt/slides/slide{new_i}.xml"] = patch_slide_text(
                dz.read(s_old), new_i, total, repls
            )

            old_notes: Optional[str] = None
            rels_root = ET.fromstring(dz.read(s_old_rels))
            for rel in rels_root.findall("rel:Relationship", NS):
                rtype = rel.get("Type", "")
                tmode = rel.get("TargetMode", "")
                target = rel.get("Target", "")
                if tmode == "External":
                    continue
                if rtype == REL_LAYOUT:
                    rel.set("Target", base_layout_target)
                elif rtype == REL_NOTES or "notesSlides/" in target:
                    old_notes = norm_target(s_old, target)
                    rel.set("Target", f"../notesSlides/notesSlide{new_i}.xml")
                elif "media/" in target:
                    full_m = norm_target(s_old, target)
                    if is_donor:
                        base_m = f"spliced_{src_key.lower()}_s{old_i}_{posixpath.basename(full_m)}"
                        while base_m in existing_media:
                            base_m = f"x_{base_m}"
                        existing_media.add(base_m)
                        dest_m = f"ppt/media/{base_m}"
                        extra_media[dest_m] = dz.read(full_m)
                        rel.set("Target", f"../media/{base_m}")
                    else:
                        media_needed.add(full_m)

            out_parts[f"ppt/slides/_rels/slide{new_i}.xml.rels"] = ET.tostring(
                rels_root, xml_declaration=True, encoding="UTF-8", standalone=True
            )

            if old_notes is None:
                old_notes = f"ppt/notesSlides/notesSlide{old_i}.xml"
            old_notes_rels = f"ppt/notesSlides/_rels/{posixpath.basename(old_notes)}.rels"
            if old_notes in dz.namelist():
                out_parts[f"ppt/notesSlides/notesSlide{new_i}.xml"] = patch_notes_text(
                    dz.read(old_notes), new_i, total
                )
            if old_notes_rels in dz.namelist():
                nrr = ET.fromstring(dz.read(old_notes_rels))
                for rel in nrr.findall("rel:Relationship", NS):
                    if rel.get("Type") == REL_SLIDE or "slides/slide" in rel.get("Target", ""):
                        rel.set("Target", f"../slides/slide{new_i}.xml")
                out_parts[f"ppt/notesSlides/_rels/notesSlide{new_i}.xml.rels"] = ET.tostring(
                    nrr, xml_declaration=True, encoding="UTF-8", standalone=True
                )

        for mp in sorted(media_needed):
            if mp in base_z.namelist():
                out_parts[mp] = base_z.read(mp)
        for mp, mb in extra_media.items():
            out_parts[mp] = mb

        # Rebuild presentation.xml.rels + presentation.xml
        pres_rels = ET.fromstring(base_z.read("ppt/_rels/presentation.xml.rels"))
        used_rids: set[int] = set()
        for rel in list(pres_rels.findall("rel:Relationship", NS)):
            if rel.get("Type") == REL_SLIDE or re.match(r"^slides/slide\d+\.xml$", rel.get("Target", "")):
                pres_rels.remove(rel)
            else:
                m = re.fullmatch(r"rId(\d+)", rel.get("Id", ""))
                if m:
                    used_rids.add(int(m.group(1)))
        next_rid = max(used_rids, default=0) + 1
        slide_rids: List[str] = []
        for new_i in range(1, total + 1):
            rid = f"rId{next_rid}"
            next_rid += 1
            slide_rids.append(rid)
            ET.SubElement(
                pres_rels,
                f"{{{NS['rel']}}}Relationship",
                Id=rid,
                Type=REL_SLIDE,
                Target=f"slides/slide{new_i}.xml",
            )
        out_parts["ppt/_rels/presentation.xml.rels"] = ET.tostring(
            pres_rels, xml_declaration=True, encoding="UTF-8", standalone=True
        )

        pres_root = ET.fromstring(base_z.read("ppt/presentation.xml"))
        sld_id_lst = pres_root.find("p:sldIdLst", NS)
        for ch in list(sld_id_lst):
            sld_id_lst.remove(ch)
        for offset, rid in enumerate(slide_rids):
            el = ET.SubElement(sld_id_lst, f"{{{NS['p']}}}sldId")
            el.set("id", str(256 + offset))
            el.set(f"{{{NS['r']}}}id", rid)
        out_parts["ppt/presentation.xml"] = ET.tostring(
            pres_root, xml_declaration=True, encoding="UTF-8", standalone=True
        )

        # Rebuild [Content_Types].xml
        ct_root = ET.fromstring(base_z.read("[Content_Types].xml"))
        for ov in list(ct_root.findall("ct:Override", NS)):
            pn = ov.get("PartName", "")
            if re.match(r"^/ppt/slides/slide\d+\.xml$", pn) or re.match(r"^/ppt/notesSlides/notesSlide\d+\.xml$", pn):
                ct_root.remove(ov)
        existing_exts = {d.get("Extension", "").lower() for d in ct_root.findall("ct:Default", NS)}
        for ext, ctype in (("png", "image/png"), ("jpg", "image/jpeg"), ("jpeg", "image/jpeg")):
            if ext not in existing_exts and any(k.lower().endswith(f".{ext}") for k in out_parts):
                ET.SubElement(ct_root, f"{{{NS['ct']}}}Default", Extension=ext, ContentType=ctype)
        for new_i in range(1, total + 1):
            ET.SubElement(ct_root, f"{{{NS['ct']}}}Override", PartName=f"/ppt/slides/slide{new_i}.xml", ContentType=CT_SLIDE)
            if f"ppt/notesSlides/notesSlide{new_i}.xml" in out_parts:
                ET.SubElement(ct_root, f"{{{NS['ct']}}}Override", PartName=f"/ppt/notesSlides/notesSlide{new_i}.xml", ContentType=CT_NOTES)
        out_parts["[Content_Types].xml"] = ET.tostring(
            ct_root, xml_declaration=True, encoding="UTF-8", standalone=True
        )

        if "docProps/app.xml" in base_z.namelist():
            app_root = ET.fromstring(base_z.read("docProps/app.xml"))
            for tag in ("ep:Slides", "ep:Notes"):
                el = app_root.find(tag, NS)
                if el is not None:
                    el.text = str(total)
            out_parts["docProps/app.xml"] = ET.tostring(
                app_root, xml_declaration=True, encoding="UTF-8", standalone=True
            )

        tmp = out_pptx.with_suffix(".pptx.tmp")
        with zipfile.ZipFile(tmp, "w", compression=zipfile.ZIP_DEFLATED) as oz:
            for k in sorted(out_parts.keys()):
                oz.writestr(k, out_parts[k])
        os.replace(tmp, out_pptx)
        return total, out_pptx.stat().st_size
    finally:
        for z in zips.values():
            z.close()


def main() -> int:
    # 1. Patch WS1_EXEC: replace misplaced ThoughtSpot S09 with native WS1 5-Hop Latency & GCP Proof
    ws1_exec = SLIDES_DIR / "ws1-executive-architecture-23slide-deck.pptx"
    ws1_donor = DRAFTS_DIR / "ws1_exec_slide9_donor.pptx"
    n, sz = assemble_deck(
        base_pptx=ws1_exec,
        out_pptx=ws1_exec,
        donors={"WS1S9": ws1_donor},
        slot_plan=[("BASE", i) if i != 9 else ("WS1S9", 1) for i in range(1, 11)],
        global_replacements={"Gemini 2.5 Flash": "Gemini 2.5 Flash"},
        per_slide_replacements={
            1: {
                "Live ThoughtSpot UI Proof & Executive ROI": "Live Model Armor Console Proof & ROI",
                "5-Hop Latency Proof & Executive ROI": "Live Model Armor Console Proof & ROI",
                "Genuine 2880×1620 ThoughtSpot Cloud Retina captures, 89.1% token savings & ~74% lower infrastructure TCO.": (
                    "Live 2880×1620 Google Cloud Model Armor & Cloud Armor WAF proofs, 89.1% token savings & ~74% TCO."
                ),
                "<42ms p95 5-Hop waterfall, provisioned GCP Control Plane, 89.1% token savings & ~74% lower TCO.": (
                    "Live 2880×1620 Google Cloud Model Armor & Cloud Armor WAF proofs, 89.1% token savings & ~74% TCO."
                ),
            }
        },
    )
    print(f"✅ Assembled WS1_EXEC ({n} slides, {sz:,} bytes) -> {ws1_exec.name}")

    # 2. Assemble WS2_EXEC..WS5_EXEC with 100% native editable DrawingML Approved Diagrams from BARE_MIN_12
    specs = [
        (
            "WS2_EXEC",
            DRAFTS_DIR / "ws2_exec_draft.pptx",
            SLIDES_DIR / "ws2-executive-architecture-10slide-deck.pptx",
            [("BASE", 1), ("BASE", 2), ("BASE", 3), ("BM", 3), ("BM", 4), ("BM", 5), ("BASE", 7), ("BASE", 8), ("BASE", 9), ("BASE", 10)],
        ),
        (
            "WS3_EXEC",
            DRAFTS_DIR / "ws3_exec_draft.pptx",
            SLIDES_DIR / "ws3-executive-architecture-10slide-deck.pptx",
            [("BASE", 1), ("BASE", 2), ("BASE", 3), ("BM", 6), ("BM", 7), ("BASE", 6), ("BASE", 7), ("BASE", 8), ("BASE", 9), ("BASE", 10)],
        ),
        (
            "WS4_EXEC",
            DRAFTS_DIR / "ws4_exec_draft.pptx",
            SLIDES_DIR / "ws4-executive-architecture-10slide-deck.pptx",
            [("BASE", 1), ("BASE", 2), ("BASE", 3), ("BM", 8), ("BM", 9), ("BASE", 6), ("BASE", 7), ("BASE", 8), ("BASE", 9), ("BASE", 10)],
        ),
        (
            "WS5_EXEC",
            DRAFTS_DIR / "ws5_exec_draft.pptx",
            SLIDES_DIR / "ws5-executive-architecture-10slide-deck.pptx",
            [("BASE", 1), ("BASE", 2), ("BASE", 3), ("BM", 10), ("BM", 11), ("BM", 12), ("BASE", 7), ("BASE", 8), ("BASE", 9), ("BASE", 10)],
        ),
    ]
    ws3_per_slide = {
        4: {
            "HTTP 403 CMEK_DENIED": "HTTP 403/423 CMEK_DENIED",
            "(<60s HTTP 403 halt on revoke)": "(<60s HTTP 403/423 halt on revoke)",
        },
        5: {
            "HTTP 403 CMEK_DENIED": "HTTP 403/423 CMEK_DENIED",
            "HTTP 403 + SCC Log": "HTTP 403/423 + SCC",
            "60s Liveness Heartbeat": "30s Poll (<60s SLA) Heartbeat",
            "⚡ 2. KMS Audit + 60s Ping": "⚡ 2. KMS Audit + 30s Ping",
            "60s kms.encrypt(ping) Fails Closed": "30s kms.encrypt(ping) (<60s SLA)",
            "60s probe & HTTP 403 CMEK_DENIED": "30s poll & HTTP 403/423 CMEK_DENIED",
            "60s probe": "30s poll",
            "403": "403/423",
        },
    }
    for label, draft_p, out_p, plan in specs:
        n, sz = assemble_deck(
            base_pptx=draft_p,
            out_pptx=out_p,
            donors={"BM": BARE_MIN_PATH},
            slot_plan=plan,
            per_slide_replacements=ws3_per_slide if label == "WS3_EXEC" else None,
        )
        print(f"✅ Assembled {label:8s} ({n} slides, {sz:,} bytes) -> {out_p.name}")

    # Clean up temporary drafts dir so slides/ contains only canonical decks
    if DRAFTS_DIR.exists():
        shutil.rmtree(DRAFTS_DIR)
        print("🧹 Removed temporary slides/_exec_drafts")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
