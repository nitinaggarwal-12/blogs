#!/usr/bin/env python3
"""
Unified Cross-App Feedback Engine (Python) — nitinagga@google.com
Strictly zero fake/synthetic/seed data. Only real user-submitted feedback is stored.

Persists to:
1. App-local JSON store (and SQLite table when provided)
2. Shared local cross-app ledger (/Users/nitinagga/.gemini/config/shared_app_feedback_ledger.json)
3. Live Google Sheet ("Unified App Feedback Ledger (nitinagga@google.com)",
   spreadsheetId: 1iPv52nblJISD7WNeEe3m4VovG_JS1qh79MYftMxrnhY, tab: FeedbackInbox)
   via OAuth 2.0 refresh_token with x-goog-user-project: ramp-portal-dev.
4. Google Drive API comment on the live Feedback Sheet mentioning nitinagga@google.com.
"""

from __future__ import annotations

import datetime
import hashlib
import json
import os
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

ADMIN_EMAIL = "nitinagga@google.com"
DEFAULT_SPREADSHEET_ID = "1iPv52nblJISD7WNeEe3m4VovG_JS1qh79MYftMxrnhY"
DEFAULT_SPREADSHEET_URL = f"https://docs.google.com/spreadsheets/d/{DEFAULT_SPREADSHEET_ID}/edit"
DEFAULT_SHEET_NAME = "FeedbackInbox"
QUOTA_PROJECT = "ramp-portal-dev"

CONFIG_PATH = Path("/Users/nitinagga/.gemini/config/unified_feedback_config.json")
SHARED_LEDGER_PATH = Path("/Users/nitinagga/.gemini/config/shared_app_feedback_ledger.json")

TOKEN_CANDIDATE_PATHS = [
    Path("/Users/nitinagga/Documents/gantry-pulse/.gsheet_oauth_token.json"),
    Path("/Users/nitinagga/Documents/blogs/.gsheet_oauth_token.json"),
    Path("/Users/nitinagga/Documents/PromptCanvas/.gsheet_oauth_token.json"),
]

VALID_CATEGORIES = [
    "Bug / Blocker",
    "Feature Request",
    "UI / UX Polish",
    "Data / Grounding",
    "General",
]

VALID_PRIORITIES = [
    "Low",
    "Medium",
    "High",
    "Critical",
]

VALID_STATUSES = [
    "New",
    "Triaged",
    "In Progress",
    "Resolved",
]

_TOKEN_CACHE: Dict[str, Any] = {"access_token": None, "expires_at": 0.0}
_SHEET_CACHE: Dict[str, Any] = {"items": None, "fetched_at": 0.0}


def load_config() -> Dict[str, Any]:
    if CONFIG_PATH.is_file():
        try:
            return json.loads(CONFIG_PATH.read_text(encoding="utf-8"))
        except Exception:
            pass
    return {
        "spreadsheetId": DEFAULT_SPREADSHEET_ID,
        "spreadsheetUrl": DEFAULT_SPREADSHEET_URL,
        "sheetName": DEFAULT_SHEET_NAME,
        "adminEmail": ADMIN_EMAIL,
        "quotaProject": QUOTA_PROJECT,
        "sharedLedgerPath": str(SHARED_LEDGER_PATH),
    }


def get_oauth_access_token() -> Optional[str]:
    now = time.time()
    if _TOKEN_CACHE["access_token"] and now < float(_TOKEN_CACHE["expires_at"]):
        return str(_TOKEN_CACHE["access_token"])

    for tf in TOKEN_CANDIDATE_PATHS:
        if tf.is_file():
            try:
                td = json.loads(tf.read_text(encoding="utf-8"))
                if td.get("refresh_token") and td.get("client_id") and td.get("client_secret"):
                    data = urllib.parse.urlencode(
                        {
                            "client_id": td["client_id"],
                            "client_secret": td["client_secret"],
                            "refresh_token": td["refresh_token"],
                            "grant_type": "refresh_token",
                        }
                    ).encode("utf-8")
                    req = urllib.request.Request(
                        "https://oauth2.googleapis.com/token", data=data, method="POST"
                    )
                    with urllib.request.urlopen(req, timeout=10) as resp:
                        payload = json.loads(resp.read().decode("utf-8"))
                    tok = payload.get("access_token")
                    if tok:
                        _TOKEN_CACHE["access_token"] = tok
                        _TOKEN_CACHE["expires_at"] = now + float(payload.get("expires_in", 3500)) - 120.0
                        return str(tok)
            except Exception:
                continue
    return None


