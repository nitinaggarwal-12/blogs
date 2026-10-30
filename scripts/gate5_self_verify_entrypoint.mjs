#!/usr/bin/env node
/**
 * Gate 5 Pre-Traffic Cloud Run Revision HTTP 200 & DOM/JSON Payload Verifier (Node.js Runtime).
 *
 * Phase 1 (Pre-Readiness Gate on unthrottled Cloud Run Startup CPU):
 *   Spawns the target Node server on internal port 18080 BEFORE binding $PORT (8080),
 *   executes live HTTP GET verification across all configured routes & DOM/JSON markers,
 *   emits structured `CLOUDRUN_LIVE_E2E_VERIFICATION_RESULT:<json>` telemetry to Cloud Logging,
 *   and fails closed (`process.exit(1)`) BEFORE Cloud Run ever routes production traffic if any check fails.
 *
 * Phase 2 (Zero-Overhead Production Handoff):
 *   Cleanly stops the 18080 verification instance and launches the production server directly on $PORT (8080).
 */

import { spawn } from 'node:child_process';
import crypto from 'node:crypto';
import http from 'node:http';
import net from 'node:net';

const origArgs = process.argv.slice(2);
if (origArgs.length === 0) {
  console.error('Usage: gate5_self_verify_entrypoint.mjs <cmd...>');
  process.exit(1);
}

function rewritePortArgs(argsList, targetPortStr) {
  const out = [...argsList];
  for (let i = 0; i < out.length; i++) {
    if ((out[i] === '-p' || out[i] === '--port') && i + 1 < out.length) {
      out[i + 1] = targetPortStr;
    } else if (out[i].startsWith('--port=')) {
      out[i] = `--port=${targetPortStr}`;
    }
  }
  return out;
}

function waitForPort(port, timeoutMs = 55000) {
  const deadline = Date.now() + timeoutMs;
  return new Promise((resolve) => {
    const attempt = () => {
      const sock = net.createConnection({ host: '127.0.0.1', port }, () => {
        sock.destroy();
        resolve(true);
      });
      sock.on('error', () => {
        sock.destroy();
        if (Date.now() >= deadline) {
          resolve(false);
        } else {
          setTimeout(attempt, 350);
        }
      });
    };
    attempt();
  });
}

function httpGetLocal(port, path) {
  return new Promise((resolve) => {
    const t0 = Date.now();
    const req = http.get(
      {
        host: '127.0.0.1',
        port,
        path,
        timeout: 45000,
        headers: {
          Accept: 'text/html,application/json,*/*',
          'User-Agent': 'CloudRun-Gate5-Verifier/2.0',
        },
      },
      (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          const buf = Buffer.concat(chunks);
          resolve({
            statusCode: res.statusCode || 0,
            buf,
            latencyMs: Date.now() - t0,
            error: '',
          });
        });
      }
    );
    req.on('error', (err) => {
      resolve({ statusCode: 0, buf: Buffer.alloc(0), latencyMs: Date.now() - t0, error: String(err.message || err) });
    });
    req.on('timeout', () => {
      req.destroy();
      resolve({ statusCode: 0, buf: Buffer.alloc(0), latencyMs: Date.now() - t0, error: 'timeout' });
    });
  });
}

function stopChild(proc) {
  return new Promise((resolve) => {
    if (!proc || proc.exitCode !== null) {
      resolve();
      return;
    }
    const timer = setTimeout(() => {
      try { proc.kill('SIGKILL'); } catch {}
      resolve();
    }, 2500);
    proc.once('exit', () => {
      clearTimeout(timer);
      resolve();
    });
    try { proc.kill('SIGTERM'); } catch {
      clearTimeout(timer);
      resolve();
    }
  });
}

(async () => {
  const prodPort = String(process.env.PORT || '8080');
  const gatePort = prodPort === '18080' ? 18081 : 18080;
  const routesCfg = JSON.parse(process.env.GATE5_ROUTES_JSON || '[{"path":"/","markers":[]}]');
  const svc = process.env.K_SERVICE || 'local-service';
  const rev = process.env.K_REVISION || 'local-revision';

  const gateArgs = rewritePortArgs(origArgs, String(gatePort));
  const gateChild = spawn(gateArgs[0], gateArgs.slice(1), {
    stdio: 'inherit',
    env: { ...process.env, PORT: String(gatePort) },
  });

  const ready = await waitForPort(gatePort, 55000);
  if (!ready) {
    const errReport = {
      verifiedAt: new Date().toISOString(),
      service: svc,
      revision: rev,
      overallPassed: false,
      error: `Gate 5 pre-traffic server did not listen on 127.0.0.1:${gatePort} within 55s`,
      routes: [],
    };
    console.log('CLOUDRUN_LIVE_E2E_VERIFICATION_RESULT:' + JSON.stringify(errReport));
    await stopChild(gateChild);
    process.exit(1);
  }

  await new Promise((r) => setTimeout(r, 150));
  const routeResults = [];
  let allOk = true;

  for (const chk of routesCfg) {
    const p = chk.path || '/';
    const markers = Array.isArray(chk.markers) ? chk.markers : [];
    const { statusCode, buf, latencyMs, error } = await httpGetLocal(gatePort, p);
    const bodyLower = buf.toString('utf8').toLowerCase();
    const matched = markers.filter((m) => bodyLower.includes(String(m).toLowerCase()));
    const missing = markers.filter((m) => !bodyLower.includes(String(m).toLowerCase()));
    const passed = statusCode === 200 && missing.length === 0;
    if (!passed) allOk = false;
    routeResults.push({
      path: p,
      httpStatus: statusCode,
      responseBytes: buf.length,
      bodySha256Short: crypto.createHash('sha256').update(buf).digest('hex').slice(0, 16),
      latencyMs,
      markersMatched: matched,
      markersMissing: missing,
      passed,
      error,
    });
  }

  const summary = {
    verifiedAt: new Date().toISOString(),
    verificationMode: 'cloud_run_revision_pre_traffic_live_http_dom_probe',
    project: process.env.GOOGLE_CLOUD_PROJECT || 'ramp-portal-dev',
    region: process.env.GCP_REGION || 'us-west1',
    service: svc,
    revision: rev,
    overallPassed: allOk,
    routes: routeResults,
  };
  console.log('CLOUDRUN_LIVE_E2E_VERIFICATION_RESULT:' + JSON.stringify(summary));

  await stopChild(gateChild);
  if (!allOk) {
    process.exit(1);
  }

  const prodChild = spawn(origArgs[0], origArgs.slice(1), {
    stdio: 'inherit',
    env: process.env,
  });
  for (const sig of ['SIGTERM', 'SIGINT']) {
    process.on(sig, () => {
      try { prodChild.kill(sig); } catch {}
    });
  }
  prodChild.on('exit', (code) => {
    process.exit(code ?? 0);
  });
})();
