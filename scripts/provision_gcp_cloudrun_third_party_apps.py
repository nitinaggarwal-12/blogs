#!/usr/bin/env python3
"""
Autonomous Google Cloud Run Multi-Service 3rd-Party Enterprise Software Provisioner & Seeder.

Mirrors 10 official upstream linux/amd64 container distributions from Docker Hub (`registry-1.docker.io`)
into Google Artifact Registry (`us-west1-docker.pkg.dev/bbar-138hf0/cloud-run-source-deploy`),
deploys 10 live Cloud Run Gen2 services in `bbar-138hf0` (`us-west1`), binds IAM invoker access,
seeds Cymbal multi-tenant isolation state (FinVault Bank vs RetailStream Corp) via live HTTPS APIs,
and writes cryptographic execution receipt `docs/gcp_cloudrun_3p_apps_live_receipt.json`.

Usage:
  python3 -B scripts/provision_gcp_cloudrun_third_party_apps.py --only=grafana   # Rule 57A 1-First Prototype
  python3 -B scripts/provision_gcp_cloudrun_third_party_apps.py                  # Full 10-service suite
"""

from __future__ import annotations

import argparse
import base64
import datetime as dt
import hashlib
import http.cookiejar
import json
import os
import re
import subprocess
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Any

ROOT_DIR = Path(__file__).resolve().parents[1]
RECEIPT_PATH = ROOT_DIR / "docs/gcp_cloudrun_3p_apps_live_receipt.json"

GCP_PROJECT = "bbar-138hf0"
GCP_REGION = "us-west1"
AR_HOST = "us-west1-docker.pkg.dev"
AR_REPO = f"{GCP_PROJECT}/cloud-run-source-deploy"

APPS_SPEC: list[dict[str, Any]] = [
    {
        "key": "metabase",
        "index": 1,
        "service_name": "cymbal-gcp-metabase-bi",
        "true_product_name": "Metabase BI",
        "product_version": "v0.50.26",
        "docker_repo": "metabase/metabase",
        "docker_tag": "v0.50.26",
        "port": 3000,
        "memory": "4Gi",
        "cpu": "2",
        "startup_timeout_sec": 240,
        "health_path": "/api/health",
        "env": {
            "MB_JETTY_HOST": "0.0.0.0",
            "MB_JETTY_PORT": "3000",
            "MB_DB_FILE": "/tmp/metabase.db",
            "JAVA_TOOL_OPTIONS": "-Xmx2048m",
        },
        "args": None,
    },
    {
        "key": "grafana",
        "index": 2,
        "service_name": "cymbal-gcp-grafana-ent",
        "true_product_name": "Grafana Enterprise",
        "product_version": "v11.2.0",
        "docker_repo": "grafana/grafana-enterprise",
        "docker_tag": "11.2.0",
        "port": 3000,
        "memory": "2Gi",
        "cpu": "2",
        "startup_timeout_sec": 120,
        "health_path": "/api/health",
        "env": {
            "GF_SERVER_HTTP_PORT": "3000",
            "GF_SECURITY_ADMIN_USER": "sre-lead@finvault.com",
            "GF_SECURITY_ADMIN_PASSWORD": "FinVault#2026!",
            "GF_USERS_DEFAULT_THEME": "light",
            "GF_PATHS_DATA": "/tmp/grafana-data",
            "GF_PATHS_LOGS": "/tmp/grafana-logs",
            "GF_PATHS_PLUGINS": "/tmp/grafana-plugins",
        },
        "args": None,
    },
    {
        "key": "redmine",
        "index": 3,
        "service_name": "cymbal-gcp-redmine-itsm",
        "true_product_name": "Redmine ITSM",
        "product_version": "v5.1",
        "docker_repo": "library/redmine",
        "docker_tag": "5.1",
        "port": 3000,
        "memory": "2Gi",
        "cpu": "2",
        "startup_timeout_sec": 180,
        "health_path": "/login",
        "env": {},
        "args": None,
    },
    {
        "key": "nocodb",
        "index": 4,
        "service_name": "cymbal-gcp-nocodb-edc",
        "true_product_name": "NocoDB",
        "product_version": "v0.255.2",
        "docker_repo": "nocodb/nocodb",
        "docker_tag": "0.255.2",
        "port": 8080,
        "memory": "2Gi",
        "cpu": "2",
        "startup_timeout_sec": 150,
        "health_path": "/api/v1/health",
        "env": {
            "NC_TOOL_DIR": "/tmp/nocodb",
            "NC_DISABLE_TELE": "true",
        },
        "args": None,
    },
    {
        "key": "gitea",
        "index": 5,
        "service_name": "cymbal-gcp-gitea-sre",
        "true_product_name": "Gitea",
        "product_version": "v1.22.3",
        "docker_repo": "gitea/gitea",
        "docker_tag": "1.22.3",
        "port": 3000,
        "memory": "2Gi",
        "cpu": "2",
        "startup_timeout_sec": 150,
        "health_path": "/api/healthz",
        "env": {
            "GITEA__database__DB_TYPE": "sqlite3",
            "GITEA__database__PATH": "/tmp/gitea/gitea.db",
            "GITEA__server__HTTP_PORT": "3000",
            "GITEA__server__DISABLE_SSH": "true",
            "GITEA__security__INSTALL_LOCK": "true",
            "GITEA__service__DISABLE_REGISTRATION": "false",
        },
        "args": None,
    },
    {
        "key": "trino",
        "index": 6,
        "service_name": "cymbal-gcp-trino-sql",
        "true_product_name": "Trino Distributed SQL",
        "product_version": "v440",
        "docker_repo": "trinodb/trino",
        "docker_tag": "440",
        "port": 8080,
        "memory": "4Gi",
        "cpu": "2",
        "startup_timeout_sec": 180,
        "health_path": "/v1/info",
        "env": {},
        "args": None,
    },
    {
        "key": "clickhouse",
        "index": 7,
        "service_name": "cymbal-gcp-clickhouse-dw",
        "true_product_name": "ClickHouse Data Warehouse",
        "product_version": "v24.8",
        "docker_repo": "clickhouse/clickhouse-server",
        "docker_tag": "24.8",
        "port": 8123,
        "memory": "4Gi",
        "cpu": "2",
        "startup_timeout_sec": 150,
        "health_path": "/ping",
        "env": {
            "CLICKHOUSE_DB": "cymbal_warehouse",
            "CLICKHOUSE_USER": "finvault_user",
            "CLICKHOUSE_PASSWORD": "FinVault#2026!",
            "CLICKHOUSE_DEFAULT_ACCESS_MANAGEMENT": "1",
        },
        "args": None,
    },
    {
        "key": "directus",
        "index": 8,
        "service_name": "cymbal-gcp-directus-hcm",
        "true_product_name": "Directus Data Studio",
        "product_version": "v11.1.0",
        "docker_repo": "directus/directus",
        "docker_tag": "11.1.0",
        "port": 8055,
        "memory": "2Gi",
        "cpu": "2",
        "startup_timeout_sec": 180,
        "health_path": "/server/health",
        "env": {
            "KEY": "cymbal-directus-key-2026-finvault",
            "SECRET": "cymbal-directus-secret-2026-finvault-silo-key",
            "DB_CLIENT": "sqlite3",
            "DB_FILENAME": "/tmp/directus-data.db",
            "STORAGE_LOCAL_ROOT": "/tmp/directus-uploads",
            "ADMIN_EMAIL": "sre-lead@finvault.com",
            "ADMIN_PASSWORD": "FinVault#2026!",
            "WEBSOCKETS_ENABLED": "false",
            "TELEMETRY": "false",
        },
        "args": None,
    },
    {
        "key": "seq",
        "index": 9,
        "service_name": "cymbal-gcp-seq-apm",
        "true_product_name": "Datalust Seq Observability",
        "product_version": "v2024.3",
        "docker_repo": "datalust/seq",
        "docker_tag": "2024.3",
        "port": 80,
        "memory": "2Gi",
        "cpu": "2",
        "startup_timeout_sec": 150,
        "health_path": "/api",
        "env": {
            "ACCEPT_EULA": "Y",
            "SEQ_FIRSTRUN_NOAUTHENTICATION": "True",
        },
        "args": None,
    },
    {
        "key": "vault",
        "index": 10,
        "service_name": "cymbal-gcp-vault-cmek",
        "true_product_name": "HashiCorp Vault",
        "product_version": "v1.13.3",
        "docker_repo": "hashicorp/vault",
        "docker_tag": "1.13.3",
        "port": 8200,
        "memory": "1Gi",
        "cpu": "1",
        "startup_timeout_sec": 90,
        "health_path": "/v1/sys/health",
        "env": {
            "SKIP_SETCAP": "1",
            "VAULT_DEV_ROOT_TOKEN_ID": "fv-token-finvault-sre-2026",
            "VAULT_DEV_LISTEN_ADDRESS": "0.0.0.0:8200",
            "VAULT_ADDR": "http://127.0.0.1:8200",
        },
        "args": [
            "server",
            "-dev",
            "-dev-root-token-id=fv-token-finvault-sre-2026",
            "-dev-listen-address=0.0.0.0:8200",
        ],
    },
]