def normalize_iap_email(raw_header: Optional[str]) -> str:
    if not raw_header:
        return ""
    val = str(raw_header).strip()
    if ":" in val:
        val = val.split(":", 1)[1].strip()
    return val.lower()


def verify_admin_access(
    headers: Optional[Dict[str, str]] = None,
    remote_addr: Optional[str] = None,
    query_params: Optional[Dict[str, Any]] = None,
) -> Tuple[bool, str, str]:
    """
    Verifies whether the caller is authorized to view/manage the Admin Feedback Inbox.
    1. Production BeyondCorp IAP: X-Goog-Authenticated-User-Email == nitinagga@google.com
    2. Explicit Admin Header/Param: X-Feedback-Admin-Email == nitinagga@google.com
    3. Localhost development fallback: 127.0.0.1 / ::1 / localhost
    Returns (is_authorized, resolved_email, auth_mode).
    """
    hdrs = {str(k).lower(): str(v) for k, v in (headers or {}).items() if v is not None}
    iap_email = normalize_iap_email(hdrs.get("x-goog-authenticated-user-email"))
    if iap_email:
        if iap_email == ADMIN_EMAIL:
            return True, iap_email, "iap_verified"
        return False, iap_email, "iap_denied_non_admin"

    admin_hdr = normalize_iap_email(hdrs.get("x-feedback-admin-email"))
    if admin_hdr == ADMIN_EMAIL:
        return True, ADMIN_EMAIL, "admin_header_verified"

    qp_admin = ""
    if query_params:
        raw_qp = query_params.get("adminEmail") or query_params.get("admin_email") or ""
        if isinstance(raw_qp, list):
            raw_qp = raw_qp[0] if raw_qp else ""
        qp_admin = normalize_iap_email(str(raw_qp))
    if qp_admin == ADMIN_EMAIL:
        return True, ADMIN_EMAIL, "admin_query_verified"

    host_hdr = hdrs.get("host", "").split(":")[0].strip().lower()
    addr = (remote_addr or "").strip().lower()
    if addr in ("127.0.0.1", "::1", "localhost", "::ffff:127.0.0.1") or host_hdr in ("localhost", "127.0.0.1"):
        return True, ADMIN_EMAIL, "localhost_dev_session"

    return False, iap_email or "anonymous", "unauthorized"


def _read_json_list(path: Path) -> List[Dict[str, Any]]:
    if not path.is_file():
        return []
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
        if isinstance(data, list):
            return [x for x in data if isinstance(x, dict) and x.get("id")]
        if isinstance(data, dict) and isinstance(data.get("items"), list):
            return [x for x in data["items"] if isinstance(x, dict) and x.get("id")]
    except Exception:
        pass
    return []


def _write_json_list(path: Path, items: List[Dict[str, Any]]) -> None:
    try:
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(items, indent=2, ensure_ascii=False), encoding="utf-8")
    except Exception:
        pass


def fetch_sheet_feedback_items(force_refresh: bool = False) -> List[Dict[str, Any]]:
    now = time.time()
    if not force_refresh and _SHEET_CACHE["items"] is not None and (now - float(_SHEET_CACHE["fetched_at"])) < 8.0:
        return list(_SHEET_CACHE["items"])

    cfg = load_config()
    spreadsheet_id = cfg.get("spreadsheetId") or DEFAULT_SPREADSHEET_ID
    sheet_name = cfg.get("sheetName") or DEFAULT_SHEET_NAME
    token = get_oauth_access_token()
    if not token or not spreadsheet_id:
        return []

    url = f"https://sheets.googleapis.com/v4/spreadsheets/{spreadsheet_id}/values/{urllib.parse.quote(sheet_name)}!A2:N1000"
    req = urllib.request.Request(
        url,
        headers={
            "Authorization": f"Bearer {token}",
            "x-goog-user-project": cfg.get("quotaProject") or QUOTA_PROJECT,
        },
        method="GET",
    )
    items: List[Dict[str, Any]] = []
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            payload = json.loads(resp.read().decode("utf-8"))
        rows = payload.get("values") or []
        for idx, row in enumerate(rows, start=2):
            if not row or not str(row[0]).strip():
                continue
            padded = list(row) + [""] * (14 - len(row))
            fb_id = str(padded[0]).strip()
            ts_est = str(padded[1]).strip()
            app_id = str(padded[2]).strip()
            app_name = str(padded[3]).strip()
            page_url = str(padded[4]).strip()
            category = str(padded[5]).strip() or "General"
            priority = str(padded[6]).strip() or "Medium"
            sender_email = str(padded[7]).strip()
            sender_name = str(padded[8]).strip()
            subject = str(padded[9]).strip()
            message = str(padded[10]).strip()
            meta_raw = str(padded[11]).strip()
            status = str(padded[12]).strip() or "New"
            updated_at = str(padded[13]).strip() or ts_est

            context_meta: Dict[str, Any] = {}
            if meta_raw:
                try:
                    parsed_meta = json.loads(meta_raw)
                    if isinstance(parsed_meta, dict):
                        context_meta = parsed_meta
                except Exception:
                    context_meta = {"raw": meta_raw}

            items.append(
                {
                    "id": fb_id,
                    "timestampEst": ts_est,
                    "createdAt": context_meta.get("createdAt") or updated_at or ts_est,
                    "appId": app_id,
                    "appName": app_name,
                    "pageUrl": page_url,
                    "category": category,
                    "priority": priority,
                    "senderEmail": sender_email,
                    "senderName": sender_name,
                    "recipientEmail": ADMIN_EMAIL,
                    "subject": subject,
                    "message": message,
                    "contextMeta": context_meta,
                    "status": status,
                    "updatedAt": updated_at,
                    "sheetRowNumber": idx,
                    "sourceStore": "google_sheet",
                }
            )
        _SHEET_CACHE["items"] = items
        _SHEET_CACHE["fetched_at"] = now
    except Exception:
        return _SHEET_CACHE.get("items") or []
    return items


def append_feedback_to_google_sheet(record: Dict[str, Any]) -> Tuple[bool, Optional[str], Optional[str]]:
    cfg = load_config()
    spreadsheet_id = cfg.get("spreadsheetId") or DEFAULT_SPREADSHEET_ID
    sheet_name = cfg.get("sheetName") or DEFAULT_SHEET_NAME
    token = get_oauth_access_token()
    if not token or not spreadsheet_id:
        return False, None, "missing_oauth_token"

    meta_obj = dict(record.get("contextMeta") or {})
    meta_obj["createdAt"] = record.get("createdAt", "")
    row_values = [
        [
            record.get("id", ""),
            record.get("timestampEst", ""),
            record.get("appId", ""),
            record.get("appName", ""),
            record.get("pageUrl", ""),
            record.get("category", "General"),
            record.get("priority", "Medium"),
            record.get("senderEmail", ""),
            record.get("senderName", ""),
            record.get("subject", ""),
            record.get("message", ""),
            json.dumps(meta_obj, ensure_ascii=False),
            record.get("status", "New"),
            record.get("updatedAt", ""),
        ]
    ]
    append_url = (
        f"https://sheets.googleapis.com/v4/spreadsheets/{spreadsheet_id}/values/"
        f"{urllib.parse.quote(sheet_name)}!A:N:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS"
    )
    req = urllib.request.Request(
        append_url,
        data=json.dumps({"values": row_values}).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
            "x-goog-user-project": cfg.get("quotaProject") or QUOTA_PROJECT,
        },
        method="POST",
    )
    sheet_ok = False
    comment_id: Optional[str] = None
    err_msg: Optional[str] = None
    try:
        with urllib.request.urlopen(req, timeout=12) as resp:
            json.loads(resp.read().decode("utf-8"))
        sheet_ok = True
        _SHEET_CACHE["items"] = None
    except Exception as exc:
        err_msg = str(exc)

    # Also post a real Google Drive comment on the ledger spreadsheet mentioning nitinagga@google.com
    try:
        comment_body = {
            "content": (
                f"New Feedback for +{ADMIN_EMAIL}\n"
                f"App: {record.get('appName')} ({record.get('appId')})\n"
                f"Category: {record.get('category')} | Priority: {record.get('priority')}\n"
                f"From: {record.get('senderName') or 'User'} <{record.get('senderEmail') or 'unspecified'}>\n"
                f"Page: {record.get('pageUrl')}\n\n"
                f"{record.get('message')}"
            )
        }
        req_comment = urllib.request.Request(
            f"https://www.googleapis.com/drive/v3/files/{spreadsheet_id}/comments?fields=id,createdTime",
            data=json.dumps(comment_body).encode("utf-8"),
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
                "x-goog-user-project": cfg.get("quotaProject") or QUOTA_PROJECT,
            },
            method="POST",
        )
        with urllib.request.urlopen(req_comment, timeout=8) as c_resp:
            c_data = json.loads(c_resp.read().decode("utf-8"))
            comment_id = c_data.get("id")
    except Exception:
        pass

    return sheet_ok, comment_id, err_msg