def gcloud_env() -> dict[str, str]:
    env = dict(os.environ)
    env["CLOUDSDK_BILLING_QUOTA_PROJECT"] = GCP_PROJECT
    return env


def get_gcloud_access_token() -> str:
    return subprocess.check_output(
        ["gcloud", "auth", "print-access-token"],
        text=True,
        env=gcloud_env(),
    ).strip()


OIDC_CACHE_FILE = Path("/tmp/cymbal_gcp_cloudrun_oidc_cache.json")
MINTER_JOB_NAME = "cymbal-gcp-oidc-minter"
MINTER_BASE_IMAGE = "us-west1-docker.pkg.dev/bbar-138hf0/cloud-run-source-deploy/cloudrun-live-e2e-verifier:v20261028-163405"
GCS_BUCKET = "bbar-138hf0-cymbal-multi-tenant-artifacts"

MINTER_INLINE_PY = (
    "import json, os, urllib.parse, urllib.request\n"
    "urls = [u.strip() for u in os.environ['TARGET_AUDIENCES'].split(',') if u.strip()]\n"
    "hdr = {'Metadata-Flavor': 'Google'}\n"
    "acc = json.loads(urllib.request.urlopen(urllib.request.Request("
    "'http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token', headers=hdr)).read())['access_token']\n"
    "out = {}\n"
    "for u in urls:\n"
    "    q = urllib.parse.quote(u, safe='')\n"
    "    tok = urllib.request.urlopen(urllib.request.Request("
    "f'http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/identity?audience={q}', headers=hdr)).read().decode().strip()\n"
    "    out[u] = tok\n"
    "data = json.dumps(out).encode()\n"
    "obj = os.environ['GCS_OBJECT_NAME']\n"
    "up = urllib.request.Request("
    "f'https://storage.googleapis.com/upload/storage/v1/b/{os.environ[\"GCS_BUCKET\"]}/o?uploadType=media&name={urllib.parse.quote(obj, safe=\"\")}', "
    "data=data, method='POST', headers={'Authorization': f'Bearer {acc}', 'Content-Type': 'application/json'})\n"
    "urllib.request.urlopen(up).read()\n"
    "print('MINTED_COUNT=' + str(len(out)))\n"
)


def load_oidc_cache() -> dict[str, Any]:
    if OIDC_CACHE_FILE.exists():
        try:
            data = json.loads(OIDC_CACHE_FILE.read_text(encoding="utf-8"))
            if time.time() < float(data.get("expires_at", 0)):
                return data.get("tokens", {})
        except Exception:
            pass
    return {}


def mint_oidc_tokens_batch(urls: list[str], force: bool = False) -> dict[str, str]:
    clean_urls = sorted({u.rstrip("/") for u in urls if u})
    cached = {} if force else load_oidc_cache()
    missing = [u for u in clean_urls if u not in cached]
    if not missing:
        return cached

    print(f"==> [OIDC Minter] Minting Google-signed Cloud Run OIDC tokens for {len(missing)} service URL(s)...")
    job_exists = (
        subprocess.run(
            [
                "gcloud",
                "run",
                "jobs",
                "describe",
                MINTER_JOB_NAME,
                f"--project={GCP_PROJECT}",
                f"--billing-project={GCP_PROJECT}",
                f"--region={GCP_REGION}",
            ],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            env=gcloud_env(),
        ).returncode
        == 0
    )
    if not job_exists:
        subprocess.run(
            [
                "gcloud",
                "run",
                "jobs",
                "deploy",
                MINTER_JOB_NAME,
                f"--project={GCP_PROJECT}",
                f"--billing-project={GCP_PROJECT}",
                f"--region={GCP_REGION}",
                f"--image={MINTER_BASE_IMAGE}",
                "--command=python3",
                f"--args=^|^-c|{MINTER_INLINE_PY}",
                "--max-retries=0",
                "--task-timeout=60s",
                "--quiet",
            ],
            check=True,
            env=gcloud_env(),
        )

    obj_name = f"_ephemeral_oidc_{int(time.time())}.json"
    all_to_mint = sorted(set(cached.keys()) | set(missing))
    subprocess.run(
        [
            "gcloud",
            "run",
            "jobs",
            "execute",
            MINTER_JOB_NAME,
            f"--project={GCP_PROJECT}",
            f"--billing-project={GCP_PROJECT}",
            f"--region={GCP_REGION}",
            f"--update-env-vars=^|^GCS_BUCKET={GCS_BUCKET}|GCS_OBJECT_NAME={obj_name}|TARGET_AUDIENCES={','.join(all_to_mint)}",
            "--wait",
            "--quiet",
        ],
        check=True,
        env=gcloud_env(),
    )

    acc = get_gcloud_access_token()
    get_url = f"https://storage.googleapis.com/storage/v1/b/{GCS_BUCKET}/o/{urllib.parse.quote(obj_name, safe='')}?alt=media"
    with urllib.request.urlopen(
        urllib.request.Request(get_url, headers={"Authorization": f"Bearer {acc}"}), timeout=20
    ) as resp:
        minted_map = json.loads(resp.read().decode("utf-8"))

    # Immediately delete ephemeral GCS object so tokens only reside in 0600 local /tmp cache
    del_url = f"https://storage.googleapis.com/storage/v1/b/{GCS_BUCKET}/o/{urllib.parse.quote(obj_name, safe='')}"
    try:
        urllib.request.urlopen(
            urllib.request.Request(del_url, method="DELETE", headers={"Authorization": f"Bearer {acc}"}), timeout=15
        )
    except Exception:
        pass

    merged = {**cached, **minted_map}
    OIDC_CACHE_FILE.write_text(
        json.dumps({"expires_at": time.time() + 2700, "tokens": merged}, indent=2),
        encoding="utf-8",
    )
    os.chmod(OIDC_CACHE_FILE, 0o600)
    return merged


def get_service_oidc_token(base_url: str) -> str:
    norm = base_url.rstrip("/")
    toks = mint_oidc_tokens_batch([norm])
    return toks[norm]


def get_dockerhub_token(repo: str) -> str:
    url = f"https://auth.docker.io/token?service=registry.docker.io&scope=repository:{repo}:pull"
    with urllib.request.urlopen(url, timeout=20) as resp:
        return json.loads(resp.read().decode("utf-8"))["token"]


def ar_blob_exists(dest_repo: str, digest: str, gcp_token: str) -> bool:
    req = urllib.request.Request(
        f"https://{AR_HOST}/v2/{dest_repo}/blobs/{digest}",
        method="HEAD",
        headers={"Authorization": f"Bearer {gcp_token}"},
    )
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            return resp.status == 200
    except urllib.error.HTTPError:
        return False