def submit_feedback(
    payload: Dict[str, Any],
    default_app_id: str,
    default_app_name: str,
    local_store_path: Optional[Path] = None,
    headers: Optional[Dict[str, str]] = None,
) -> Dict[str, Any]:
    """
    Validates and persists a real user feedback submission.
    """
    message = str(payload.get("message") or "").strip()
    if not message:
        raise ValueError("Feedback message is required and cannot be empty.")

    category = str(payload.get("category") or "General").strip()
    if category not in VALID_CATEGORIES:
        category = "General"

    priority = str(payload.get("priority") or "Medium").strip()
    if priority not in VALID_PRIORITIES:
        priority = "Medium"

    app_id = str(payload.get("appId") or default_app_id).strip()
    app_name = str(payload.get("appName") or default_app_name).strip()
    page_url = str(payload.get("pageUrl") or payload.get("route") or "/").strip()

    hdrs = {str(k).lower(): str(v) for k, v in (headers or {}).items() if v is not None}
    iap_email = normalize_iap_email(hdrs.get("x-goog-authenticated-user-email"))
    sender_email = str(payload.get("senderEmail") or iap_email or "").strip()
    sender_name = str(payload.get("senderName") or "").strip()
    if not sender_name and sender_email and "@" in sender_email:
        sender_name = sender_email.split("@")[0]

    now_utc = datetime.datetime.now(datetime.timezone.utc)
    est_tz = datetime.timezone(datetime.timedelta(hours=-4), name="EDT")
    now_est = now_utc.astimezone(est_tz)
    created_iso = now_utc.strftime("%Y-%m-%dT%H:%M:%SZ")
    timestamp_est = now_est.strftime("%Y-%m-%d %H:%M:%S ET")

    digest = hashlib.sha256(f"{app_id}:{created_iso}:{message}".encode("utf-8")).hexdigest()[:6].upper()
    fb_id = f"FB-{now_est.strftime('%Y%m%d-%H%M%S')}-{digest}"

    short_msg = " ".join(message.split())
    if len(short_msg) > 64:
        short_msg = short_msg[:61] + "..."
    subject = str(payload.get("subject") or f"[{app_name}] [{priority}] {category}: {short_msg}").strip()

    raw_meta = payload.get("contextMeta")
    context_meta: Dict[str, Any] = dict(raw_meta) if isinstance(raw_meta, dict) else {}
    context_meta["createdAt"] = created_iso
    if iap_email:
        context_meta["iapAuthenticatedEmail"] = iap_email

    record: Dict[str, Any] = {
        "id": fb_id,
        "createdAt": created_iso,
        "timestampEst": timestamp_est,
        "appId": app_id,
        "appName": app_name,
        "pageUrl": page_url,
        "category": category,
        "priority": priority,
        "senderEmail": sender_email or "anonymous",
        "senderName": sender_name or "Workspace User",
        "recipientEmail": ADMIN_EMAIL,
        "subject": subject,
        "message": message,
        "contextMeta": context_meta,
        "status": "New",
        "updatedAt": created_iso,
    }

    # 1. App-local JSON store
    persisted_local = False
    if local_store_path is not None:
        local_items = _read_json_list(local_store_path)
        local_items.insert(0, record)
        _write_json_list(local_store_path, local_items)
        persisted_local = True

    # 2. Shared local cross-app ledger
    shared_items = _read_json_list(SHARED_LEDGER_PATH)
    shared_items = [x for x in shared_items if x.get("id") != fb_id]
    shared_items.insert(0, record)
    _write_json_list(SHARED_LEDGER_PATH, shared_items)

    # 3. Live Google Sheet + Drive comment
    sheet_ok, drive_comment_id, sheet_err = append_feedback_to_google_sheet(record)

    cfg = load_config()
    email_body = (
        f"App: {app_name} ({app_id})\n"
        f"Page / Route: {page_url}\n"
        f"Category: {category}\n"
        f"Priority: {priority}\n"
        f"Feedback ID: {fb_id}\n"
        f"Submitted At: {timestamp_est}\n\n"
        f"Message:\n{message}\n"
    )
    gmail_compose_url = (
        "https://mail.google.com/mail/?view=cm&fs=1"
        f"&to={urllib.parse.quote(ADMIN_EMAIL)}"
        f"&su={urllib.parse.quote(subject)}"
        f"&body={urllib.parse.quote(email_body)}"
    )
    mailto_url = (
        f"mailto:{ADMIN_EMAIL}"
        f"?subject={urllib.parse.quote(subject)}"
        f"&body={urllib.parse.quote(email_body)}"
    )

    return {
        "ok": True,
        "feedback": record,
        "delivery": {
            "recipientEmail": ADMIN_EMAIL,
            "persistedToLocalStore": persisted_local,
            "persistedToSharedLedger": True,
            "persistedToGoogleSheet": sheet_ok,
            "spreadsheetId": cfg.get("spreadsheetId") or DEFAULT_SPREADSHEET_ID,
            "spreadsheetUrl": cfg.get("spreadsheetUrl") or DEFAULT_SPREADSHEET_URL,
            "driveCommentNotificationId": drive_comment_id,
            "sheetError": sheet_err,
            "gmailComposeUrl": gmail_compose_url,
            "mailtoUrl": mailto_url,
        },
    }