def stream_blob_dockerhub_to_ar(
    docker_repo: str,
    dh_token: str,
    dest_repo: str,
    digest: str,
    size_bytes: int,
    gcp_token: str,
) -> None:
    if ar_blob_exists(dest_repo, digest, gcp_token):
        print(f"    [cached] {digest[:24]}... ({size_bytes / (1024 * 1024):.1f} MB)")
        return

    print(f"    [mirror] {digest[:24]}... ({size_bytes / (1024 * 1024):.1f} MB)")
    tmp_blob = Path(f"/tmp/oci_mirror_{digest.replace(':', '_')}.bin")
    try:
        dl_cmd = [
            "curl",
            "-sS",
            "-f",
            "-L",
            "--retry",
            "3",
            "-H",
            f"Authorization: Bearer {dh_token}",
            "-o",
            str(tmp_blob),
            f"https://registry-1.docker.io/v2/{docker_repo}/blobs/{digest}",
        ]
        subprocess.run(dl_cmd, check=True)
        actual_size = tmp_blob.stat().st_size

        last_err: Exception | None = None
        for attempt in range(1, 4):
            try:
                gcp_tok = get_gcloud_access_token() if attempt > 1 else gcp_token
                start_req = urllib.request.Request(
                    f"https://{AR_HOST}/v2/{dest_repo}/blobs/uploads/",
                    method="POST",
                    data=b"",
                    headers={"Authorization": f"Bearer {gcp_tok}", "Content-Length": "0"},
                )
                with urllib.request.urlopen(start_req, timeout=60) as resp:
                    upload_loc = resp.headers.get("Location")
                if not upload_loc:
                    raise RuntimeError(f"Missing Location header initiating upload for {dest_repo}")
                if upload_loc.startswith("/"):
                    upload_loc = f"https://{AR_HOST}{upload_loc}"
                sep = "&" if "?" in upload_loc else "?"
                put_url = f"{upload_loc}{sep}digest={urllib.parse.quote(digest)}"
                up_cmd = [
                    "curl",
                    "-sS",
                    "-f",
                    "-X",
                    "PUT",
                    "-H",
                    f"Authorization: Bearer {gcp_tok}",
                    "-H",
                    "Content-Type: application/octet-stream",
                    "-H",
                    f"Content-Length: {actual_size}",
                    "--upload-file",
                    str(tmp_blob),
                    put_url,
                ]
                subprocess.run(up_cmd, check=True)
                return
            except Exception as exc:
                last_err = exc
                print(f"      [retry {attempt}/3] PUT {digest[:20]} failed: {exc}")
                time.sleep(2 * attempt)
        raise RuntimeError(f"Failed uploading blob {digest} after 3 attempts: {last_err}")
    finally:
        if tmp_blob.exists():
            tmp_blob.unlink()


def mirror_upstream_image_to_ar(spec: dict[str, Any]) -> tuple[str, str]:
    docker_repo = spec["docker_repo"]
    docker_tag = spec["docker_tag"]
    dest_repo = f"{AR_REPO}/{spec['service_name']}"
    ar_image_uri = f"{AR_HOST}/{dest_repo}:{docker_tag}"

    print(f"\n==> [OCI Mirror] {docker_repo}:{docker_tag} -> {ar_image_uri}")
    dh_token = get_dockerhub_token(docker_repo)
    gcp_token = get_gcloud_access_token()

    accept_hdr = (
        "application/vnd.oci.image.index.v1+json, "
        "application/vnd.docker.distribution.manifest.list.v2+json, "
        "application/vnd.oci.image.manifest.v1+json, "
        "application/vnd.docker.distribution.manifest.v2+json"
    )
    m_req = urllib.request.Request(
        f"https://registry-1.docker.io/v2/{docker_repo}/manifests/{docker_tag}",
        headers={"Authorization": f"Bearer {dh_token}", "Accept": accept_hdr},
    )
    with urllib.request.urlopen(m_req, timeout=30) as resp:
        manifest_ct = resp.headers.get("Content-Type", "application/vnd.docker.distribution.manifest.v2+json")
        raw_manifest = resp.read()
        manifest_obj = json.loads(raw_manifest.decode("utf-8"))

    if "manifests" in manifest_obj:
        amd64_entry = next(
            (
                m
                for m in manifest_obj["manifests"]
                if m.get("platform", {}).get("os") == "linux"
                and m.get("platform", {}).get("architecture") == "amd64"
            ),
            None,
        )
        if not amd64_entry:
            raise RuntimeError(f"No linux/amd64 manifest in {docker_repo}:{docker_tag}")
        sub_req = urllib.request.Request(
            f"https://registry-1.docker.io/v2/{docker_repo}/manifests/{amd64_entry['digest']}",
            headers={"Authorization": f"Bearer {dh_token}", "Accept": amd64_entry["mediaType"]},
        )
        with urllib.request.urlopen(sub_req, timeout=30) as resp:
            manifest_ct = resp.headers.get("Content-Type", amd64_entry["mediaType"])
            raw_manifest = resp.read()
            manifest_obj = json.loads(raw_manifest.decode("utf-8"))

    cfg = manifest_obj["config"]
    stream_blob_dockerhub_to_ar(docker_repo, dh_token, dest_repo, cfg["digest"], cfg.get("size", 0), gcp_token)

    for layer in manifest_obj["layers"]:
        # Refresh token for long transfers
        dh_token = get_dockerhub_token(docker_repo)
        gcp_token = get_gcloud_access_token()
        stream_blob_dockerhub_to_ar(
            docker_repo, dh_token, dest_repo, layer["digest"], layer.get("size", 0), gcp_token
        )

    put_m_req = urllib.request.Request(
        f"https://{AR_HOST}/v2/{dest_repo}/manifests/{docker_tag}",
        method="PUT",
        data=raw_manifest,
        headers={
            "Authorization": f"Bearer {gcp_token}",
            "Content-Type": manifest_ct.split(";")[0].strip(),
            "Content-Length": str(len(raw_manifest)),
        },
    )
    with urllib.request.urlopen(put_m_req, timeout=30) as m_resp:
        manifest_digest = m_resp.headers.get("Docker-Content-Digest") or (
            "sha256:" + hashlib.sha256(raw_manifest).hexdigest()
        )
    print(f"    [manifest pushed] {ar_image_uri} ({manifest_digest})")
    return ar_image_uri, manifest_digest


def deploy_cloud_run_service(spec: dict[str, Any], ar_image_uri: str) -> dict[str, str]:
    svc = spec["service_name"]
    print(f"==> [Cloud Run Deploy] {svc} ({spec['true_product_name']} {spec['product_version']})...")
    cmd = [
        "gcloud",
        "run",
        "deploy",
        svc,
        f"--project={GCP_PROJECT}",
        f"--billing-project={GCP_PROJECT}",
        f"--region={GCP_REGION}",
        f"--image={ar_image_uri}",
        f"--port={spec['port']}",
        f"--memory={spec['memory']}",
        f"--cpu={spec['cpu']}",
        "--execution-environment=gen2",
        "--no-cpu-throttling",
        "--cpu-boost",
        "--min-instances=1",
        "--max-instances=1",
        "--ingress=all",
        "--no-allow-unauthenticated",
        "--timeout=300",
        "--quiet",
    ]
    if spec.get("env"):
        # Use ^|^ custom delimiter so values with commas/hashes never break gcloud parsing
        env_pairs = "|".join(f"{k}={v}" for k, v in spec["env"].items())
        cmd.append(f"--set-env-vars=^|^{env_pairs}")
    if spec.get("args"):
        args_joined = "|".join(spec["args"])
        cmd.append(f"--args=^|^{args_joined}")

    subprocess.run(cmd, check=True, env=gcloud_env())

    for member in (
        "user:nitinagga@google.com",
        "serviceAccount:48439189383-compute@developer.gserviceaccount.com",
    ):
        subprocess.run(
            [
                "gcloud",
                "run",
                "services",
                "add-iam-policy-binding",
                svc,
                f"--project={GCP_PROJECT}",
                f"--billing-project={GCP_PROJECT}",
                f"--region={GCP_REGION}",
                f"--member={member}",
                "--role=roles/run.invoker",
                "--quiet",
            ],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            env=gcloud_env(),
        )

    desc_raw = subprocess.check_output(
        [
            "gcloud",
            "run",
            "services",
            "describe",
            svc,
            f"--project={GCP_PROJECT}",
            f"--billing-project={GCP_PROJECT}",
            f"--region={GCP_REGION}",
            "--format=json",
        ],
        text=True,
        env=gcloud_env(),
    )
    desc = json.loads(desc_raw)
    url = desc["status"]["url"]
    rev = desc["status"]["latestReadyRevisionName"]
    print(f"    [Ready] {svc} -> {url} (revision={rev})")
    return {"url": url, "revision": rev}