def list_feedback(
    default_app_id: str,
    local_store_path: Optional[Path] = None,
    scope: str = "all",
    category_filter: str = "",
    priority_filter: str = "",
    status_filter: str = "",
    search_query: str = "",
    force_sheet_refresh: bool = False,
) -> Dict[str, Any]:
    """
    Returns deduplicated real feedback messages across the live Google Sheet,
    shared cross-app ledger, and local app store.
    """
    merged_by_id: Dict[str, Dict[str, Any]] = {}

    # 1. Local store
    if local_store_path is not None:
        for item in _read_json_list(local_store_path):
            fid = str(item.get("id") or "").strip()
            if fid:
                merged_by_id[fid] = dict(item)

    # 2. Shared cross-app ledger
    for item in _read_json_list(SHARED_LEDGER_PATH):
        fid = str(item.get("id") or "").strip()
        if fid:
            merged_by_id[fid] = dict(item)

    # 3. Live Google Sheet
    sheet_items = fetch_sheet_feedback_items(force_refresh=force_sheet_refresh)
    for item in sheet_items:
        fid = str(item.get("id") or "").strip()
        if fid:
            if fid in merged_by_id:
                # Preserve more recent status updates from local/shared if updatedAt is newer
                existing = merged_by_id[fid]
                if str(existing.get("updatedAt") or "") > str(item.get("updatedAt") or ""):
                    continue
            merged_by_id[fid] = dict(item)

    all_items = list(merged_by_id.values())
    all_items.sort(key=lambda x: str(x.get("createdAt") or x.get("timestampEst") or ""), reverse=True)

    # Compute summary counts before filtering
    app_counts: Dict[str, int] = {}
    status_counts: Dict[str, int] = {"New": 0, "Triaged": 0, "In Progress": 0, "Resolved": 0}
    priority_counts: Dict[str, int] = {"Critical": 0, "High": 0, "Medium": 0, "Low": 0}
    for it in all_items:
        aid = str(it.get("appId") or "unknown")
        app_counts[aid] = app_counts.get(aid, 0) + 1
        st = str(it.get("status") or "New")
        status_counts[st] = status_counts.get(st, 0) + 1
        pr = str(it.get("priority") or "Medium")
        priority_counts[pr] = priority_counts.get(pr, 0) + 1

    filtered = all_items
    if scope == "app" and default_app_id:
        filtered = [x for x in filtered if str(x.get("appId") or "").lower() == default_app_id.lower()]
    elif scope and scope not in ("all", "app"):
        filtered = [x for x in filtered if str(x.get("appId") or "").lower() == scope.lower()]

    if category_filter and category_filter.lower() != "all":
        filtered = [x for x in filtered if str(x.get("category") or "").lower() == category_filter.lower()]

    if priority_filter and priority_filter.lower() != "all":
        filtered = [x for x in filtered if str(x.get("priority") or "").lower() == priority_filter.lower()]

    if status_filter and status_filter.lower() != "all":
        filtered = [x for x in filtered if str(x.get("status") or "").lower() == status_filter.lower()]

    if search_query:
        q = search_query.strip().lower()
        filtered = [
            x
            for x in filtered
            if q in str(x.get("message") or "").lower()
            or q in str(x.get("subject") or "").lower()
            or q in str(x.get("senderEmail") or "").lower()
            or q in str(x.get("senderName") or "").lower()
            or q in str(x.get("pageUrl") or "").lower()
            or q in str(x.get("id") or "").lower()
            or q in str(x.get("appName") or "").lower()
        ]

    cfg = load_config()
    return {
        "ok": True,
        "adminEmail": ADMIN_EMAIL,
        "currentAppId": default_app_id,
        "scope": scope,
        "totalAllApps": len(all_items),
        "totalCurrentApp": sum(1 for x in all_items if str(x.get("appId") or "").lower() == default_app_id.lower()),
        "filteredCount": len(filtered),
        "appCounts": app_counts,
        "statusCounts": status_counts,
        "priorityCounts": priority_counts,
        "spreadsheetId": cfg.get("spreadsheetId") or DEFAULT_SPREADSHEET_ID,
        "spreadsheetUrl": cfg.get("spreadsheetUrl") or DEFAULT_SPREADSHEET_URL,
        "messages": filtered,
    }


def update_feedback_status(
    feedback_id: str,
    new_status: Optional[str] = None,
    delete: bool = False,
    local_store_path: Optional[Path] = None,
) -> Dict[str, Any]:
    """
    Updates the status of a feedback item (or deletes it) across local store,
    shared ledger, and the live Google Sheet.
    """
    fid = str(feedback_id or "").strip()
    if not fid:
        raise ValueError("feedback_id is required.")

    now_iso = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    # 1. Update local store
    if local_store_path is not None and local_store_path.is_file():
        local_items = _read_json_list(local_store_path)
        if delete:
            local_items = [x for x in local_items if x.get("id") != fid]
        else:
            for x in local_items:
                if x.get("id") == fid and new_status in VALID_STATUSES:
                    x["status"] = new_status
                    x["updatedAt"] = now_iso
        _write_json_list(local_store_path, local_items)

    # 2. Update shared ledger
    shared_items = _read_json_list(SHARED_LEDGER_PATH)
    updated_record: Optional[Dict[str, Any]] = None
    if delete:
        shared_items = [x for x in shared_items if x.get("id") != fid]
    else:
        for x in shared_items:
            if x.get("id") == fid:
                if new_status in VALID_STATUSES:
                    x["status"] = new_status
                    x["updatedAt"] = now_iso
                updated_record = dict(x)
    _write_json_list(SHARED_LEDGER_PATH, shared_items)

    # 3. Update live Google Sheet row if present
    cfg = load_config()
    spreadsheet_id = cfg.get("spreadsheetId") or DEFAULT_SPREADSHEET_ID
    sheet_name = cfg.get("sheetName") or DEFAULT_SHEET_NAME
    token = get_oauth_access_token()
    sheet_updated = False
    if token and spreadsheet_id:
        try:
            sheet_items = fetch_sheet_feedback_items(force_refresh=True)
            target_row = next((it.get("sheetRowNumber") for it in sheet_items if it.get("id") == fid), None)
            if target_row:
                if delete:
                    # Clear the row
                    clear_url = (
                        f"https://sheets.googleapis.com/v4/spreadsheets/{spreadsheet_id}/values/"
                        f"{urllib.parse.quote(sheet_name)}!A{target_row}:N{target_row}:clear"
                    )
                    req_clr = urllib.request.Request(
                        clear_url,
                        data=b"{}",
                        headers={
                            "Authorization": f"Bearer {token}",
                            "Content-Type": "application/json",
                            "x-goog-user-project": cfg.get("quotaProject") or QUOTA_PROJECT,
                        },
                        method="POST",
                    )
                    with urllib.request.urlopen(req_clr, timeout=10) as _:
                        pass
                    sheet_updated = True
                elif new_status in VALID_STATUSES:
                    upd_url = (
                        f"https://sheets.googleapis.com/v4/spreadsheets/{spreadsheet_id}/values/"
                        f"{urllib.parse.quote(sheet_name)}!M{target_row}:N{target_row}?valueInputOption=USER_ENTERED"
                    )
                    req_upd = urllib.request.Request(
                        upd_url,
                        data=json.dumps({"values": [[new_status, now_iso]]}).encode("utf-8"),
                        headers={
                            "Authorization": f"Bearer {token}",
                            "Content-Type": "application/json",
                            "x-goog-user-project": cfg.get("quotaProject") or QUOTA_PROJECT,
                        },
                        method="PUT",
                    )
                    with urllib.request.urlopen(req_upd, timeout=10) as _:
                        pass
                    sheet_updated = True
                _SHEET_CACHE["items"] = None
        except Exception:
            pass

    return {
        "ok": True,
        "id": fid,
        "deleted": delete,
        "status": new_status,
        "updatedAt": now_iso,
        "sheetUpdated": sheet_updated,
        "feedback": updated_record,
    }