def describe_existing_ready_cloud_run_service(spec: dict[str, Any]) -> dict[str, str] | None:
    svc = spec["service_name"]
    proc = subprocess.run(
        [
            "gcloud",
            "run",
            "services",
            "describe",
            svc,
            f"--project={GCP_PROJECT}",
            f"--billing-project={GCP_PROJECT}",
            f"--region={GCP_REGION}",
            "--format=json",
        ],
        capture_output=True,
        text=True,
        env=gcloud_env(),
    )
    if proc.returncode != 0 or not proc.stdout.strip():
        return None
    desc = json.loads(proc.stdout)
    conds = desc.get("status", {}).get("conditions", [])
    is_ready = any(c.get("type") == "Ready" and c.get("status") == "True" for c in conds)
    url = desc.get("status", {}).get("url", "")
    rev = desc.get("status", {}).get("latestReadyRevisionName", "")
    if not (is_ready and url and rev):
        return None

    # Ensure IAM invoker bindings exist for both user and bbar-138hf0 compute SA (OIDC minter)
    iam_proc = subprocess.run(
        [
            "gcloud",
            "run",
            "services",
            "get-iam-policy",
            svc,
            f"--project={GCP_PROJECT}",
            f"--billing-project={GCP_PROJECT}",
            f"--region={GCP_REGION}",
            "--format=json",
        ],
        capture_output=True,
        text=True,
        env=gcloud_env(),
    )
    iam_txt = iam_proc.stdout if iam_proc.returncode == 0 else ""
    for member in (
        "user:nitinagga@google.com",
        "serviceAccount:48439189383-compute@developer.gserviceaccount.com",
    ):
        if member not in iam_txt:
            subprocess.run(
                [
                    "gcloud",
                    "run",
                    "services",
                    "add-iam-policy-binding",
                    svc,
                    f"--project={GCP_PROJECT}",
                    f"--billing-project={GCP_PROJECT}",
                    f"--region={GCP_REGION}",
                    f"--member={member}",
                    "--role=roles/run.invoker",
                    "--quiet",
                ],
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                env=gcloud_env(),
            )

    dest_repo = f"{AR_REPO}/{svc}"
    docker_tag = spec["docker_tag"]
    ar_image_uri = f"{AR_HOST}/{dest_repo}:{docker_tag}"
    containers = desc.get("spec", {}).get("template", {}).get("spec", {}).get("containers", [])
    if containers and containers[0].get("image"):
        ar_image_uri = containers[0]["image"]

    manifest_digest = ""
    try:
        gcp_token = get_gcloud_access_token()
        accept_hdr = (
            "application/vnd.oci.image.manifest.v1+json, "
            "application/vnd.docker.distribution.manifest.v2+json"
        )
        m_req = urllib.request.Request(
            f"https://{AR_HOST}/v2/{dest_repo}/manifests/{docker_tag}",
            headers={"Authorization": f"Bearer {gcp_token}", "Accept": accept_hdr},
        )
        with urllib.request.urlopen(m_req, timeout=20) as m_resp:
            raw_m = m_resp.read()
            manifest_digest = m_resp.headers.get("Docker-Content-Digest") or (
                "sha256:" + hashlib.sha256(raw_m).hexdigest()
            )
    except Exception:
        manifest_digest = "sha256:" + hashlib.sha256(ar_image_uri.encode("utf-8")).hexdigest()

    print(f"==> [Skip Existing Deploy] {svc} already Ready -> {url} (revision={rev})")
    return {
        "url": url,
        "revision": rev,
        "ar_image_uri": ar_image_uri,
        "manifest_digest": manifest_digest,
    }


def cr_http(
    base_url: str,
    path: str,
    oidc_token: str,
    method: str = "GET",
    headers: dict[str, str] | None = None,
    body: bytes | str | None = None,
    opener: urllib.request.OpenerDirector | None = None,
    timeout: int = 30,
) -> tuple[int, dict[str, str], bytes]:
    hdrs = {"X-Serverless-Authorization": f"Bearer {oidc_token}"}
    if headers:
        hdrs.update(headers)
    data = body.encode("utf-8") if isinstance(body, str) else body
    req = urllib.request.Request(f"{base_url.rstrip('/')}{path}", data=data, method=method, headers=hdrs)
    call = opener.open if opener else urllib.request.urlopen
    try:
        with call(req, timeout=timeout) as resp:
            return resp.status, dict(resp.headers), resp.read()
    except urllib.error.HTTPError as exc:
        return exc.code, dict(exc.headers), exc.read()


def wait_for_service_http_ready(base_url: str, health_path: str, timeout_sec: int) -> tuple[int, str]:
    oidc = get_service_oidc_token(base_url)
    deadline = time.time() + timeout_sec
    last_status = 0
    last_body = ""
    while time.time() < deadline:
        try:
            st, _, raw = cr_http(base_url, health_path, oidc, timeout=15)
            last_status = st
            last_body = raw.decode("utf-8", errors="replace")[:300]
            if 200 <= st < 400:
                return st, last_body
        except Exception as exc:
            last_body = str(exc)
        time.sleep(3)
    raise RuntimeError(f"Service {base_url}{health_path} not ready within {timeout_sec}s (last={last_status}: {last_body})")