if __name__ == "__main__":
    import argparse
    import sys

    parser = argparse.ArgumentParser(description="Unified Cross-App Feedback Engine CLI")
    parser.add_argument("action", choices=["submit", "list", "update"])
    parser.add_argument("--app-id", default="gantry-pulse")
    parser.add_argument("--app-name", default="GantryPulse")
    parser.add_argument("--local-store", default="")
    parser.add_argument("--payload-json", default="{}")
    parser.add_argument("--headers-json", default="{}")
    parser.add_argument("--scope", default="all")
    parser.add_argument("--category", default="")
    parser.add_argument("--priority", default="")
    parser.add_argument("--status", default="")
    parser.add_argument("--search", default="")
    parser.add_argument("--feedback-id", default="")
    parser.add_argument("--delete", action="store_true")
    args = parser.parse_args()

    local_path = Path(args.local_store) if args.local_store else None
    try:
        if args.action == "submit":
            payload = json.loads(args.payload_json)
            headers = json.loads(args.headers_json)
            res = submit_feedback(payload, args.app_id, args.app_name, local_path, headers)
            print(json.dumps(res, ensure_ascii=False))
        elif args.action == "list":
            res = list_feedback(
                default_app_id=args.app_id,
                local_store_path=local_path,
                scope=args.scope,
                category_filter=args.category,
                priority_filter=args.priority,
                status_filter=args.status,
                search_query=args.search,
                force_sheet_refresh=True,
            )
            print(json.dumps(res, ensure_ascii=False))
        elif args.action == "update":
            res = update_feedback_status(
                feedback_id=args.feedback_id,
                new_status=args.status or None,
                delete=args.delete,
                local_store_path=local_path,
            )
            print(json.dumps(res, ensure_ascii=False))
    except Exception as exc:
        print(json.dumps({"ok": False, "error": str(exc)}), file=sys.stdout)
        sys.exit(1)