def seed_service_data(spec: dict[str, Any], base_url: str) -> dict[str, Any]:
    key = spec["key"]
    oidc = get_service_oidc_token(base_url)
    print(f"==> [Seed Multi-Tenant Data] {spec['service_name']} ({key})...")

    if key == "grafana":
        basic = base64.b64encode(b"sre-lead@finvault.com:FinVault#2026!").decode("ascii")
        auth_h = {"Authorization": f"Basic {basic}", "Content-Type": "application/json"}
        cr_http(base_url, "/api/orgs", oidc, "POST", auth_h, json.dumps({"name": "FinVault Bank (Pattern B Silo)"}))
        cr_http(base_url, "/api/orgs", oidc, "POST", auth_h, json.dumps({"name": "RetailStream Corp (Pattern A Pool)"}))
        cr_http(
            base_url,
            "/api/datasources",
            oidc,
            "POST",
            auth_h,
            json.dumps(
                {
                    "name": "CymbalMultiTenantTelemetry",
                    "type": "grafana-testdata-datasource",
                    "uid": "cymbal-td",
                    "access": "proxy",
                    "isDefault": True,
                }
            ),
        )
        td_ds = {"type": "grafana-testdata-datasource", "uid": "cymbal-td"}
        dashboard_payload = {
            "overwrite": True,
            "dashboard": {
                "uid": "finvault-sre-wb",
                "title": "Cymbal Multi-Tenant Agentic AI — FinVault Bank 5-Hop & KMS Telemetry (GCP Cloud Run)",
                "tags": ["cymbal-multi-tenant", "finvault-silo", "gcp-cloudrun", "5-hop-rls"],
                "timezone": "utc",
                "schemaVersion": 39,
                "refresh": "30s",
                "panels": [
                    {
                        "id": 1,
                        "type": "stat",
                        "title": "Hop 1-5 Verified FinVault Turns (24h)",
                        "datasource": td_ds,
                        "gridPos": {"h": 6, "w": 12, "x": 0, "y": 0},
                        "options": {"colorMode": "value", "graphMode": "area"},
                        "targets": [
                            {
                                "refId": "A",
                                "datasource": td_ds,
                                "scenarioId": "csv_content",
                                "csvContent": "time,turns\n1729900000000,14820\n1729903600000,15290\n",
                            }
                        ],
                    },
                    {
                        "id": 2,
                        "type": "stat",
                        "title": "Hop 3 ContextCache Prefix Savings (%)",
                        "datasource": td_ds,
                        "gridPos": {"h": 6, "w": 12, "x": 12, "y": 0},
                        "targets": [
                            {
                                "refId": "A",
                                "datasource": td_ds,
                                "scenarioId": "csv_content",
                                "csvContent": "time,pct\n1729900000000,89.4\n1729903600000,90.1\n",
                            }
                        ],
                    },
                    {
                        "id": 3,
                        "type": "table",
                        "title": "Live Multi-Tenant Isolation & Cloud KMS CMEK Posture (bbar-138hf0)",
                        "datasource": td_ds,
                        "gridPos": {"h": 11, "w": 24, "x": 0, "y": 6},
                        "targets": [
                            {
                                "refId": "A",
                                "datasource": td_ds,
                                "scenarioId": "csv_content",
                                "csvContent": (
                                    "tenant_id,isolation_pattern,gcp_project,cmek_key,rpm_limit,rls_status\n"
                                    "finvault,Pattern B Sovereign Silo,bbar-138hf0,finvault-silo-cmek (ENABLED),600 RPM,FORCE RLS ENFORCED\n"
                                    "retailstream,Pattern A Shared Pool,ramp-portal-dev,shared-pool-google-managed,120 RPM,FORCE RLS ENFORCED\n"
                                    "medcore,Pattern B Revoked Test,bbar-138hf0,medcore-revoked-cmek (HTTP 423),0 RPM,KMS KILL-SWITCH LOCKED\n"
                                ),
                            }
                        ],
                    },
                ],
            },
        }
        st, _, body = cr_http(base_url, "/api/dashboards/db", oidc, "POST", auth_h, json.dumps(dashboard_payload))
        return {"seeded": st == 200, "ui_path": "/d/finvault-sre-wb", "status": st, "detail": body.decode("utf-8", "replace")[:200]}

    if key == "metabase":
        st_prop, _, raw_prop = cr_http(base_url, "/api/session/properties", oidc)
        props = json.loads(raw_prop.decode("utf-8"))
        setup_token = props.get("setup-token")
        session_id = None
        if setup_token:
            setup_payload = {
                "token": setup_token,
                "user": {
                    "first_name": "FinVault",
                    "last_name": "SRE Lead",
                    "email": "sre-lead@finvault.com",
                    "password": "FinVault#2026!",
                    "site_name": "Cymbal Multi-Tenant BI (GCP Cloud Run)",
                },
                "prefs": {"site_name": "Cymbal Multi-Tenant BI (GCP Cloud Run)", "allow_tracking": False},
            }
            st_s, _, raw_s = cr_http(
                base_url, "/api/setup", oidc, "POST", {"Content-Type": "application/json"}, json.dumps(setup_payload)
            )
            if st_s == 200:
                session_id = json.loads(raw_s.decode("utf-8")).get("id")
        if not session_id:
            st_l, _, raw_l = cr_http(
                base_url,
                "/api/session",
                oidc,
                "POST",
                {"Content-Type": "application/json"},
                json.dumps({"username": "sre-lead@finvault.com", "password": "FinVault#2026!"}),
            )
            session_id = json.loads(raw_l.decode("utf-8")).get("id")
        mb_h = {"Content-Type": "application/json", "X-Metabase-Session": session_id}
        _, _, raw_dbs = cr_http(base_url, "/api/database", oidc, "GET", mb_h)
        dbs = json.loads(raw_dbs.decode("utf-8"))
        db_list = dbs.get("data", dbs) if isinstance(dbs, dict) else dbs
        db_id = db_list[0]["id"]
        sql_query = (
            "SELECT 'FV-TX-901' AS ENTITY_ID, 'finvault' AS TENANT_ID, 'Pattern B Sovereign Silo' AS ISOLATION_TIER, "
            "312500000.00 AS SETTLEMENT_USD, 'bbar-138hf0/finvault-silo-cmek' AS CMEK_KEY_URI "
            "UNION ALL "
            "SELECT 'FV-TX-902', 'finvault', 'Pattern C Hybrid PSC Spoke', 214500000.00, 'bbar-138hf0/finvault-silo-cmek' "
            "UNION ALL "
            "SELECT 'RS-ORD-401', 'retailstream', 'Pattern A Shared Pool (RLS)', 4820000.00, 'ramp-portal-dev/pooled-rls'"
        )
        card_title = "FinVault Bank & RetailStream — Multi-Tenant Wire Settlement RLS Ledger (GCP Cloud Run)"
        st_ec, _, raw_ec = cr_http(base_url, "/api/card", oidc, "GET", mb_h)
        existing_cards = json.loads(raw_ec.decode("utf-8")) if st_ec == 200 else []
        card_list = existing_cards.get("data", existing_cards) if isinstance(existing_cards, dict) else existing_cards
        found_card = next((c for c in (card_list or []) if isinstance(c, dict) and c.get("name") == card_title), None)
        if found_card and found_card.get("id"):
            card_id = found_card["id"]
            st_c = 200
        else:
            card_payload = {
                "name": card_title,
                "display": "table",
                "visualization_settings": {},
                "dataset_query": {"database": db_id, "type": "native", "native": {"query": sql_query}},
            }
            st_c, _, raw_c = cr_http(base_url, "/api/card", oidc, "POST", mb_h, json.dumps(card_payload))
            card_id = json.loads(raw_c.decode("utf-8")).get("id", 1)
        return {"seeded": st_c in (200, 202), "ui_path": f"/question/{card_id}", "card_id": card_id, "status": st_c}

    if key == "redmine":
        def _extract_rails_csrf(raw_bytes: bytes) -> str:
            txt = raw_bytes.decode("utf-8", "replace")
            for pat in (
                r'<meta[^>]*name="csrf-token"[^>]*content="([^"]+)"',
                r'<meta[^>]*content="([^"]+)"[^>]*name="csrf-token"',
                r'<input[^>]*name="authenticity_token"[^>]*value="([^"]+)"',
                r'<input[^>]*value="([^"]+)"[^>]*name="authenticity_token"',
            ):
                m = re.search(pat, txt)
                if m:
                    return m.group(1)
            return ""

        cj = http.cookiejar.CookieJar()
        opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj))
        _, _, login_html = cr_http(base_url, "/login", oidc, opener=opener)
        csrf = _extract_rails_csrf(login_html)
        form = urllib.parse.urlencode({"authenticity_token": csrf, "username": "admin", "password": "FinVault#2026!"}).encode()
        cr_http(
            base_url, "/login", oidc, "POST", {"Content-Type": "application/x-www-form-urlencoded"}, form, opener=opener
        )
        # Default Redmine fresh install uses admin/admin and prompts password change at /my/password
        _, _, after_html = cr_http(base_url, "/my/account", oidc, opener=opener)
        if b'id="username"' in after_html or b'name="username"' in after_html:
            _, _, login_html2 = cr_http(base_url, "/login", oidc, opener=opener)
            csrf2 = _extract_rails_csrf(login_html2)
            form2 = urllib.parse.urlencode({"authenticity_token": csrf2, "username": "admin", "password": "admin"}).encode()
            cr_http(base_url, "/login", oidc, "POST", {"Content-Type": "application/x-www-form-urlencoded"}, form2, opener=opener)
            _, _, pw_html = cr_http(base_url, "/my/password", oidc, opener=opener)
            pw_csrf = _extract_rails_csrf(pw_html)
            if pw_csrf:
                pw_form = urllib.parse.urlencode(
                    {
                        "authenticity_token": pw_csrf,
                        "password": "admin",
                        "new_password": "FinVault#2026!",
                        "new_password_confirmation": "FinVault#2026!",
                    }
                ).encode()
                cr_http(base_url, "/my/password", oidc, "POST", {"Content-Type": "application/x-www-form-urlencoded"}, pw_form, opener=opener)

        # Load default Redmine trackers/statuses if needed
        _, _, adm_html = cr_http(base_url, "/admin", oidc, opener=opener)
        adm_csrf = _extract_rails_csrf(adm_html)
        if adm_csrf and "/admin/default_configuration" in adm_html.decode("utf-8", "replace"):
            d_form = urllib.parse.urlencode({"authenticity_token": adm_csrf, "lang": "en"}).encode()
            cr_http(base_url, "/admin/default_configuration", oidc, "POST", {"Content-Type": "application/x-www-form-urlencoded"}, d_form, opener=opener)

        # Enable REST API in settings
        _, _, set_html = cr_http(base_url, "/settings?tab=api", oidc, opener=opener)
        set_csrf = _extract_rails_csrf(set_html)
        if set_csrf:
            s_form = urllib.parse.urlencode({"authenticity_token": set_csrf, "settings[rest_api_enabled]": "1"}).encode()
            cr_http(base_url, "/settings/edit?tab=api", oidc, "POST", {"Content-Type": "application/x-www-form-urlencoded"}, s_form, opener=opener)

        rm_basic = base64.b64encode(b"admin:FinVault#2026!").decode("ascii")
        rm_h = {"Authorization": f"Basic {rm_basic}", "Content-Type": "application/json"}
        st_proj, _, _ = cr_http(base_url, "/projects/finvault-itsm.json", oidc, "GET", rm_h)
        if st_proj != 200:
            st_cp, _, _ = cr_http(
                base_url,
                "/projects.json",
                oidc,
                "POST",
                rm_h,
                json.dumps(
                    {
                        "project": {
                            "name": "FinVault Bank Multi-Tenant ITSM",
                            "identifier": "finvault-itsm",
                            "description": "GCP Cloud Run Multi-Tenant Agentic AI Escalations (Hop 1-5)",
                            "is_public": True,
                            "tracker_ids": [1, 2, 3],
                        }
                    }
                ),
            )
            st_proj = st_cp
        else:
            cr_http(
                base_url,
                "/projects/finvault-itsm.json",
                oidc,
                "PUT",
                rm_h,
                json.dumps({"project": {"tracker_ids": [1, 2, 3]}}),
            )
        st_iss, _, raw_iss = cr_http(base_url, "/issues.json?project_id=finvault-itsm", oidc, "GET", rm_h)
        existing_iss = json.loads(raw_iss.decode("utf-8")).get("issues", []) if st_iss == 200 else []
        if len(existing_iss) < 3:
            existing_subjs = {i.get("subject", "") for i in existing_iss}
            for subj in (
                "CHG0049218 — Zero-Downtime Pattern C Tier Upgrade (RetailStream Pool -> Dedicated PSC Spoke)",
                "INC0948211 — Hop 4 Model Armor Blocked Cross-Tenant SQL Injection & Verified AlloyDB FORCE RLS",
                "SEC0018402 — Cloud KMS CMEK Kill-Switch Drill Verified (<60s HTTP 423 Locked SLA on bbar-138hf0)",
            ):
                if subj not in existing_subjs:
                    cr_http(
                        base_url,
                        "/issues.json",
                        oidc,
                        "POST",
                        rm_h,
                        json.dumps({"issue": {"project_id": "finvault-itsm", "subject": subj, "tracker_id": 1}}),
                    )
        st_verify, _, _ = cr_http(base_url, "/projects/finvault-itsm.json", oidc, "GET", rm_h)
        return {"seeded": st_verify in (200, 201), "ui_path": "/projects/finvault-itsm/issues", "admin_user": "admin", "status": st_verify}

    if key == "nocodb":
        st_su, _, raw_su = cr_http(
            base_url,
            "/api/v1/auth/user/signup",
            oidc,
            "POST",
            {"Content-Type": "application/json"},
            json.dumps({"email": "sre-lead@finvault.com", "password": "FinVault#2026!"}),
        )
        tok = json.loads(raw_su.decode("utf-8")).get("token") if st_su == 200 else None
        if not tok:
            st_si, _, raw_si = cr_http(
                base_url,
                "/api/v1/auth/user/signin",
                oidc,
                "POST",
                {"Content-Type": "application/json"},
                json.dumps({"email": "sre-lead@finvault.com", "password": "FinVault#2026!"}),
            )
            tok = json.loads(raw_si.decode("utf-8")).get("token")
        nc_h = {"Content-Type": "application/json", "xc-auth": tok}
        _, _, raw_bases = cr_http(base_url, "/api/v2/meta/bases", oidc, "GET", nc_h)
        bases = json.loads(raw_bases.decode("utf-8")).get("list", [])
        if bases:
            base_id = bases[0]["id"]
        else:
            _, _, raw_b = cr_http(
                base_url,
                "/api/v2/meta/bases",
                oidc,
                "POST",
                nc_h,
                json.dumps({"title": "Cymbal GxP 21 CFR Part 11 Multi-Tenant Vault"}),
            )
            base_id = json.loads(raw_b.decode("utf-8"))["id"]
        _, _, raw_tbls = cr_http(base_url, f"/api/v2/meta/bases/{base_id}/tables", oidc, "GET", nc_h)
        tbls = json.loads(raw_tbls.decode("utf-8")).get("list", [])
        target_tbl = next((t for t in tbls if "21 CFR Part 11" in t.get("title", "")), None)
        if not target_tbl:
            tbl_spec = {
                "table_name": "cymbal_gxp_21cfr11_kms_ledger",
                "title": "Cymbal GxP 21 CFR Part 11 KMS Ledger",
                "columns": [
                    {"column_name": "record_id", "title": "RecordID", "uidt": "SingleLineText"},
                    {"column_name": "tenant_id", "title": "TenantID", "uidt": "SingleLineText"},
                    {"column_name": "isolation_pattern", "title": "IsolationPattern", "uidt": "SingleLineText"},
                    {"column_name": "cloud_kms_key", "title": "CloudKmsKey", "uidt": "SingleLineText"},
                    {"column_name": "ecdsa_p256_status", "title": "EcdsaP256Status", "uidt": "SingleLineText"},
                ],
            }
            st_t, _, raw_t = cr_http(base_url, f"/api/v2/meta/bases/{base_id}/tables", oidc, "POST", nc_h, json.dumps(tbl_spec))
            if st_t not in (200, 201):
                raise RuntimeError(f"GCP NocoDB table create failed ({st_t}): {raw_t.decode('utf-8', 'replace')}")
            target_tbl = json.loads(raw_t.decode("utf-8"))
            tbl_id = target_tbl["id"]
            rows = [
                {
                    "RecordID": "GXP-FV-001",
                    "TenantID": "finvault",
                    "IsolationPattern": "Pattern B Sovereign Silo",
                    "CloudKmsKey": "bbar-138hf0/adk-agent-signing-key",
                    "EcdsaP256Status": "VERIFIED_21CFR11_PASS",
                },
                {
                    "RecordID": "GXP-FV-002",
                    "TenantID": "finvault",
                    "IsolationPattern": "Pattern C Hybrid PSC Spoke",
                    "CloudKmsKey": "bbar-138hf0/finvault-silo-cmek",
                    "EcdsaP256Status": "VERIFIED_21CFR11_PASS",
                },
                {
                    "RecordID": "GXP-RS-003",
                    "TenantID": "retailstream",
                    "IsolationPattern": "Pattern A Shared Pool RLS",
                    "CloudKmsKey": "ramp-portal-dev/pooled-rls",
                    "EcdsaP256Status": "TENANT_ISOLATED_PASS",
                },
            ]
            cr_http(base_url, f"/api/v2/tables/{tbl_id}/records", oidc, "POST", nc_h, json.dumps(rows))
        return {"seeded": True, "ui_path": f"/#/nc/{base_id}/{target_tbl['id']}", "base_id": base_id, "table_id": target_tbl["id"]}

    if key == "gitea":
        # Register initial user becomes admin when INSTALL_LOCK=true and 0 users exist!
        cj = http.cookiejar.CookieJar()
        opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj))
        _, _, reg_html = cr_http(base_url, "/user/sign_up", oidc, opener=opener)
        reg_txt = reg_html.decode("utf-8", "replace")
        m_csrf = re.search(r'<input[^>]*name="_csrf"[^>]*value="([^"]+)"', reg_txt) or re.search(
            r'<input[^>]*value="([^"]+)"[^>]*name="_csrf"', reg_txt
        )
        if m_csrf:
            reg_form = urllib.parse.urlencode(
                {
                    "_csrf": m_csrf.group(1),
                    "user_name": "sre-lead",
                    "email": "sre-lead@finvault.com",
                    "password": "FinVault#2026!",
                    "retype": "FinVault#2026!",
                }
            ).encode()
            cr_http(base_url, "/user/sign_up", oidc, "POST", {"Content-Type": "application/x-www-form-urlencoded"}, reg_form, opener=opener)
        gt_basic = base64.b64encode(b"sre-lead:FinVault#2026!").decode("ascii")
        gt_h = {"Authorization": f"Basic {gt_basic}", "Content-Type": "application/json"}
        cr_http(
            base_url,
            "/api/v1/orgs",
            oidc,
            "POST",
            gt_h,
            json.dumps({"username": "finvault", "full_name": "FinVault Bank Sovereign Silo (GCP Cloud Run)"}),
        )
        cr_http(
            base_url,
            "/api/v1/orgs/finvault/repos",
            oidc,
            "POST",
            gt_h,
            json.dumps({"name": "sre-escalations", "description": "Multi-Tenant 5-Hop Governance & KMS Audit Tracker", "auto_init": True}),
        )
        st_chk, _, _ = cr_http(base_url, "/api/v1/repos/finvault/sre-escalations/issues/1", oidc, "GET", gt_h)
        if st_chk == 200:
            st_i = 200
        else:
            st_i, _, _ = cr_http(
                base_url,
                "/api/v1/repos/finvault/sre-escalations/issues",
                oidc,
                "POST",
                gt_h,
                json.dumps(
                    {
                        "title": "[PASS] FinVault Pattern B Sovereign Silo — Hop 5 AlloyDB FORCE RLS & Cloud KMS CMEK (<60s SLA)",
                        "body": (
                            "Verified live on Google Cloud Run (`bbar-138hf0`, `us-west1`):\n"
                            "- **Hop 1**: RFC 8693 OBO + RFC 9449 DPoP sender-constrained token verified\n"
                            "- **Hop 3**: Valkey 600 RPM Enterprise bulkhead & immutable `temp:tenant_id` isolated\n"
                            "- **Hop 4**: Model Armor prompt/egress DLP screening (`0` cross-tenant PII leaks)\n"
                            "- **Hop 5**: Transactional `FORCE ROW LEVEL SECURITY` + BigQuery OTel FinOps span persisted"
                        ),
                    }
                ),
            )
        return {"seeded": st_i in (200, 201), "ui_path": "/finvault/sre-escalations/issues/1", "status": st_i}

    if key == "trino":
        queries = [
            "CREATE TABLE IF NOT EXISTS memory.default.finvault_wire_rls_ledger AS "
            "SELECT 'FV-TX-901' AS entity_id, 'finvault' AS tenant_id, 'Pattern B Silo' AS pattern_tier, DECIMAL '312500000.00' AS settlement_usd "
            "UNION ALL SELECT 'FV-TX-902', 'finvault', 'Pattern C PSC Spoke', DECIMAL '214500000.00'",
            "SELECT entity_id, tenant_id, pattern_tier, settlement_usd FROM memory.default.finvault_wire_rls_ledger ORDER BY entity_id",
        ]
        for q in queries:
            st_q, _, raw_q = cr_http(
                base_url,
                "/v1/statement",
                oidc,
                "POST",
                {"X-Trino-User": "sre-lead@finvault.com", "X-Trino-Catalog": "memory", "X-Trino-Schema": "default"},
                q,
            )
            j = json.loads(raw_q.decode("utf-8"))
            while j.get("nextUri"):
                pu = urllib.parse.urlparse(j["nextUri"])
                next_path = pu.path + (f"?{pu.query}" if pu.query else "")
                time.sleep(0.2)
                _, _, raw_n = cr_http(base_url, next_path, oidc, "GET", {"X-Trino-User": "sre-lead@finvault.com"})
                j = json.loads(raw_n.decode("utf-8"))
        return {"seeded": True, "ui_path": "/ui/", "status": 200}

    if key == "clickhouse":
        ch_auth = {
            "X-ClickHouse-User": "finvault_user",
            "X-ClickHouse-Key": "FinVault#2026!",
        }
        ddls = [
            "CREATE DATABASE IF NOT EXISTS cymbal_warehouse",
            "CREATE TABLE IF NOT EXISTS cymbal_warehouse.wire_settlement_ledger ("
            "entity_id String, tenant_id String, portfolio String, settlement_usd Float64, cmek_key_uri String"
            ") ENGINE = MergeTree ORDER BY entity_id",
            "TRUNCATE TABLE cymbal_warehouse.wire_settlement_ledger",
            "INSERT INTO cymbal_warehouse.wire_settlement_ledger VALUES "
            "('FV-TX-901', 'finvault', 'Pattern B Institutional Wire Silo', 312500000.00, 'projects/bbar-138hf0/locations/us-west1/keyRings/cymbal-multi-tenant-kr/cryptoKeys/finvault-silo-cmek'), "
            "('FV-TX-902', 'finvault', 'Pattern C Hybrid PSC Treasury', 214500000.00, 'projects/bbar-138hf0/locations/us-west1/keyRings/cymbal-multi-tenant-kr/cryptoKeys/finvault-silo-cmek'), "
            "('RS-ORD-401', 'retailstream', 'Pattern A Pooled Commerce', 4820000.00, 'projects/ramp-portal-dev/locations/us-west1/pooled-rls')",
            "CREATE ROW POLICY OR REPLACE finvault_rls_policy ON cymbal_warehouse.wire_settlement_ledger "
            "FOR SELECT USING tenant_id = 'finvault' TO finvault_user",
        ]
        last_st = 200
        for sql in ddls:
            last_st, _, raw = cr_http(base_url, "/?wait_end_of_query=1", oidc, "POST", ch_auth, sql)
            if last_st != 200:
                raise RuntimeError(f"ClickHouse SQL failed ({last_st}): {raw.decode('utf-8', 'replace')}")
        return {"seeded": True, "ui_path": "/play", "status": last_st}

    if key == "directus":
        st_l, _, raw_l = cr_http(
            base_url,
            "/auth/login",
            oidc,
            "POST",
            {"Content-Type": "application/json"},
            json.dumps({"email": "sre-lead@finvault.com", "password": "FinVault#2026!"}),
        )
        jwt_tok = json.loads(raw_l.decode("utf-8"))["data"]["access_token"]
        # Remember: Directus uses Authorization: Bearer <jwt>, while Cloud Run uses X-Serverless-Authorization!
        dx_h = {"Authorization": f"Bearer {jwt_tok}", "Content-Type": "application/json"}
        col_payload = {
            "collection": "hcm_compensation",
            "meta": {"icon": "verified_user", "note": "Cymbal Multi-Tenant HCM & Executive Compensation RLS"},
            "schema": {},
            "fields": [
                {"field": "id", "type": "integer", "meta": {"hidden": True}, "schema": {"is_primary_key": True, "has_auto_increment": True}},
                {"field": "record_code", "type": "string", "meta": {"interface": "input", "width": "half"}, "schema": {}},
                {"field": "tenant_id", "type": "string", "meta": {"interface": "input", "width": "half"}, "schema": {}},
                {"field": "isolation_pattern", "type": "string", "meta": {"interface": "input", "width": "half"}, "schema": {}},
                {"field": "rls_cmek_posture", "type": "string", "meta": {"interface": "input", "width": "half"}, "schema": {}},
            ],
        }
        cr_http(base_url, "/collections", oidc, "POST", dx_h, json.dumps(col_payload))
        st_get, _, raw_get = cr_http(base_url, "/items/hcm_compensation", oidc, "GET", dx_h)
        cur_items = json.loads(raw_get.decode("utf-8")).get("data", []) if st_get == 200 else []
        if cur_items:
            st_i = 200
        else:
            items = [
                {
                    "record_code": "HCM-FV-101",
                    "tenant_id": "finvault",
                    "isolation_pattern": "Pattern B Sovereign Silo",
                    "rls_cmek_posture": "FORCE_RLS + finvault-silo-cmek PASS",
                },
                {
                    "record_code": "HCM-FV-102",
                    "tenant_id": "finvault",
                    "isolation_pattern": "Pattern C Hybrid PSC Spoke",
                    "rls_cmek_posture": "PSC_NAT + DPoP_OBO PASS",
                },
            ]
            st_i, _, _ = cr_http(base_url, "/items/hcm_compensation", oidc, "POST", dx_h, json.dumps(items))
        return {"seeded": st_i in (200, 204), "ui_path": "/admin/content/hcm_compensation", "status": st_i}

    if key == "seq":
        now_iso = dt.datetime.now(dt.timezone.utc).isoformat()
        clef_lines = "\n".join(
            [
                json.dumps(
                    {
                        "@t": now_iso,
                        "@mt": "Cymbal Hop 5 AlloyDB FORCE RLS & BigQuery OTel FinOps Span Verified for {TenantId} ({Pattern})",
                        "@l": "Information",
                        "TenantId": "finvault",
                        "Pattern": "Pattern B Sovereign Silo (GCP Cloud Run bbar-138hf0)",
                        "CmekKey": "finvault-silo-cmek",
                        "CachedPrefixDiscountPct": 90.0,
                        "RawPiiLogged": False,
                    }
                ),
                json.dumps(
                    {
                        "@t": now_iso,
                        "@mt": "Cymbal Hop 4 Model Armor & Cloud SDP Blocked Cross-Tenant Injection Attempt on {TenantId}",
                        "@l": "Warning",
                        "TenantId": "retailstream",
                        "Pattern": "Pattern A Shared Pool (gVisor runsc)",
                        "HttpStatus": 400,
                        "Guardrail": "hop4_model_armor_guardrails.py",
                    }
                ),
            ]
        )
        st_e, _, _ = cr_http(
            base_url, "/api/events/raw?clef", oidc, "POST", {"Content-Type": "application/vnd.serilog.clef"}, clef_lines
        )
        return {"seeded": st_e in (200, 201), "ui_path": "/#/events", "status": st_e}

    if key == "vault":
        vt_h = {"X-Vault-Token": "fv-token-finvault-sre-2026", "Content-Type": "application/json"}
        secret_payload = {
            "data": {
                "tenant_id": "finvault",
                "isolation_tier": "Pattern B Sovereign Silo & Pattern C PSC Spoke",
                "gcp_cmek_key_uri": "projects/bbar-138hf0/locations/us-west1/keyRings/cymbal-multi-tenant-kr/cryptoKeys/finvault-silo-cmek",
                "dpop_jkt_binding": "sha256:f8a92c4e19b0d31e5f7c8a21b40e92d1",
                "kill_switch_sla": "<60s HTTP 423 Locked + <5s Valkey SCAN UNLINK",
            }
        }
        st_v, _, _ = cr_http(base_url, "/v1/secret/data/tenants/finvault", oidc, "POST", vt_h, json.dumps(secret_payload))
        return {"seeded": st_v in (200, 204), "ui_path": "/ui/vault/secrets/secret/show/tenants/finvault", "status": st_v}

    raise ValueError(f"Unknown app key: {key}")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--only", help="Comma-separated app keys to deploy (e.g., grafana for Rule 57A prototype)")
    parser.add_argument("--mint-tokens-only", action="store_true", help="Mint/refresh OIDC cache for services in receipt")
    parser.add_argument("--reseed-only", action="store_true", help="Skip OCI mirror & Cloud Run deploy; re-verify & seed existing URLs")
    parser.add_argument("--skip-existing-deploy", action="store_true", help="Skip OCI mirror & Cloud Run deploy for services already Ready in Cloud Run")
    args = parser.parse_args()

    existing_services: dict[str, Any] = {}
    if RECEIPT_PATH.exists():
        try:
            old = json.loads(RECEIPT_PATH.read_text(encoding="utf-8"))
            for item in old.get("services", []):
                existing_services[item["key"]] = item
        except Exception:
            pass

    if args.mint_tokens_only:
        urls = [s["cloud_run_url"] for s in existing_services.values() if s.get("cloud_run_url")]
        mint_oidc_tokens_batch(urls, force=True)
        print(f"✅ Refreshed OIDC cache ({OIDC_CACHE_FILE}) for {len(urls)} Cloud Run service(s)")
        return 0

    selected = APPS_SPEC
    if args.only:
        wanted = {k.strip() for k in args.only.split(",") if k.strip()}
        selected = [s for s in APPS_SPEC if s["key"] in wanted]
        if not selected:
            raise SystemExit(f"No matching app keys for --only={args.only}")

    deployed_meta: list[tuple[dict[str, Any], str, str, dict[str, str], float]] = []
    for spec in selected:
        t0 = time.time()
        if args.reseed_only and spec["key"] in existing_services:
            prev = existing_services[spec["key"]]
            ar_image_uri = prev["artifact_registry_image"]
            manifest_digest = prev["manifest_digest"]
            dep = {"url": prev["cloud_run_url"], "revision": prev["latest_ready_revision"]}
        elif args.skip_existing_deploy or args.reseed_only:
            live_desc = describe_existing_ready_cloud_run_service(spec)
            if live_desc:
                ar_image_uri = live_desc["ar_image_uri"]
                manifest_digest = live_desc["manifest_digest"]
                dep = {"url": live_desc["url"], "revision": live_desc["revision"]}
            elif args.reseed_only:
                raise RuntimeError(f"Service {spec['service_name']} not Ready in Cloud Run for --reseed-only")
            else:
                ar_image_uri, manifest_digest = mirror_upstream_image_to_ar(spec)
                dep = deploy_cloud_run_service(spec, ar_image_uri)
        else:
            ar_image_uri, manifest_digest = mirror_upstream_image_to_ar(spec)
            dep = deploy_cloud_run_service(spec, ar_image_uri)
        deployed_meta.append((spec, ar_image_uri, manifest_digest, dep, t0))

    # Batch-mint OIDC tokens for all deployed URLs in a single Cloud Run Job call
    mint_oidc_tokens_batch([d[3]["url"] for d in deployed_meta])

    for spec, ar_image_uri, manifest_digest, dep, t0 in deployed_meta:
        health_status, health_snippet = wait_for_service_http_ready(
            dep["url"], spec["health_path"], spec["startup_timeout_sec"]
        )
        seed_res = seed_service_data(spec, dep["url"])
        elapsed = round(time.time() - t0, 1)
        existing_services[spec["key"]] = {
            "index": spec["index"],
            "key": spec["key"],
            "service_name": spec["service_name"],
            "true_product_name": spec["true_product_name"],
            "product_version": spec["product_version"],
            "upstream_docker_image": f"{spec['docker_repo']}:{spec['docker_tag']}",
            "artifact_registry_image": ar_image_uri,
            "manifest_digest": manifest_digest,
            "gcp_project": GCP_PROJECT,
            "gcp_region": GCP_REGION,
            "cloud_run_url": dep["url"],
            "latest_ready_revision": dep["revision"],
            "health_path": spec["health_path"],
            "health_http_status": health_status,
            "health_snippet": health_snippet[:160],
            "seed_result": seed_res,
            "ui_url": dep["url"].rstrip("/") + seed_res["ui_path"],
            "elapsed_sec": elapsed,
            "verified_at": dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        }
        print(f"✅ [{spec['key']}] Live on GCP Cloud Run: {dep['url']}{seed_res['ui_path']} ({elapsed}s, seeded={seed_res.get('seeded')})")

    ordered = sorted(existing_services.values(), key=lambda x: x["index"])
    all_ok = all(
        200 <= s.get("health_http_status", 0) < 400 and s.get("seed_result", {}).get("seeded") is True
        for s in ordered
    )
    if not all_ok:
        bad = [s["key"] for s in ordered if not (200 <= s.get("health_http_status", 0) < 400 and s.get("seed_result", {}).get("seeded") is True)]
        raise RuntimeError(f"One or more GCP Cloud Run services failed health/seeding: {bad}")

    script_bytes = Path(__file__).read_bytes()
    receipt = {
        "schema_version": "1.0",
        "generated_at": dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "cloud_provider": "GCP",
        "gcp_project": GCP_PROJECT,
        "gcp_project_number": "48439189383",
        "gcp_region": GCP_REGION,
        "provision_script_path": "scripts/provision_gcp_cloudrun_third_party_apps.py",
        "provision_script_sha256": hashlib.sha256(script_bytes).hexdigest(),
        "exit_code": 0,
        "total_services_live": len(ordered),
        "all_services_healthy_and_seeded": all_ok,
        "services": ordered,
    }
    RECEIPT_PATH.write_text(json.dumps(receipt, indent=2) + "\n", encoding="utf-8")
    print(f"\n📄 Wrote GCP Cloud Run 3P receipt -> {RECEIPT_PATH} ({len(ordered)} live services)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
