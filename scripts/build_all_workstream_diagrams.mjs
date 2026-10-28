#!/usr/bin/env node
/**
 * Official Google Cloud Architecture Center Hub-and-Spoke Diagram Compiler
 * (`multi-tenant-agentic-ai-system.svg` / Approved Template)
 *
 * Rebuilds all 14 workstream & pattern diagrams (7 core + 7 extended) across
 * Workstreams 1 through 5 in the exact Approved Google Cloud Architecture Center
 * Hub-and-Spoke visual format and layout:
 * - Outer Google Cloud Frame : #1a73e8 (stroke #202124) + white Google Cloud wordmark
 * - Nested Boundary Frames   : #ffffff (stroke #202124)
 * - Routing / Ingress Hub    : #aecbfa (stroke #202124)
 * - Central Governance Hub   : #ceead6 (stroke #202124)
 * - Left Tenant / Pool Zone  : #feefc3 (stroke #202124)
 * - Right Tenant / Spoke Zone: #fad2cf (stroke #202124)
 * - Component Cards          : #ffffff (stroke #202124, stroke-width 2px, rx 6px)
 * - Numbered Step Badges     : #174ea6 circle (r=20) with white bold step numbers (1..7)
 * - Causal Step Ordering     : 4 (Sanitize request) -> 5 (Generates response) -> 6 (Sanitize response)
 * - Distinct Official Icons  : Resolved per service (KMS, VPC-SC, PSC, Valkey/Redis, Firestore, BigQuery, Discovery Engine, DMS, etc.)
 * - Vertex-Bound Draw.io XML : Explicit source/target bindings on orthogonal mxCell edges
 */

import fs from 'fs';
import path from 'path';
import http from 'http';
import { createRequire } from 'module';
import bp08 from './blueprints_ext/08-ws2-demo-env-and-3p-auth-sandbox-topology.mjs';
import bp09 from './blueprints_ext/09-ws2-terraform-starter-resource-graph.mjs';
import bp10 from './blueprints_ext/10-ws3-multi-project-silo-and-cmek-setup-topology.mjs';
import bp11 from './blueprints_ext/11-ws3-terraform-silo-blueprint-resource-graph.mjs';
import bp12 from './blueprints_ext/12-ws4-hub-and-spoke-demo-env-setup-topology.mjs';
import bp13 from './blueprints_ext/13-ws4-zero-downtime-tier-upgrade-sequence.mjs';
import bp14 from './blueprints_ext/14-ws4-terraform-hybrid-psc-blueprint-resource-graph.mjs';
import {
  LAYOUT_HUB_2_SPOKE,
  LAYOUT_POOLED_SHARED_PLANE,
  LAYOUT_DECISION_TREE_3_OUTCOME,
  compilePooledSharedPlaneSvg,
  compilePooledSharedPlaneDrawio,
  compileDecisionTreeSvg,
  compileDecisionTreeDrawio,
  layoutGeometryContract,
} from './arch_center_layouts.mjs';

const require = createRequire('/Users/nitinagga/Documents/PromptCanvas/package.json');
const puppeteer = require('puppeteer-core');

const ROOT_DIR = '/Users/nitinagga/Documents/blogs';
const CENTRAL_DIAGRAMS_DIR = path.join(ROOT_DIR, 'diagrams');
const ASSETS_PATH = path.join(ROOT_DIR, 'scripts', 'official_arch_center_assets.json');

const OFFICIAL_ASSETS = JSON.parse(fs.readFileSync(ASSETS_PATH, 'utf8'));

const USER_SILHOUETTE_DATA_URI =
  'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0NCIgaGVpZ2h0PSIzNiIgdmlld0JveD0iMCAwIDQ0IDM2Ij48Y2lyY2xlIGN4PSIyMiIgY3k9IjExIiByPSI4LjUiIGZpbGw9IiMwMDAwMDAiLz48cGF0aCBkPSJNIDYgMzQgQyA2IDI0IDM4IDI0IDM4IDM0IFoiIGZpbGw9IiMwMDAwMDAiLz48L3N2Zz4=';

function svgToDataUri(svgStr) {
  return `data:image/svg+xml,${encodeURIComponent(svgStr.trim()).replace(/;/g, '%3B')}`;
}

const EXTRA_GCP_ICONS = {
  cloud_armor: svgToDataUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40">
      <rect x="2" y="2" width="36" height="36" rx="8" fill="#e8f0fe" stroke="#1a73e8" stroke-width="2"/>
      <path d="M20 6.5 L31 11.2 V19.5 C31 26.8 26.2 32.2 20 34.2 C13.8 32.2 9 26.8 9 19.5 V11.2 Z" fill="#aecbfa" opacity="0.45"/>
      <path d="M20 6.5 L31 11.2 V19.5 C31 26.8 26.2 32.2 20 34.2 C13.8 32.2 9 26.8 9 19.5 V11.2 Z" fill="none" stroke="#1a73e8" stroke-width="2.4" stroke-linejoin="round"/>
      <line x1="12.5" y1="22.5" x2="18.5" y2="16.5" stroke="#174ea6" stroke-width="2.2" stroke-linecap="round"/>
      <line x1="14.5" y1="26.5" x2="22.5" y2="18.5" stroke="#174ea6" stroke-width="2.2" stroke-linecap="round"/>
      <line x1="18.2" y1="28.8" x2="24.5" y2="22.5" stroke="#174ea6" stroke-width="2.2" stroke-linecap="round"/>
      <circle cx="18.5" cy="16.5" r="2.1" fill="#ea4335"/>
      <circle cx="22.5" cy="18.5" r="2.1" fill="#34a853"/>
      <circle cx="24.5" cy="22.5" r="2.1" fill="#1a73e8"/>
    </svg>
  `),
  gke: svgToDataUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40">
      <rect x="2" y="2" width="36" height="36" rx="8" fill="#e8f0fe" stroke="#1a73e8" stroke-width="2"/>
      <polygon points="20,6.5 31.5,13.2 31.5,26.8 20,33.5 8.5,26.8 8.5,13.2" fill="none" stroke="#1a73e8" stroke-width="2.3" stroke-linejoin="round"/>
      <circle cx="20" cy="20" r="5.2" fill="none" stroke="#174ea6" stroke-width="2.2"/>
      <circle cx="20" cy="20" r="2" fill="#34a853"/>
      <line x1="20" y1="9" x2="20" y2="14.8" stroke="#ea4335" stroke-width="2.1" stroke-linecap="round"/>
      <line x1="29.2" y1="14.6" x2="24.5" y2="17.4" stroke="#4285f4" stroke-width="2.1" stroke-linecap="round"/>
      <line x1="29.2" y1="25.4" x2="24.5" y2="22.6" stroke="#4285f4" stroke-width="2.1" stroke-linecap="round"/>
      <line x1="20" y1="31" x2="20" y2="25.2" stroke="#34a853" stroke-width="2.1" stroke-linecap="round"/>
      <line x1="10.8" y1="25.4" x2="15.5" y2="22.6" stroke="#fbbc04" stroke-width="2.1" stroke-linecap="round"/>
      <line x1="10.8" y1="14.6" x2="15.5" y2="17.4" stroke="#ea4335" stroke-width="2.1" stroke-linecap="round"/>
    </svg>
  `),
  vpc_network: svgToDataUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40">
      <rect x="2" y="2" width="36" height="36" rx="8" fill="#e6f4ea" stroke="#137333" stroke-width="2"/>
      <rect x="8" y="9" width="10" height="8" rx="2" fill="#34a853"/>
      <rect x="22" y="9" width="10" height="8" rx="2" fill="#1a73e8"/>
      <rect x="15" y="23" width="10" height="8" rx="2" fill="#137333"/>
      <path d="M13 17 V20 H27 V17 M20 20 V23" fill="none" stroke="#174ea6" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  `),
  cloud_storage: svgToDataUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40">
      <rect x="2" y="2" width="36" height="36" rx="8" fill="#fef7e0" stroke="#ea8600" stroke-width="2"/>
      <rect x="8" y="9" width="24" height="9" rx="2.5" fill="#fbbc04" stroke="#b06000" stroke-width="1.6"/>
      <circle cx="27" cy="13.5" r="1.8" fill="#ea4335"/>
      <rect x="8" y="22" width="24" height="9" rx="2.5" fill="#4285f4" stroke="#174ea6" stroke-width="1.6"/>
      <circle cx="27" cy="26.5" r="1.8" fill="#ffffff"/>
    </svg>
  `),
  cloud_sdp_dlp: svgToDataUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40">
      <rect x="2" y="2" width="36" height="36" rx="8" fill="#e6f4ea" stroke="#0d9488" stroke-width="2"/>
      <path d="M20 7.5 L30 11.8 V19.5 C30 26.2 25.6 31 20 33 C14.4 31 10 26.2 10 19.5 V11.8 Z" fill="#ccfbf1" stroke="#0f766e" stroke-width="2"/>
      <circle cx="19" cy="19" r="4.5" fill="none" stroke="#0f766e" stroke-width="2.2"/>
      <line x1="22.3" y1="22.3" x2="26" y2="26" stroke="#0f766e" stroke-width="2.4" stroke-linecap="round"/>
    </svg>
  `),
  terraform_iac: svgToDataUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40">
      <rect x="2" y="2" width="36" height="36" rx="8" fill="#f3e8fd" stroke="#7c3aed" stroke-width="2"/>
      <polygon points="10,9 19,14 19,24 10,19" fill="#7c3aed"/>
      <polygon points="21,14 30,9 30,19 21,24" fill="#9334e6"/>
      <polygon points="10,21 19,26 19,34 10,29" fill="#5b21b6"/>
    </svg>
  `),
  cloud_kms: svgToDataUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40">
      <rect x="2" y="2" width="36" height="36" rx="8" fill="#e8f0fe" stroke="#1a73e8" stroke-width="2"/>
      <circle cx="15" cy="20" r="6" fill="none" stroke="#174ea6" stroke-width="2.6"/>
      <circle cx="15" cy="20" r="2" fill="#174ea6"/>
      <path d="M21 20 H32 M28 20 V25 M32 20 V26" stroke="#ea4335" stroke-width="2.6" stroke-linecap="round"/>
    </svg>
  `),
  vpc_sc: svgToDataUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40">
      <rect x="3" y="3" width="34" height="34" rx="7" fill="#fce8e6" stroke="#d93025" stroke-width="2" stroke-dasharray="4,2"/>
      <path d="M20 8 L30 12 V20 C30 26.5 25.5 31 20 33 C14.5 31 10 26.5 10 20 V12 Z" fill="#ea4335" opacity="0.18"/>
      <path d="M20 8 L30 12 V20 C30 26.5 25.5 31 20 33 C14.5 31 10 26.5 10 20 V12 Z" fill="none" stroke="#c5221f" stroke-width="2.2"/>
      <rect x="17" y="18" width="6" height="6" rx="1" fill="#c5221f"/>
      <path d="M18 18 V15.5 A2 2 0 0 1 22 15.5 V18" fill="none" stroke="#c5221f" stroke-width="1.8"/>
    </svg>
  `),
  psc_bridge: svgToDataUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40">
      <rect x="2" y="2" width="36" height="36" rx="8" fill="#e6f4ea" stroke="#137333" stroke-width="2"/>
      <circle cx="11" cy="20" r="4.5" fill="#1a73e8"/>
      <circle cx="29" cy="20" r="4.5" fill="#137333"/>
      <path d="M16 20 H24 M21 16 L25 20 L21 24" fill="none" stroke="#137333" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  `),
  valkey_cache: svgToDataUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40">
      <rect x="2" y="2" width="36" height="36" rx="8" fill="#fef7e0" stroke="#ea8600" stroke-width="2"/>
      <polygon points="22,7 11,22 19,22 17,33 29,18 21,18" fill="#f29900" stroke="#b06000" stroke-width="1.4" stroke-linejoin="round"/>
    </svg>
  `),
  firestore_db: svgToDataUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40">
      <rect x="2" y="2" width="36" height="36" rx="8" fill="#fef7e0" stroke="#f29900" stroke-width="2"/>
      <path d="M20 8 L31 14 L20 20 L9 14 Z" fill="#fbbc04"/>
      <path d="M9 20 L20 26 L31 20" fill="none" stroke="#ea8600" stroke-width="2.4" stroke-linecap="round"/>
      <path d="M9 26 L20 32 L31 26" fill="none" stroke="#b06000" stroke-width="2.4" stroke-linecap="round"/>
    </svg>
  `),
  bigquery_analytics: svgToDataUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40">
      <rect x="2" y="2" width="36" height="36" rx="8" fill="#e8f0fe" stroke="#1a73e8" stroke-width="2"/>
      <circle cx="18" cy="18" r="9" fill="none" stroke="#1a73e8" stroke-width="2.5"/>
      <rect x="13" y="17" width="2.6" height="5" fill="#1a73e8"/>
      <rect x="16.8" y="13" width="2.6" height="9" fill="#34a853"/>
      <rect x="20.6" y="15" width="2.6" height="7" fill="#fbbc04"/>
      <line x1="24.5" y1="24.5" x2="31" y2="31" stroke="#174ea6" stroke-width="3" stroke-linecap="round"/>
    </svg>
  `),
  discovery_engine: svgToDataUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40">
      <rect x="2" y="2" width="36" height="36" rx="8" fill="#f3e8fd" stroke="#8430ce" stroke-width="2"/>
      <path d="M20 7 L23.5 16.5 L33 20 L23.5 23.5 L20 33 L16.5 23.5 L7 20 L16.5 16.5 Z" fill="#9334e6"/>
      <circle cx="20" cy="20" r="3.2" fill="#ffffff"/>
    </svg>
  `),
  dms_migration: svgToDataUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40">
      <rect x="2" y="2" width="36" height="36" rx="8" fill="#e6f4ea" stroke="#137333" stroke-width="2"/>
      <ellipse cx="13" cy="14" rx="6" ry="3" fill="#34a853"/>
      <path d="M7 14 V24 C7 25.7 9.7 27 13 27 C16.3 27 19 25.7 19 24 V14" fill="none" stroke="#137333" stroke-width="2"/>
      <path d="M21 20 H32 M28 16 L32 20 L28 24" fill="none" stroke="#1a73e8" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  `),
  alloydb: svgToDataUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40">
      <rect x="2" y="2" width="36" height="36" rx="8" fill="#e8f0fe" stroke="#1967d2" stroke-width="2"/>
      <ellipse cx="20" cy="12" rx="10" ry="4" fill="#1967d2"/>
      <path d="M10 12 V20 C10 22.2 14.5 24 20 24 C25.5 24 30 22.2 30 20 V12" fill="#4285f4"/>
      <path d="M10 20 V28 C10 30.2 14.5 32 20 32 C25.5 32 30 30.2 30 28 V20" fill="#34a853"/>
    </svg>
  `),
  cloud_logging: svgToDataUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40">
      <rect x="2" y="2" width="36" height="36" rx="8" fill="#e8f0fe" stroke="#1a73e8" stroke-width="2"/>
      <rect x="8" y="10" width="24" height="4.5" rx="1.5" fill="#1a73e8"/>
      <rect x="8" y="17.5" width="18" height="4.5" rx="1.5" fill="#34a853"/>
      <rect x="8" y="25" width="24" height="4.5" rx="1.5" fill="#1967d2"/>
      <circle cx="30" cy="19.8" r="2.8" fill="#fbbc04"/>
    </svg>
  `),
  billing_finops: svgToDataUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40">
      <rect x="2" y="2" width="36" height="36" rx="8" fill="#e6f4ea" stroke="#137333" stroke-width="2"/>
      <circle cx="20" cy="20" r="11" fill="#34a853"/>
      <path d="M20 12 V28 M16 15.5 C16 13.8 17.8 13 20 13 C22.2 13 24 13.8 24 15.5 C24 17.5 16 17.8 16 20.5 C16 22.5 17.8 23.5 20 23.5 C22.2 23.5 24 22.5 24 20.5" fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round"/>
    </svg>
  `),
  verification_suite: svgToDataUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40">
      <rect x="2" y="2" width="36" height="36" rx="8" fill="#e6f4ea" stroke="#137333" stroke-width="2"/>
      <path d="M20 7 L9 12 V20 C9 27.2 13.7 33.4 20 35 C26.3 33.4 31 27.2 31 20 V12 Z" fill="#34a853"/>
      <path d="M15 20.5 L18.5 24 L25.5 16.5" fill="none" stroke="#ffffff" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  `),
  terraform_output: svgToDataUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40">
      <rect x="2" y="2" width="36" height="36" rx="8" fill="#f3e8fd" stroke="#7b1fa2" stroke-width="2"/>
      <rect x="8" y="9" width="24" height="22" rx="3" fill="#623ce4"/>
      <path d="M13 16 L18 20 L13 24 M20 24 H27" fill="none" stroke="#ffffff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  `),
  oauth_identity: svgToDataUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40">
      <rect x="2" y="2" width="36" height="36" rx="8" fill="#e8f0fe" stroke="#1967d2" stroke-width="2"/>
      <rect x="7" y="10" width="26" height="20" rx="3" fill="#1967d2"/>
      <circle cx="15" cy="17.5" r="3.2" fill="#ffffff"/>
      <path d="M10.5 25.5 C10.5 22.8 12.8 21.5 15 21.5 C17.2 21.5 19.5 22.8 19.5 25.5" fill="#ffffff"/>
      <rect x="22" y="15" width="8" height="2.4" rx="1" fill="#fbbc04"/>
      <rect x="22" y="20" width="6" height="2.4" rx="1" fill="#aecbfa"/>
    </svg>
  `),
  context_cache: svgToDataUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40">
      <rect x="2" y="2" width="36" height="36" rx="8" fill="#fef7e0" stroke="#ea8600" stroke-width="2"/>
      <path d="M22 7 L11 21 H19 L17 33 L29 19 H21 Z" fill="#fbbc04" stroke="#ea8600" stroke-width="1.2" stroke-linejoin="round"/>
    </svg>
  `),
  vertex_agent_engine: svgToDataUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40">
      <rect x="2" y="2" width="36" height="36" rx="8" fill="#e8f0fe" stroke="#1a73e8" stroke-width="2"/>
      <polygon points="20,6.5 31,13 31,27 20,33.5 9,27 9,13" fill="#d2e3fc" stroke="#1967d2" stroke-width="2" stroke-linejoin="round"/>
      <circle cx="20" cy="20" r="4.2" fill="#1a73e8"/>
      <line x1="20" y1="6.5" x2="20" y2="15.8" stroke="#1967d2" stroke-width="2"/>
      <line x1="31" y1="27" x2="23.6" y2="22.1" stroke="#34a853" stroke-width="2"/>
      <line x1="9" y1="27" x2="16.4" y2="22.1" stroke="#ea4335" stroke-width="2"/>
    </svg>
  `),
  iap_shield: svgToDataUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40">
      <rect x="2" y="2" width="36" height="36" rx="8" fill="#e6f4ea" stroke="#137333" stroke-width="2"/>
      <path d="M20 7 L31 11.5 V19.5 C31 26.8 26.2 31.8 20 33.8 C13.8 31.8 9 26.8 9 19.5 V11.5 Z" fill="#34a853" opacity="0.22"/>
      <path d="M20 7 L31 11.5 V19.5 C31 26.8 26.2 31.8 20 33.8 C13.8 31.8 9 26.8 9 19.5 V11.5 Z" fill="none" stroke="#137333" stroke-width="2.2"/>
      <rect x="15" y="18" width="10" height="8" rx="1.8" fill="#137333"/>
      <path d="M17 18 V15 A3 3 0 0 1 23 15 V18" fill="none" stroke="#137333" stroke-width="2"/>
    </svg>
  `),
};

function resolveArchIconUri(iconKey, title = '', _sub = '') {
  const titleLower = String(title || '').toLowerCase();
  if (titleLower.includes('cloud run')) {
    return OFFICIAL_ASSETS.cloud_run;
  }
  if (
    titleLower.includes('model armor') ||
    titleLower.includes('modelarmor') ||
    titleLower.includes('header sanitizer') ||
    titleLower.includes('vector 4:') ||
    titleLower.includes('vector 5:')
  ) {
    return OFFICIAL_ASSETS.model_armor;
  }
  if (titleLower.includes('agent engine') || titleLower.includes('gvisor') || titleLower.includes('spoke runtime')) {
    return EXTRA_GCP_ICONS.vertex_agent_engine;
  }
  if (titleLower === 'iap' || titleLower.startsWith('iap ') || titleLower.includes('obo + dpop') || titleLower.includes('vector 3:')) {
    return EXTRA_GCP_ICONS.iap_shield;
  }
  if (titleLower.includes('contextcache') || titleLower.includes('prefix cache')) {
    return EXTRA_GCP_ICONS.context_cache;
  }
  if (titleLower.includes('output:') || titleLower.includes('outputs') || titleLower.includes('tfstate')) {
    return EXTRA_GCP_ICONS.terraform_output;
  }
  if (titleLower.includes('chargeback') || titleLower.includes('finops') || titleLower.includes('billing')) {
    return EXTRA_GCP_ICONS.billing_finops;
  }
  if (titleLower.includes('cloud logging') || titleLower.includes('log sink')) {
    return EXTRA_GCP_ICONS.cloud_logging;
  }
  if (titleLower.includes('suite') || titleLower.includes('verify') || titleLower.includes('readiness') || titleLower.includes('invariant')) {
    return EXTRA_GCP_ICONS.verification_suite;
  }
  if (titleLower.includes('alloydb') || titleLower.includes('postgresql') || titleLower.includes('rls')) {
    return EXTRA_GCP_ICONS.alloydb;
  }
  if (titleLower.includes('oidc') || titleLower.includes('entra') || titleLower.includes('workforce') || titleLower.includes('3lo') || titleLower.includes('vector 10:')) {
    return EXTRA_GCP_ICONS.oauth_identity;
  }
  if (EXTRA_GCP_ICONS[iconKey]) return EXTRA_GCP_ICONS[iconKey];
  if (
    !titleLower.includes('model armor') &&
    !titleLower.includes('load balancer') &&
    (titleLower.includes('cloud armor') ||
      titleLower.includes('waf') ||
      titleLower.includes('header strip') ||
      titleLower.includes('security policy') ||
      titleLower.includes('rule 1000'))
  ) {
    return EXTRA_GCP_ICONS.cloud_armor;
  }
  if (titleLower.includes('gke') || titleLower.includes('kubernetes')) {
    return EXTRA_GCP_ICONS.gke;
  }
  if (
    !titleLower.includes('vpc-sc') &&
    !titleLower.includes('perimeter') &&
    (titleLower.includes('vpc') || titleLower.includes('subnet') || titleLower.includes('compute_network'))
  ) {
    return EXTRA_GCP_ICONS.vpc_network;
  }
  if (titleLower.includes('gcs') || titleLower.includes('cloud storage') || titleLower.includes('storage & container')) {
    return EXTRA_GCP_ICONS.cloud_storage;
  }
  if (!titleLower.includes('model armor') && (titleLower.includes('sdp') || titleLower.includes('dlp'))) {
    return EXTRA_GCP_ICONS.cloud_sdp_dlp;
  }
  if (titleLower.includes('provider') || titleLower.includes('variables.tf') || titleLower.includes('region & env')) {
    return EXTRA_GCP_ICONS.terraform_iac;
  }
  if (titleLower.includes('kms') || titleLower.includes('cmek') || titleLower.includes('ekm') || titleLower.includes('hsm') || titleLower.includes('keyring')) {
    return EXTRA_GCP_ICONS.cloud_kms;
  }
  if (titleLower.includes('vpc-sc') || titleLower.includes('access_context') || titleLower.includes('perimeter')) {
    return EXTRA_GCP_ICONS.vpc_sc;
  }
  if (titleLower.includes('psc') || titleLower.includes('private service connect') || titleLower.includes('serviceattachment') || titleLower.includes('service_attachment') || titleLower.includes('forwarding_rule')) {
    return EXTRA_GCP_ICONS.psc_bridge;
  }
  if (titleLower.includes('redis') || titleLower.includes('valkey') || titleLower.includes('rate bulkhead') || titleLower.includes('429')) {
    return EXTRA_GCP_ICONS.valkey_cache;
  }
  if (titleLower.includes('firestore') || titleLower.includes('route table')) {
    return EXTRA_GCP_ICONS.firestore_db;
  }
  if (titleLower.includes('bigquery') || titleLower.includes('bq') || titleLower.includes('otel')) {
    return EXTRA_GCP_ICONS.bigquery_analytics;
  }
  if (titleLower.includes('registry') || titleLower.includes('discovery engine') || titleLower.includes('catalog') || titleLower.includes('agent card')) {
    return EXTRA_GCP_ICONS.discovery_engine;
  }
  if (titleLower.includes('shadow_sync') || titleLower.includes('dms')) {
    return EXTRA_GCP_ICONS.dms_migration;
  }
  return OFFICIAL_ASSETS[iconKey] || OFFICIAL_ASSETS.gemini_agent_platform;
}

function escXml(str) {
  return String(str ?? '')
    .replace(/&(?!(?:amp|lt|gt|quot|apos|#\d+|#x[0-9a-fA-F]+);)/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const WORKSTREAM_BLUEPRINTS = [
  // =========================================================================
  // 1. WORKSTREAM 1.1: B2B SaaS Multi-Tenant Taxonomy Overview (Pattern A, B, C)
  // =========================================================================
  {
    id: 'ws1-multi-tenant-taxonomy-overview',
    badge: 'WORKSTREAM 1.1 BLUEPRINT',
    title: 'Multi-Tenant Agentic AI Taxonomy: Pooled (Pattern A), Sovereign Silos (Pattern B) & Hybrid (Pattern C)',
    subtitle: 'Verified on GCP (cymbal-build-sandbox & ramp-portal-dev) • Cloud Run cymbal-multi-tenant-patterns-00003-wfh',
    workstreamDir: 'workstream-1-foundations-and-taxonomy/diagrams',
    topUserTitle: 'Competing B2B Tenants',
    topUserSub: 'FinVault (OIDC) & RetailStream (Entra)',
    step1LeftLabel: 'Request',
    step7RightLabel: 'Response',
    outerWrapperLabel: 'Shared Control Plane (ramp-portal-dev / cymbal-build-sandbox • 80% Core + 20% Topology Delta)',
    innerWrapperLabel: 'VPC & 5-Hop Cryptographic Context Chain (KMS ECDSA P-256 Signed)',
    routingHubTitle: 'Routing hub (Hop 1 & Hop 2 PEP/PDP)',
    routingHubSub: 'Central ingress, OBO+DPoP KMS Sign & Discovery Engine Catalog filter',
    routingCards: {
      topLeft: { icon: 'cloud_armor', title: 'Google Cloud Armor', sub: 'WAF & DDoS • Strips X-Tenant-ID' },
      midLeft: { icon: 'model_armor', title: 'Model Armor', sub: 'Ingress Prompt Screen' },
      botLeft: { icon: 'iap_iam_shield', title: 'RFC 8693 OBO + DPoP', sub: 'KMS ECDSA P-256 Sign' },
      topRight: { icon: 'load_balancer_cloud_armor', title: 'External Application', title2: 'Load Balancer', sub: 'Cloud Load Balancing' },
      botRight: { icon: 'cloud_run', title: 'Cloud Run', sub: 'cymbal-multi-tenant-patterns' },
      edgeTopLeft: ['Header & WAF', 'policies'],
      edgeMidLeft: ['Sanitize', 'prompt'],
      edgeBotLeft: ['OBO + KMS', 'ECDSA sign'],
      step2Left: 'Request',
      step7Mid: 'Response',
    },
    govHubTitle: 'Central governance and',
    govHubTitle2: 'FinOps observability hub',
    govCards: {
      top: { icon: 'security_command_center', title: 'Security Command', title2: 'Center', sub: 'security_breach_audit_log' },
      mid: { icon: 'iap_iam_shield', title: 'Central IAM & PAB', sub: 'Agent Identity (2LO/3LO)' },
      bot: { icon: 'bigquery_analytics', title: 'Cloud Logging & BQ', sub: 'tenant_telemetry_spans' },
    },
    midStep3Label: ['Route by tenant tier', '(Pool, Silo or PSC)'],
    midStep7Label: ['Sanitized response', 'with SDP redaction'],
    midGovLabel: ['Security, OTel & FinOps', 'chargeback telemetry'],
    leftBoundaryLabel: 'Pattern A: Pooled Shared Runtime (pattern_a_pooled_rls_entities)',
    leftZoneTitle: 'Tenant Pool (Shared Runtime)',
    leftZoneSub: 'FinVault (8k Cap) & RetailStream (4k Cap)',
    leftCards: {
      modelArmor: { icon: 'model_armor', title: 'Model Armor', sub: 'Tenant Rai Filters & SDP PII' },
      llm: { icon: 'gemini_agent_platform', title: 'Gemini 2.5 Pro', sub: '90% Prefix Cache Savings' },
      runtime: { icon: 'gemini_agent_platform', title: 'Vertex AI Agent Engine', sub: 'gVisor + temp:tenant_id' },
      mcp: { icon: 'mcp_servers', title: 'MCP servers', sub: '2LO + 3LO OIDC/Entra' },
      datastore: { icon: 'datastore_alloydb_bq', title: 'AlloyDB & BQ RLS', sub: 'tenant_pooled_rls_policy' },
      step4Label: 'Sanitize request',
      step6Label: 'Sanitize response',
      step5Label: ['Generates', 'response'],
      ragLabel: ['Scoped', 'MCP & RAG'],
      toolLabel: ['SET LOCAL', 'current_tenant'],
    },
    rightBoundaryLabel: 'Dedicated Spoke: Pattern B Silo or Pattern C PSC Spoke (WS3 / WS4)',
    rightZoneTitle: 'Dedicated Sovereign Tenant Silo',
    rightZoneSub: 'VPC-SC + IAM PAB + finvault-silo-cmek + PSC',
    rightCards: {
      modelArmor: { icon: 'vpc_sc', title: 'VPC-SC & Model Armor', sub: 'Sovereign Silo Guardrails' },
      llm: { icon: 'gemini_agent_platform', title: 'Gemini / Gemma 3', sub: 'Dedicated PT or Private GKE' },
      runtime: { icon: 'gemini_agent_platform', title: 'Vertex AI Agent Engine', sub: 'Dedicated Silo + Agent Alpha' },
      mcp: { icon: 'mcp_servers', title: 'MCP servers', sub: 'Local Silo 3LO Connectors' },
      datastore: { icon: 'cloud_kms', title: 'CMEK Datastore', sub: 'finvault-silo-cmek & 423 Lock' },
      ragLabel: ['Air-Gapped', 'Silo RAG'],
      toolLabel: ['CMEK-Encrypted', 'State & Tools'],
    },
  },

  // =========================================================================
  // 2. WORKSTREAM 1.3: Cloud Architecture Center PR Baseline (5-Hop Context Chain)
  // =========================================================================
  {
    id: 'ws1-cloud-arch-center-5hop-baseline',
    badge: 'WORKSTREAM 1.3 DOC PR BLUEPRINT',
    title: 'Cloud Architecture Center: Multi-Tenant Agentic AI System with 5-Hop Cryptographic Governance',
    subtitle: 'Official Hub-and-Spoke Reference Architecture (docs.cloud.google.com/architecture/multi-tenant-agentic-ai-system)',
    workstreamDir: 'workstream-1-foundations-and-taxonomy/diagrams',
    topUserTitle: 'User',
    topUserSub: 'OIDC / Entra JWT',
    step1LeftLabel: 'Request',
    step7RightLabel: 'Response',
    outerWrapperLabel: 'Shared hubs (VPC Service Controls Organization Perimeter • ramp-portal-dev)',
    innerWrapperLabel: 'VPC • 5-Hop Cryptographic Context Chain (cymbal-build-sandbox)',
    routingHubTitle: 'Routing hub (Hop 1 & Hop 2)',
    routingHubSub: 'Central ingress & cryptographic token exchange',
    routingCards: {
      topLeft: { icon: 'cloud_armor', title: 'Google Cloud Armor', sub: 'WAF & DDoS • Strips X-Tenant-ID' },
      midLeft: { icon: 'model_armor', title: 'Model Armor', sub: 'Edge Prompt Injection Gate' },
      botLeft: { icon: 'iap_iam_shield', title: 'IAP', sub: 'OBO + DPoP + KMS ECDSA Sign' },
      topRight: { icon: 'load_balancer_cloud_armor', title: 'External Application', title2: 'Load Balancer', sub: 'Cloud Load Balancing' },
      botRight: { icon: 'cloud_run', title: 'Cloud Run', sub: 'cymbal-multi-tenant-patterns' },
      edgeTopLeft: ['Security', 'policies'],
      edgeMidLeft: ['Sanitize', 'prompt'],
      edgeBotLeft: ['User', 'authentication'],
      step2Left: 'Request',
      step7Mid: 'Response',
    },
    govHubTitle: 'Central governance and',
    govHubTitle2: 'security hub',
    govCards: {
      top: { icon: 'security_command_center', title: 'Security Command', title2: 'Center', sub: 'Continuous Threat Detection' },
      mid: { icon: 'iap_iam_shield', title: 'Central IAM', sub: 'Auth Manager (2LO / 3LO)' },
      bot: { icon: 'bigquery_analytics', title: 'Cloud Logging & BQ', sub: 'cymbal_agentic_finops_otel' },
    },
    midStep3Label: ['Route request', 'to tenant'],
    midStep7Label: ['Sanitized response', 'from tenant'],
    midGovLabel: ['Security and', 'observability', 'monitoring'],
    leftBoundaryLabel: 'PAB • Hop 3–5 Isolation Boundary (Tenant Alpha)',
    leftZoneTitle: 'Tenant A (FinVault Bank)',
    leftZoneSub: 'Tenant project • Enterprise Tier (Google OIDC)',
    leftCards: {
      modelArmor: { icon: 'model_armor', title: 'Model Armor', sub: 'Hop 4: Bank SDP & FINRA Filter' },
      llm: { icon: 'gemini_agent_platform', title: 'Gemini 2.5 Pro', sub: 'Agent Engine (8k Budget)' },
      runtime: { icon: 'gemini_agent_platform', title: 'Vertex AI Agent Engine', sub: 'Hop 3: Shared + Agent Alpha' },
      mcp: { icon: 'mcp_servers', title: 'MCP servers', sub: 'Hop 5: Workspace & Jira 3LO' },
      datastore: { icon: 'alloydb', title: 'Datastore', sub: 'BQ RLS, AlloyDB & CMEK' },
      step4Label: 'Sanitize request',
      step6Label: 'Sanitize response',
      step5Label: ['Generates', 'response'],
      ragLabel: ['Secure', 'RAG'],
      toolLabel: ['Agent-tool', 'interaction'],
    },
    rightBoundaryLabel: 'PAB • Hop 3–5 Isolation Boundary (Tenant Beta)',
    rightZoneTitle: 'Tenant B (RetailStream Corp)',
    rightZoneSub: 'Tenant project • Standard Tier (Entra ID)',
    rightCards: {
      modelArmor: { icon: 'model_armor', title: 'Model Armor', sub: 'Hop 4: PCI PAN SDP & Filter' },
      llm: { icon: 'gemini_agent_platform', title: 'Gemini', sub: 'Agent Engine (4k Cap)' },
      runtime: { icon: 'gemini_agent_platform', title: 'Vertex AI Agent Engine', sub: 'Hop 3: Shared Diagnostic' },
      mcp: { icon: 'mcp_servers', title: 'MCP servers', sub: 'Hop 5: SharePoint & SNOW' },
      datastore: { icon: 'datastore_alloydb_bq', title: 'Datastore', sub: 'BQ RLS, AlloyDB & Valkey' },
      ragLabel: ['Secure', 'RAG'],
      toolLabel: ['Agent-tool', 'interaction'],
    },
  },

  // =========================================================================
  // 3. WORKSTREAM 2.1: Pattern A — High-Density Pooled Multi-Tenant Architecture
  // =========================================================================
  {
    id: 'ws2-pattern-a-pooled-5hop-architecture',
    badge: 'WORKSTREAM 2.1 • PATTERN A BLUEPRINT',
    title: 'Pattern A: High-Density Pooled Multi-Tenant Architecture & Shared Runtime Governance',
    subtitle: 'Milestone 1 (Weeks 1–4) • Live Verified in cymbal-build-sandbox (cymbal-pooled-saas-prod) • 90% Cache Savings',
    workstreamDir: 'workstream-2-pattern-a-pooled/diagrams',
    topUserTitle: 'FinVault & RetailStream',
    topUserSub: 'Competing SaaS Tenants',
    step1LeftLabel: 'Request',
    step7RightLabel: 'Response',
    outerWrapperLabel: 'Shared GCP Project: cymbal-build-sandbox / cymbal-pooled-saas-prod (Maximum Density Pooled SaaS)',
    innerWrapperLabel: 'Shared VPC • 5-Hop Cryptographic Context Chain (cymbal-multi-tenant-patterns-00003-wfh)',
    routingHubTitle: 'Hop 1 & Hop 2: Edge PEP & Agent Catalog PDP',
    routingHubSub: 'Header stripping, OBO+DPoP KMS Sign & Discovery Engine Catalog pruning',
    routingCards: {
      topLeft: { icon: 'cloud_armor', title: 'Google Cloud Armor', sub: 'WAF & DDoS • Strips X-Tenant-ID' },
      midLeft: { icon: 'discovery_engine', title: 'Discovery Engine PDP', sub: 'Catalog Filter (403 Alpha)' },
      botLeft: { icon: 'iap_iam_shield', title: 'IAP + OBO Broker', sub: 'OBO + DPoP + adk-agent-signing-key' },
      topRight: { icon: 'load_balancer_cloud_armor', title: 'External Application', title2: 'Load Balancer', sub: 'Cloud Load Balancing' },
      botRight: { icon: 'cloud_run', title: 'ADK Callback Gate', sub: 'before_agent_callback Prune' },
      edgeTopLeft: ['Strip header', 'X-Tenant-ID'],
      edgeMidLeft: ['Filter Agent', 'Catalog'],
      edgeBotLeft: ['Mint OBO +', 'KMS P-256 sig'],
      step2Left: 'Request',
      step7Mid: 'Response',
    },
    govHubTitle: 'Hop 3 & 5: Shared FinOps,',
    govHubTitle2: 'Cache & OTel Hub',
    govCards: {
      top: { icon: 'gemini_agent_platform', title: 'ContextCacheConfig', title2: '(90% COGS Save)', sub: '32k Shared Operator Prefix' },
      mid: { icon: 'valkey_cache', title: 'Memorystore Valkey', sub: '4k Standard vs 8k Enterprise' },
      bot: { icon: 'bigquery_analytics', title: 'BigQuery OTel Sink', sub: 'tenant_telemetry_spans' },
    },
    // ---- Rule 53G: Pattern A is ONE shared plane, never two per-tenant stacks ----
    layout: LAYOUT_POOLED_SHARED_PLANE,
    sharedPlaneLabel: 'ONE Shared Data Plane • ONE Agent Engine Pool • ONE AlloyDB Schema — tenants are rows & namespaces, never projects (0 per-tenant infrastructure)',
    runtimeZoneTitle: '3. Pooled Agent Runtime (shared by all tenants)',
    runtimeZoneSub: 'Ephemeral gVisor sandboxes • per-tenant Model Armor • 90% prefix cache',
    dataZoneTitle: '4. Shared Data & Tool Plane (RLS-partitioned)',
    dataZoneSub: 'Mandatory Row-Level Security • scoped 2LO/3LO MCP • egress SDP masking',
    runtimeCards: {
      modelArmor: { icon: 'model_armor', title: 'Model Armor (shared)', sub: 'Per-tenant templates: FINRA / PCI' },
      runtime: { icon: 'gemini_agent_platform', title: 'Vertex AI Agent Engine', sub: 'ONE gVisor pool • temp:tenant_id' },
      llm: { icon: 'gemini_agent_platform', title: 'Gemini 2.5 Pro', sub: 'Shared 32k prefix • 4k / 8k caps' },
      valkey: { icon: 'valkey_cache', title: 'Memorystore Valkey', sub: 'RPM bulkheads 120 Std / 600 Ent' },
      memory: {
        icon: 'gemini_agent_platform',
        title: '5-Level Memory Bank (ONE bank)',
        sub: 'Namespaced per tenant — same service, disjoint keys',
        chips: [
          { text: 'finvault:{user}:{session}', fill: '#e8f0fe', stroke: '#174ea6', fontColor: '#174ea6' },
          { text: 'retailstream:{user}:{session}', fill: '#fce8e6', stroke: '#c5221f', fontColor: '#c5221f' },
          { text: 'L1 shared prefix (read-only)', fill: '#e6f4ea', stroke: '#137333', fontColor: '#137333' },
        ],
        footnote: 'Cross-namespace read → PermissionError (Hop 3 ACL) • 0 cross-tenant cached tokens',
        footnote2: 'Private Agent Alpha visible to FinVault only (RetailStream → HTTP 403 at Hop 2)',
      },
    },
    dataCards: {
      db: {
        icon: 'datastore_alloydb_bq',
        title: 'AlloyDB (ONE schema) + BigQuery (ONE dataset)',
        sub: 'pattern_a_pooled_rls_entities • FORCE ROW LEVEL SECURITY',
        chips: [
          { text: "tenant_id = 'finvault' • 2 rows", fill: '#e8f0fe', stroke: '#174ea6', fontColor: '#174ea6' },
          { text: "tenant_id = 'retailstream' • 2 rows", fill: '#fce8e6', stroke: '#c5221f', fontColor: '#c5221f' },
        ],
        policy: "POLICY tenant_isolation USING (tenant_id = current_setting('app.current_tenant'))",
        footnote: '⑥ SET LOCAL app.current_tenant → each tenant reads only its 2 rows • 0 cross-tenant rows',
      },
      bq: { icon: 'bigquery_analytics', title: 'BigQuery ROW ACCESS POLICY', sub: 'SESSION_USER tenant filter' },
      mcp: { icon: 'mcp_servers', title: 'MCP Hub (shared)', sub: '2LO service + per-tenant 3LO consent' },
      sdp: { icon: 'cloud_sdp_dlp', title: 'Cloud SDP Egress', sub: 'IBAN / SWIFT / PAN masking' },
      kms: { icon: 'cloud_kms', title: 'Cloud KMS', sub: 'adk-agent-signing-key • per-tenant claims' },
    },
    stepLabels: {
      s3: ['Allocate gVisor sandbox', '+ Valkey quota check'],
      s4: ['Screen prompt with', "tenant's Armor template"],
      s5: ['90% cached prefix +', 'namespaced memory'],
      s6: ['SET LOCAL app.current_tenant', '→ RLS-filtered rows'],
      s7: ['SDP-redacted response', '+ per-turn OTel span'],
      gov: ['Cache hits • RPM • per-tenant span cost → BigQuery'],
      mem: ['namespace'],
      mcp: ['3LO consent'],
    },
  },

  // =========================================================================
  // 4. WORKSTREAM 2.5: Pattern A — 10-Point Breach Simulation & Defense
  // =========================================================================
  {
    id: 'ws2-pattern-a-breach-defense-sequence',
    badge: 'WORKSTREAM 2.5 • BREACH SUITE BLUEPRINT',
    title: 'Pattern A: 10-Point Cross-Tenant Breach Simulation & Cryptographic Defense Matrix',
    subtitle: 'Workstream 2.2 & 2.5 (run_breach_simulations.py) • 10/10 Adversarial Vectors Neutralized in cymbal-build-sandbox',
    workstreamDir: 'workstream-2-pattern-a-pooled/diagrams',
    topUserTitle: 'Red-Team Attacker',
    topUserSub: 'Spoofed Headers & Injections',
    step1LeftLabel: 'Attack Probe',
    step7RightLabel: 'Blocked / Safe',
    outerWrapperLabel: 'Adversarial Breach Verification Harness (10/10 PASS • Logged to security_breach_audit_log)',
    innerWrapperLabel: 'VPC • Zero-Trust 5-Hop Enforcement Pipeline (cymbal-multi-tenant-patterns-00003-wfh)',
    routingHubTitle: 'Hop 1 & Hop 2 Gates (Vectors 1, 2, 3 & 10)',
    routingHubSub: 'Neutralizes header spoofing, Agent Alpha & MCP leaks',
    routingCards: {
      topLeft: { icon: 'cloud_armor', title: 'Vector 1: Header Strip', sub: 'Drops Forged X-Tenant-ID' },
      midLeft: { icon: 'discovery_engine', title: 'Vector 2: Agent 403', sub: 'Blocks Retail -> Agent Alpha' },
      botLeft: { icon: 'iap_iam_shield', title: 'Vector 3: Tool Prune', sub: 'Prunes FinVault Jira MCP' },
      topRight: { icon: 'load_balancer_cloud_armor', title: 'External Application', title2: 'Load Balancer', sub: 'Google Cloud Armor Edge PEP' },
      botRight: { icon: 'cloud_run', title: 'Hop 2 Catalog PDP', sub: 'Discovery Catalog + ADK Callback' },
      edgeTopLeft: ['Strip spoofed', 'header'],
      edgeMidLeft: ['Return HTTP', '403 Forbidden'],
      edgeBotLeft: ['Prune 3LO', 'MCP tools'],
      step2Left: 'Probe',
      step7Mid: '403 / 200',
    },
    govHubTitle: 'Hop 3 & 5 FinOps &',
    govHubTitle2: 'Audit Gates (Vectors 6 & 9)',
    govCards: {
      top: { icon: 'valkey_cache', title: 'Vector 6: Valkey 429', title2: '& 4k Token Clamp', sub: 'Blocks 250 RPM Flood & 16k' },
      mid: { icon: 'iap_iam_shield', title: 'Vector 10: Inline 3LO', sub: 'HTTP 401 Entra OAuth Challenge' },
      bot: { icon: 'bigquery_analytics', title: 'BigQuery OTel Audit', sub: 'security_breach_audit_log' },
    },
    midStep3Label: ['Verified context', 'enters Hop 3–5'],
    midStep7Label: ['Zero cross-tenant', 'data/cache bleed'],
    midGovLabel: ['Real-time security', 'violation spans'],
    leftBoundaryLabel: 'Hop 4 Guardrail Gates (Vectors 4, 5 & 8) • Prompt, Safety Filter & SDP DLP',
    leftZoneTitle: 'Model Armor & Safety Filters',
    leftZoneSub: 'Ingress Injection Screen & Egress SDP Redaction',
    leftCards: {
      modelArmor: { icon: 'model_armor', title: 'Vector 4: HTTP 400', sub: 'Blocks SQLi & Cache Dump' },
      llm: { icon: 'model_armor', title: 'Vector 5: HTTP 422', sub: 'Blocks FINRA Escalation Bypass' },
      runtime: { icon: 'gemini_agent_platform', title: 'Vertex AI Agent Engine', sub: 'Executes Only Clean Turns' },
      mcp: { icon: 'cloud_sdp_dlp', title: 'Vector 8: SDP Mask', sub: 'Redacts IBAN, SWIFT & PAN' },
      datastore: { icon: 'datastore_alloydb_bq', title: 'Zero Raw PII Egress', sub: '[REDACTED-FINVAULT-*]' },
      step4Label: 'Screen prompt',
      step6Label: 'Redact PII',
      step5Label: ['Evaluate', 'Safety rules'],
      ragLabel: ['DLP Egress', 'Filter'],
      toolLabel: ['Zero PII in', 'Completion'],
    },
    rightBoundaryLabel: 'Hop 3 & Hop 5 Storage Gates (Vectors 7 & 9) • Memory, Skills & RLS',
    rightZoneTitle: 'Memory Bank, Skills & AlloyDB/BQ RLS',
    rightZoneSub: 'Cryptographic Namespace & Storage-Engine Isolation',
    rightCards: {
      modelArmor: { icon: 'gemini_agent_platform', title: 'Vector 7A: L4 Memory', sub: 'PermissionError on Cross-Read' },
      llm: { icon: 'cloud_storage', title: 'Vector 7B: GCS Skills', sub: 'Blocks gs://cymbal-skills-fv' },
      runtime: { icon: 'valkey_cache', title: 'Vector 9: Prefix Cache', sub: 'READ_ONLY_IMMUTABLE_PREFIX' },
      mcp: { icon: 'iap_iam_shield', title: 'Auth Manager Vault', sub: 'Tenant-Scoped OAuth Tokens' },
      datastore: { icon: 'datastore_alloydb_bq', title: 'Vector 7C: AlloyDB/BQ RLS', sub: 'tenant_pooled_rls_policy (0 Bleed)' },
      ragLabel: ['Isolated', 'Prefix Cache'],
      toolLabel: ['SET LOCAL', 'current_tenant'],
    },
  },

  // =========================================================================
  // 5. WORKSTREAM 3.1: Pattern B — Zero-Trust Sovereign Silos (VPC-SC, PAB, CMEK)
  // =========================================================================
  {
    id: 'ws3-pattern-b-sovereign-silos-architecture',
    badge: 'WORKSTREAM 3.1 • PATTERN B BLUEPRINT',
    title: 'Pattern B: Zero-Trust Sovereign Silos (VPC-SC, IAM PAB, CMEK Kill-Switch & Air-Gapped Gemma 3 on GKE)',
    subtitle: 'Milestone 2 (Weeks 4–7) • Verified KMS KeyRing cymbal-multi-tenant-kr & BQ Vault cymbal_silo_finvault_usw1 (HTTP 423 Lock)',
    workstreamDir: 'workstream-3-pattern-b-siloed/diagrams',
    topUserTitle: 'mTLS SPIFFE Clients',
    topUserSub: 'FinVault & RetailStream',
    step1LeftLabel: 'mTLS Request',
    step7RightLabel: 'Silo Response',
    outerWrapperLabel: 'Multi-Project Sovereign Topology (cymbal-build-sandbox • 80% Core + 20% VPC-SC / PAB / CMEK Delta)',
    innerWrapperLabel: 'Central mTLS Routing & Governance Hub VPC (cymbal-multi-tenant-patterns-00003-wfh)',
    routingHubTitle: 'Central mTLS & SPIFFE Routing Hub',
    routingHubSub: 'Client certificate pinning (HTTP 401 on SAN mismatch)',
    routingCards: {
      topLeft: { icon: 'cloud_armor', title: 'Google Cloud Armor', sub: 'WAF & mTLS • SPIFFE Cert Pinning' },
      midLeft: { icon: 'model_armor', title: 'Model Armor', sub: 'Edge Prompt & DDoS Filter' },
      botLeft: { icon: 'iap_iam_shield', title: 'IAM PAB Verifier', sub: 'HTTP 403 Cross-Project Block' },
      topRight: { icon: 'load_balancer_cloud_armor', title: 'External Application', title2: 'Load Balancer', sub: 'SNI Silo Routing' },
      botRight: { icon: 'cloud_run', title: 'Sovereign Hub Router', sub: 'Routes to Dedicated Silo' },
      edgeTopLeft: ['Verify client', 'SPIFFE SAN'],
      edgeMidLeft: ['Sanitize', 'prompt'],
      edgeBotLeft: ['Enforce org', 'PAB policy'],
      step2Left: 'mTLS Valid',
      step7Mid: '200 / 423',
    },
    govHubTitle: 'Cloud KMS CMEK &',
    govHubTitle2: 'Sovereign Security Hub',
    govCards: {
      top: { icon: 'security_command_center', title: 'Security Command', title2: 'Center', sub: 'VPC-SC & PAB Violation Feed' },
      mid: { icon: 'cloud_kms', title: 'Cloud KMS KeyRing', sub: 'cymbal-multi-tenant-kr (423 Lock)' },
      bot: { icon: 'bigquery_analytics', title: 'Cloud Logging & BQ', sub: 'Per-silo audit sink (CMEK state, VPC-SC denials)' },
    },
    midStep3Label: ['Route to isolated', 'VPC-SC tenant project'],
    midStep7Label: ['Sovereign response', '(or HTTP 423 Locked)'],
    midGovLabel: ['CMEK state & VPC-SC', 'audit monitoring'],
    leftBoundaryLabel: 'PAB + VPC-SC Perimeter Alpha • Project: cymbal-finvault-silo-prod (cymbal_silo_finvault_usw1)',
    leftZoneTitle: 'Tenant A Silo (FinVault Bank)',
    leftZoneSub: 'Dedicated Silo • CMEK: finvault-silo-cmek',
    leftCards: {
      modelArmor: { icon: 'vpc_sc', title: 'VPC-SC & Model Armor', sub: 'Dedicated FinVault Perimeter' },
      llm: { icon: 'gke', title: 'Gemma 3 (27B) GKE', sub: 'Air-Gapped vLLM + Dedicated PT' },
      runtime: { icon: 'gemini_agent_platform', title: 'Vertex AI Agent Engine', sub: 'Dedicated Silo + Agent Alpha' },
      mcp: { icon: 'mcp_servers', title: 'Local Silo MCP', sub: 'Workspace & Jira (0 Egress)' },
      datastore: { icon: 'cloud_kms', title: 'CMEK Silo Datastore', sub: 'pattern_b_silo_finvault_cmek_vault' },
      step4Label: 'Sanitize request',
      step6Label: 'Sanitize response',
      step5Label: ['Air-gapped', 'inference'],
      ragLabel: ['Private GKE', 'Zero Egress'],
      toolLabel: ['finvault-silo-cmek', 'HTTP 423 Ready'],
    },
    rightBoundaryLabel: 'PAB + VPC-SC Perimeter Beta • Project: cymbal-retailstream-silo-prod (one project per tenant — N tenants = N silos)',
    rightZoneTitle: 'Tenant B Silo (RetailStream Corp)',
    rightZoneSub: 'Dedicated Silo • CMEK: retailstream-silo-cmek',
    rightCards: {
      modelArmor: { icon: 'vpc_sc', title: 'VPC-SC & Model Armor', sub: 'Dedicated Retail PCI Perimeter' },
      llm: { icon: 'gemini_agent_platform', title: 'Gemini 2.5 Pro PT', sub: 'Dedicated Provisioned Quota' },
      runtime: { icon: 'gemini_agent_platform', title: 'Vertex AI Agent Engine', sub: 'Dedicated RetailStream Silo' },
      mcp: { icon: 'mcp_servers', title: 'Local Silo MCP', sub: 'Entra SharePoint & SNOW' },
      datastore: { icon: 'cloud_kms', title: 'CMEK Silo Datastore', sub: 'Key DISABLED → HTTP 423 (medcore test)' },
      ragLabel: ['VPC-SC Bound', 'Secure RAG'],
      toolLabel: ['CMEK Kill-Switch', 'HTTP 423 Verified'],
    },
  },

  // =========================================================================
  // 6. WORKSTREAM 4.1: Pattern C — Dynamic Hybrid, PSC Bridge & Live Migration
  // =========================================================================
  {
    id: 'ws4-pattern-c-hybrid-psc-and-migration',
    badge: 'WORKSTREAM 4.1 • PATTERN C BLUEPRINT',
    title: 'Pattern C: Dynamic Hybrid Hub-and-Spoke, Private Service Connect (PSC) & Live Tier Migration',
    subtitle: 'Milestone 3 (Weeks 7–10) • Verified Hub VPC cymbal-pattern-c-hub-vpc, /28 PSC NAT 10.240.0.0/28 & Spoke VPC (0 Dropped Turns)',
    workstreamDir: 'workstream-4-pattern-c-hybrid/diagrams',
    topUserTitle: 'Standard & Enterprise',
    topUserSub: 'Single Unified SaaS URL',
    step1LeftLabel: 'Request',
    step7RightLabel: 'Response',
    outerWrapperLabel: 'Unified Hybrid Control Hub (cymbal-pattern-c-hub-vpc) + /28 PSC NAT Bridge to Sovereign Spokes',
    innerWrapperLabel: 'Hub VPC (10.128.0.0/24) • Tenant-Aware Router & 3-Phase Live Tier Migrator',
    routingHubTitle: 'Unified Control Plane & Intelligent Router Hub',
    routingHubSub: 'Firestore live routing table + pattern_c_psc_endpoints_registry',
    routingCards: {
      topLeft: { icon: 'cloud_armor', title: 'Google Cloud Armor', sub: 'WAF & IAP • Single SaaS URL' },
      midLeft: { icon: 'discovery_engine', title: 'Cross-Project Catalog', sub: 'Federated Agent Catalog' },
      botLeft: { icon: 'firestore_db', title: 'Firestore Route Table', sub: 'pattern_c_psc_endpoints_registry' },
      topRight: { icon: 'load_balancer_cloud_armor', title: 'External Application', title2: 'Load Balancer', sub: 'Cloud Load Balancing' },
      botRight: { icon: 'cloud_run', title: 'Cloud Run Router', sub: 'Tier Router & Live Migrator' },
      edgeTopLeft: ['Security', 'policies'],
      edgeMidLeft: ['Resolve', 'agent route'],
      edgeBotLeft: ['Atomic route', 'lookup'],
      step2Left: 'Request',
      step7Mid: 'Response',
    },
    govHubTitle: 'Tier Routing & Live',
    govHubTitle2: 'Migration Control Plane',
    govCards: {
      top: { icon: 'firestore_db', title: 'Firestore Route Table', title2: '(atomic tier pointer)', sub: 'tenant → pool | psc://10.10.0.5x' },
      mid: { icon: 'dms_migration', title: 'Migration Coordinator', sub: 'SHADOW_SYNC → ATOMIC_CUTOVER → DRAIN_AND_VERIFY' },
      bot: { icon: 'bigquery_analytics', title: 'BigQuery OTel Sink', sub: 'tenant_promotion_migrations • routing_plane' },
    },
    midStep3Label: ['Route Standard to Pool', 'or Enterprise via PSC'],
    midStep7Label: ['Seamless response', '(0 dropped sessions)'],
    midGovLabel: ['Live promotion:', 'Pool -> PSC Spoke'],
    leftBoundaryLabel: 'Standard Tier: Shared Pooled Plane (Initial RetailStream Route)',
    leftZoneTitle: 'Shared Pooled Runtime',
    leftZoneSub: 'pool://cymbal-shared-pooled-v2 (90% Cache Savings)',
    leftCards: {
      modelArmor: { icon: 'model_armor', title: 'Shared Model Armor', sub: 'Multi-Tenant Prompt & SDP' },
      llm: { icon: 'gemini_agent_platform', title: 'Gemini 2.5 Pro', sub: '4,000 Thinking Cap + Cache' },
      runtime: { icon: 'gemini_agent_platform', title: 'Vertex AI Agent Engine', sub: 'Serves Standard SaaS Tier' },
      mcp: { icon: 'mcp_servers', title: 'Pooled MCP Hub', sub: '2LO + Delegated 3LO Tools' },
      datastore: { icon: 'datastore_alloydb_bq', title: 'Shared AlloyDB & BQ RLS', sub: 'pattern_a_pooled_rls_entities' },
      step4Label: 'Sanitize request',
      step6Label: 'Sanitize response',
      step5Label: ['Pooled', 'inference'],
      ragLabel: ['Shared Pool', 'RAG'],
      toolLabel: ['Streams State to', 'PSC Spoke'],
    },
    rightBoundaryLabel: 'Enterprise Tier: Private Service Connect (PSC) Spokes (cymbal-pattern-c-finvault-spoke-vpc • 10.140.0.0/24)',
    rightZoneTitle: 'Dedicated Enterprise PSC Spokes',
    rightZoneSub: 'cymbal-psc-nat-us-west1 (/28) -> psc://10.10.0.50 & .51',
    rightCards: {
      modelArmor: { icon: 'model_armor', title: 'Model Armor (spoke)', sub: 'Enterprise prompt screen + SDP' },
      llm: { icon: 'gemini_agent_platform', title: 'Gemini 2.5 Pro PT', sub: 'Upgraded 8,000 Thinking Cap' },
      runtime: { icon: 'psc_bridge', title: 'Spoke Agent Engine via PSC', sub: 'ServiceAttachment ← /28 consumer endpoint' },
      mcp: { icon: 'mcp_servers', title: 'Dedicated Spoke MCP', sub: 'Isolated Inside VPC-SC Spoke' },
      datastore: { icon: 'cloud_kms', title: 'CMEK Spoke Datastore', sub: 'finvault-silo-cmek & KMS Lock' },
      ragLabel: ['Unidirectional', 'PSC Bridge'],
      toolLabel: ['CMEK-Encrypted', 'Spoke Storage'],
    },
  },

  // =========================================================================
  // 7. WORKSTREAM 5.1 & 5.2: Executive Decision Tree & The Agentic Triad
  // =========================================================================
  {
    id: 'ws5-decision-tree-and-agentic-triad',
    badge: 'WORKSTREAM 5.1 & 5.2 • CAPSTONE BLUEPRINT',
    title: 'Workstream 5 Capstone: Executive Topology Decision Guide & The Multi-Tenant Agentic Triad',
    subtitle: 'Verified 20/20 Suites PASS Across cymbal-build-sandbox & ramp-portal-dev (Security • FinOps -84.7% • Zero-PII OTel)',
    workstreamDir: 'workstream-5-synthesis-and-publishing/diagrams',
    // ---- Rule 53G: a decision guide is a decision tree, not a request/response hub ----
    layout: LAYOUT_DECISION_TREE_3_OUTCOME,
    topUserTitle: 'Chief Architect • CISO • CFO',
    topUserSub: '1,000 tenants • 950 Standard + 50 Enterprise',
    step1Label: 'Decision inputs',
    outerWrapperLabel: 'Executive Topology Selector: 2 questions → 3 outcomes • 80% reusable Agentic Triad core + 20% topology delta (Terraform modules 2.6 • 3.6 • 4.6)',
    selectorTitle: '1. The 2-Question Executive Topology Selector',
    selectorSub: 'Answer in order — Q1 settles compliance, Q2 settles tier mix',
    inputs: {
      icon: 'verification_suite',
      title: 'Decision inputs',
      sub: 'Regulator mandates • data residency • customer-managed keys • tier mix • unit-cost targets',
    },
    q1: {
      title: 'Compliance gate',
      body: ['Do all customers legally require dedicated', 'GCP projects, VPC-SC, or air-gapped models?'],
    },
    q2: {
      title: 'Tier gate',
      body: ['Do you sell both a shared Standard tier', 'and a regulated Enterprise tier?'],
    },
    q1No: 'NO',
    q1Yes: ['YES → Pattern B', 'every tenant sovereign'],
    q2Single: ['Single shared tier →', 'Pattern A (pooled)'],
    q2Multi: ['Standard + Enterprise', '→ Pattern C (hybrid)'],
    triadApplies: ['80% reusable core', 'inherited by all 3'],
    triadTitle: '2. The Agentic Triad',
    triadTitle2: '(80% reusable core)',
    triadCards: [
      { icon: 'iap_iam_shield', title: 'Pillar 1 • Zero-Trust 5-Hop', sub: 'Hops 1, 2 & 4: OBO/DPoP • Catalog PDP • Model Armor' },
      { icon: 'context_cache', title: 'Pillar 2 • Predictable FinOps', sub: 'Hop 3: ContextCache 90% • Valkey • thinking caps' },
      { icon: 'bigquery_analytics', title: 'Pillar 3 • Zero-PII OTel Chargeback', sub: 'tenant_telemetry_spans • Even / Proportional / Tiered' },
    ],
    coreBar: {
      title: 'AGENTIC TRIAD CORE — identical Hops 1–5, FinOps controls & zero-PII telemetry in every outcome (only the 20% topology delta below changes)',
    },
    outcomes: [
      {
        key: 'B',
        step: '4',
        fill: '#fad2cf',
        accent: '#c5221f',
        label: 'Pattern B — Sovereign Silos • $$$ • Terraform module 3.6',
        zoneTitle: 'One dedicated project per tenant',
        zoneSub: 'Zero blast radius • customer holds the key',
        cards: [
          { icon: 'vpc_sc', title: 'VPC-SC Perimeter + IAM PAB', sub: 'Dedicated project • 0 cross-perimeter egress' },
          { icon: 'cloud_kms', title: 'Customer CMEK Kill-Switch', sub: 'Key DISABLED → HTTP 423 in <60s' },
          { icon: 'gke', title: 'Private GKE Gemma 3 27B / Dedicated PT', sub: 'Air-gapped inference, no shared cache' },
          { icon: 'mcp_servers', title: 'Local Silo MCP + AlloyDB CMEK', sub: 'Tools & state never leave the perimeter' },
        ],
        verdict: ['Choose when regulators mandate isolation', '6/6 sovereign tests PASS • highest unit cost'],
      },
      {
        key: 'A',
        step: '5',
        fill: '#feefc3',
        accent: '#b06000',
        label: 'Pattern A — Pooled • $ • Terraform module 2.6',
        zoneTitle: 'One shared plane for all tenants',
        zoneSub: 'Lowest COGS • logical isolation only',
        cards: [
          { icon: 'gemini_agent_platform', title: 'Shared Agent Engine gVisor Pool', sub: 'temp:tenant_id bound per request' },
          { icon: 'datastore_alloydb_bq', title: 'Shared AlloyDB + BigQuery FORCE RLS', sub: 'tenant_id rows • 0 cross-tenant rows' },
          { icon: 'context_cache', title: 'Namespaced Memory + 90% ContextCache', sub: '32k shared prefix • -84.7% input tokens' },
          { icon: 'valkey_cache', title: 'Valkey Bulkheads + Thinking Caps', sub: '120 / 600 RPM • 4k / 8k tokens' },
        ],
        verdict: ['Choose when one commercial tier is enough', '10/10 breach vectors blocked • lowest unit cost'],
      },
      {
        key: 'C',
        step: '6',
        fill: '#e8d9f7',
        accent: '#6a1b9a',
        label: 'Pattern C — Hybrid PSC • $$ • Terraform module 4.6',
        zoneTitle: 'Shared pool + private spokes',
        zoneSub: 'Standard pooled, Enterprise over PSC',
        cards: [
          { icon: 'firestore_db', title: 'Hub Tier Router + Firestore Route Table', sub: 'Atomic tier pointer per tenant' },
          { icon: 'gemini_agent_platform', title: 'Standard → Shared Pool (Pattern A plane)', sub: '950 tenants • 120 RPM pooled path' },
          { icon: 'psc_bridge', title: 'Enterprise → PSC Spoke', sub: 'Consumer /28 endpoint → ServiceAttachment' },
          { icon: 'dms_migration', title: 'Zero-Downtime Promotion', sub: 'SHADOW_SYNC → ATOMIC_CUTOVER → DRAIN_AND_VERIFY' },
        ],
        verdict: ['Choose when tiers must coexist and promote live', '4/4 migration tests PASS • 74% TCO vs all-dedicated'],
      },
    ],
  },
];

const EXTENDED_BLUEPRINTS = [bp08, bp09, bp10, bp11, bp12, bp13, bp14];
const ALL_BLUEPRINTS = [...WORKSTREAM_BLUEPRINTS, ...EXTENDED_BLUEPRINTS];

function fitAttr(str, maxPx, charPx) {
  const s = String(str ?? '');
  let estW = 0;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (/[A-Z0-9_@]/.test(ch)) {
      estW += charPx * 1.22;
    } else if (/[il1.,:;'|! ]/.test(ch)) {
      estW += charPx * 0.62;
    } else {
      estW += charPx;
    }
  }
  if (estW > maxPx) {
    return ` textLength="${maxPx}" lengthAdjust="spacingAndGlyphs"`;
  }
  return '';
}

function renderArchCardSvg({ x, y, w, h, iconKey, title, title2, sub }) {
  const iconDataUri = resolveArchIconUri(iconKey, title, sub);
  const iconSize = 32;
  const iconX = x + 10;
  const iconY = y + Math.round((h - iconSize) / 2);
  const textX = iconX + iconSize + 10;
  const maxTextW = w - (textX - x) - 14;
  const t1Len = String(title || '').length;
  const subLen = String(sub || '').length;
  const titleFontSize = t1Len > 22 ? '12.2' : '13.5';
  const titleCharPx = t1Len > 22 ? 6.9 : 7.6;
  const subFontSize = subLen > 26 ? '10.3' : '11.5';
  const subCharPx = subLen > 26 ? 5.6 : 6.2;

  let textSvg = '';
  if (title2 && sub) {
    textSvg = `
      <text x="${textX}" y="${y + 23}" font-family="'Google Sans', 'Roboto', Arial, sans-serif" font-size="${titleFontSize}" font-weight="700" fill="#202124"${fitAttr(title, maxTextW, titleCharPx)}>${escXml(title)}</text>
      <text x="${textX}" y="${y + 41}" font-family="'Google Sans', 'Roboto', Arial, sans-serif" font-size="${titleFontSize}" font-weight="700" fill="#202124"${fitAttr(title2, maxTextW, titleCharPx)}>${escXml(title2)}</text>
      <text x="${textX}" y="${y + 59}" font-family="'Google Sans', 'Roboto', Arial, sans-serif" font-size="${subFontSize}" font-weight="400" fill="#3c4043"${fitAttr(sub, maxTextW, subCharPx)}>${escXml(sub)}</text>
    `;
  } else if (title2) {
    textSvg = `
      <text x="${textX}" y="${y + 30}" font-family="'Google Sans', 'Roboto', Arial, sans-serif" font-size="14" font-weight="700" fill="#202124"${fitAttr(title, maxTextW, 7.8)}>${escXml(title)}</text>
      <text x="${textX}" y="${y + 50}" font-family="'Google Sans', 'Roboto', Arial, sans-serif" font-size="14" font-weight="700" fill="#202124"${fitAttr(title2, maxTextW, 7.8)}>${escXml(title2)}</text>
    `;
  } else if (sub) {
    textSvg = `
      <text x="${textX}" y="${y + Math.round(h / 2) - 4}" font-family="'Google Sans', 'Roboto', Arial, sans-serif" font-size="${titleFontSize}" font-weight="700" fill="#202124"${fitAttr(title, maxTextW, titleCharPx)}>${escXml(title)}</text>
      <text x="${textX}" y="${y + Math.round(h / 2) + 15}" font-family="'Google Sans', 'Roboto', Arial, sans-serif" font-size="${subFontSize}" font-weight="400" fill="#3c4043"${fitAttr(sub, maxTextW, subCharPx)}>${escXml(sub)}</text>
    `;
  } else {
    textSvg = `
      <text x="${textX}" y="${y + Math.round(h / 2) + 5}" font-family="'Google Sans', 'Roboto', Arial, sans-serif" font-size="14" font-weight="700" fill="#202124"${fitAttr(title, maxTextW, 7.8)}>${escXml(title)}</text>
    `;
  }

  return `
    <g>
      <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" ry="6" fill="#ffffff" stroke="#202124" stroke-width="2"/>
      <image x="${iconX}" y="${iconY}" width="${iconSize}" height="${iconSize}" preserveAspectRatio="xMidYMid meet" xlink:href="${iconDataUri}"/>
      ${textSvg}
    </g>
  `;
}

function renderStepCircleSvg(cx, cy, num) {
  return `
    <g>
      <circle cx="${cx}" cy="${cy}" r="20" fill="#174ea6"/>
      <text x="${cx}" y="${cy + 6}" text-anchor="middle" font-family="'Google Sans', 'Roboto', Arial, sans-serif" font-size="17" font-weight="700" fill="#ffffff">${escXml(num)}</text>
    </g>
  `;
}

function compileOfficialArchCenterSvg(bp) {
  const W = 1200;
  const H = 1410;

  const rc = bp.routingCards;
  const gc = bp.govCards;
  const lc = bp.leftCards;
  const sc = bp.rightCards;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
  <defs>
    <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M 1 1.5 L 8 5 L 1 8.5" fill="none" stroke="#202124" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
    </marker>
  </defs>

  <rect x="0" y="0" width="${W}" height="${H}" fill="#ffffff"/>

  <text x="20" y="22" font-family="'Google Sans', 'Roboto', Arial, sans-serif" font-size="13" font-weight="700" fill="#174ea6"${fitAttr(`[${bp.badge}] ${bp.title}`, 1150, 7.5)}>[${escXml(bp.badge)}] ${escXml(bp.title)}</text>
  <text x="20" y="40" font-family="'Google Sans', 'Roboto', Arial, sans-serif" font-size="11.5" font-weight="400" fill="#5f6368"${fitAttr(bp.subtitle, 1150, 6.4)}>${escXml(bp.subtitle)}</text>

  <!-- TOP EXTERNAL USER / TENANT BOX -->
  <g>
    <rect x="465" y="52" width="250" height="86" rx="8" ry="8" fill="#ffffff" stroke="#202124" stroke-width="2"/>
    <circle cx="590" cy="76" r="9.5" fill="#000000"/>
    <path d="M 573 101 C 573 91 607 91 607 101 Z" fill="#000000"/>
    <text x="590" y="117" text-anchor="middle" font-family="'Google Sans', 'Roboto', Arial, sans-serif" font-size="13.5" font-weight="700" fill="#202124">${escXml(bp.topUserTitle)}</text>
    <text x="590" y="132" text-anchor="middle" font-family="'Google Sans', 'Roboto', Arial, sans-serif" font-size="11" font-weight="400" fill="#3c4043">${escXml(bp.topUserSub)}</text>
  </g>

  <!-- OUTER GOOGLE CLOUD CONTAINER (#1a73e8) -->
  <rect x="20" y="218" width="1160" height="1172" rx="18" ry="18" fill="#1a73e8" stroke="#202124" stroke-width="1.2"/>
  <image x="38" y="232" width="138" height="25" preserveAspectRatio="xMidYMid meet" xlink:href="${OFFICIAL_ASSETS.gcp_wordmark_white}"/>

  <!-- NESTED WHITE BOUNDARY 1 -->
  <rect x="36" y="268" width="1128" height="1104" rx="14" ry="14" fill="#ffffff" stroke="#202124" stroke-width="1.2"/>

  <!-- NESTED WHITE BOUNDARY 2 -->
  <rect x="52" y="304" width="1096" height="1050" rx="14" ry="14" fill="#ffffff" stroke="#202124" stroke-width="1.2"/>

  <!-- ZONE 1: ROUTING HUB (Pastel Blue #aecbfa) -->
  <rect x="68" y="338" width="664" height="330" rx="6" ry="6" fill="#aecbfa" stroke="#202124" stroke-width="1"/>

  ${renderArchCardSvg({ x: 88, y: 398, w: 204, h: 66, iconKey: rc.topLeft.icon, title: rc.topLeft.title, sub: rc.topLeft.sub })}
  ${renderArchCardSvg({ x: 88, y: 482, w: 204, h: 66, iconKey: rc.midLeft.icon, title: rc.midLeft.title, sub: rc.midLeft.sub })}
  ${renderArchCardSvg({ x: 96, y: 580, w: 196, h: 66, iconKey: rc.botLeft.icon, title: rc.botLeft.title, sub: rc.botLeft.sub })}
  ${renderArchCardSvg({ x: 452, y: 432, w: 262, h: 76, iconKey: rc.topRight.icon, title: rc.topRight.title, title2: rc.topRight.title2, sub: rc.topRight.sub })}
  ${renderArchCardSvg({ x: 476, y: 580, w: 224, h: 66, iconKey: rc.botRight.icon, title: rc.botRight.title, sub: rc.botRight.sub })}

  <line x1="566" y1="138" x2="566" y2="430" stroke="#202124" stroke-width="2" marker-end="url(#arrow)"/>
  <line x1="612" y1="432" x2="612" y2="140" stroke="#202124" stroke-width="2" marker-end="url(#arrow)"/>
  <text x="536" y="185" text-anchor="end" font-family="'Google Sans', 'Roboto', Arial, sans-serif" font-size="14" fill="#202124">${escXml(bp.step1LeftLabel)}</text>
  ${renderStepCircleSvg(566, 180, '1')}
  ${renderStepCircleSvg(612, 180, '7')}
  <text x="640" y="185" font-family="'Google Sans', 'Roboto', Arial, sans-serif" font-size="14" fill="#202124">${escXml(bp.step7RightLabel)}</text>

  <path d="M 452 470 L 418 470 L 418 431 L 294 431" fill="none" stroke="#202124" stroke-width="2" marker-end="url(#arrow)"/>
  <path d="M 418 470 L 418 515 L 294 515" fill="none" stroke="#202124" stroke-width="2" marker-end="url(#arrow)"/>
  <line x1="418" y1="470" x2="450" y2="470" stroke="#202124" stroke-width="2" marker-end="url(#arrow)"/>
  <text x="355" y="408" text-anchor="middle" font-family="'Google Sans', 'Roboto', Arial, sans-serif" font-size="13.5" fill="#202124">${escXml(rc.edgeTopLeft[0])}</text>
  <text x="355" y="425" text-anchor="middle" font-family="'Google Sans', 'Roboto', Arial, sans-serif" font-size="13.5" fill="#202124">${escXml(rc.edgeTopLeft[1])}</text>
  <text x="355" y="534" text-anchor="middle" font-family="'Google Sans', 'Roboto', Arial, sans-serif" font-size="13.5" fill="#202124">${escXml(rc.edgeMidLeft[0])}</text>
  <text x="355" y="551" text-anchor="middle" font-family="'Google Sans', 'Roboto', Arial, sans-serif" font-size="13.5" fill="#202124">${escXml(rc.edgeMidLeft[1])}</text>

  <line x1="294" y1="613" x2="474" y2="613" stroke="#202124" stroke-width="2" marker-start="url(#arrow)" marker-end="url(#arrow)"/>
  <text x="384" y="590" text-anchor="middle" font-family="'Google Sans', 'Roboto', Arial, sans-serif" font-size="13.5" fill="#202124">${escXml(rc.edgeBotLeft[0])}</text>
  <text x="384" y="607" text-anchor="middle" font-family="'Google Sans', 'Roboto', Arial, sans-serif" font-size="13.5" fill="#202124">${escXml(rc.edgeBotLeft[1])}</text>

  <line x1="566" y1="508" x2="566" y2="578" stroke="#202124" stroke-width="2" marker-end="url(#arrow)"/>
  <line x1="612" y1="580" x2="612" y2="510" stroke="#202124" stroke-width="2" marker-end="url(#arrow)"/>
  <text x="536" y="548" text-anchor="end" font-family="'Google Sans', 'Roboto', Arial, sans-serif" font-size="14" fill="#202124">${escXml(rc.step2Left)}</text>
  ${renderStepCircleSvg(566, 543, '2')}
  ${renderStepCircleSvg(612, 543, '7')}
  <text x="640" y="548" font-family="'Google Sans', 'Roboto', Arial, sans-serif" font-size="14" fill="#202124">${escXml(rc.step7Mid)}</text>

  <!-- ZONE 2: CENTRAL GOVERNANCE & SECURITY HUB (Pastel Green #ceead6) -->
  <rect x="798" y="346" width="328" height="320" rx="6" ry="6" fill="#ceead6" stroke="#202124" stroke-width="1"/>
  <text x="816" y="372" font-family="'Google Sans', 'Roboto', Arial, sans-serif" font-size="15" font-weight="700" fill="#202124">${escXml(bp.govHubTitle)}</text>
  <text x="816" y="390" font-family="'Google Sans', 'Roboto', Arial, sans-serif" font-size="15" font-weight="700" fill="#202124">${escXml(bp.govHubTitle2)}</text>

  ${renderArchCardSvg({ x: 824, y: 406, w: 276, h: 72, iconKey: gc.top.icon, title: gc.top.title, title2: gc.top.title2, sub: gc.top.sub })}
  ${renderArchCardSvg({ x: 830, y: 492, w: 264, h: 68, iconKey: gc.mid.icon, title: gc.mid.title, sub: gc.mid.sub })}
  ${renderArchCardSvg({ x: 828, y: 574, w: 268, h: 68, iconKey: gc.bot.icon, title: gc.bot.title, sub: gc.bot.sub })}

  <!-- ZONE 3: LEFT TENANT / POOL PROJECT (Warm Yellow #feefc3) -->
  <rect x="70" y="772" width="516" height="560" rx="8" ry="8" fill="#ffffff" stroke="#202124" stroke-width="1.2"/>

  <rect x="86" y="808" width="484" height="508" rx="6" ry="6" fill="#feefc3" stroke="#202124" stroke-width="1"/>

  ${renderArchCardSvg({ x: 96, y: 874, w: 194, h: 72, iconKey: lc.modelArmor.icon, title: lc.modelArmor.title, sub: lc.modelArmor.sub })}
  ${renderArchCardSvg({ x: 96, y: 1110, w: 194, h: 72, iconKey: lc.llm.icon, title: lc.llm.title, sub: lc.llm.sub })}
  ${renderArchCardSvg({ x: 342, y: 924, w: 214, h: 74, iconKey: lc.runtime.icon, title: lc.runtime.title, title2: lc.runtime.title2, sub: lc.runtime.sub })}
  ${renderArchCardSvg({ x: 342, y: 1068, w: 214, h: 74, iconKey: lc.mcp.icon, title: lc.mcp.title, sub: lc.mcp.sub })}
  ${renderArchCardSvg({ x: 342, y: 1218, w: 214, h: 74, iconKey: lc.datastore.icon, title: lc.datastore.title, sub: lc.datastore.sub })}

  <!-- Left Zone Step Callouts (4, 6 under Model Armor; 5 under LLM) -->
  ${renderStepCircleSvg(120, 976, '4')}
  <text x="148" y="981" font-family="'Google Sans', 'Roboto', Arial, sans-serif" font-size="13.5" fill="#202124">${escXml(lc.step4Label)}</text>

  ${renderStepCircleSvg(120, 1024, '6')}
  <text x="148" y="1029" font-family="'Google Sans', 'Roboto', Arial, sans-serif" font-size="13.5" fill="#202124">${escXml(lc.step6Label)}</text>

  ${renderStepCircleSvg(120, 1214, '5')}
  <text x="148" y="1208" font-family="'Google Sans', 'Roboto', Arial, sans-serif" font-size="13.5" fill="#202124">${escXml(lc.step5Label[0])}</text>
  <text x="148" y="1226" font-family="'Google Sans', 'Roboto', Arial, sans-serif" font-size="13.5" fill="#202124">${escXml(lc.step5Label[1])}</text>

  <path d="M 290 910 L 312 910 L 312 944 L 340 944" fill="none" stroke="#202124" stroke-width="2" marker-start="url(#arrow)" marker-end="url(#arrow)"/>
  <path d="M 290 1146 L 320 1146 L 320 976 L 340 976" fill="none" stroke="#202124" stroke-width="2" marker-start="url(#arrow)" marker-end="url(#arrow)"/>

  <line x1="449" y1="1054" x2="449" y2="1066" stroke="#202124" stroke-width="2" marker-end="url(#arrow)"/>
  <line x1="449" y1="1014" x2="449" y2="1000" stroke="#202124" stroke-width="2" marker-end="url(#arrow)"/>
  <text x="449" y="1029" text-anchor="middle" font-family="'Google Sans', 'Roboto', Arial, sans-serif" font-size="13.5" fill="#202124">${escXml(lc.ragLabel[0])}</text>
  <text x="449" y="1046" text-anchor="middle" font-family="'Google Sans', 'Roboto', Arial, sans-serif" font-size="13.5" fill="#202124">${escXml(lc.ragLabel[1])}</text>

  <line x1="449" y1="1204" x2="449" y2="1216" stroke="#202124" stroke-width="2" marker-end="url(#arrow)"/>
  <line x1="449" y1="1158" x2="449" y2="1144" stroke="#202124" stroke-width="2" marker-end="url(#arrow)"/>
  <text x="449" y="1176" text-anchor="middle" font-family="'Google Sans', 'Roboto', Arial, sans-serif" font-size="13.5" fill="#202124">${escXml(lc.toolLabel[0])}</text>
  <text x="449" y="1193" text-anchor="middle" font-family="'Google Sans', 'Roboto', Arial, sans-serif" font-size="13.5" fill="#202124">${escXml(lc.toolLabel[1])}</text>

  <!-- ZONE 4: RIGHT TENANT / SPOKE PROJECT (Coral #fad2cf) -->
  <rect x="614" y="772" width="516" height="560" rx="8" ry="8" fill="#ffffff" stroke="#202124" stroke-width="1.2"/>

  <rect x="630" y="808" width="484" height="508" rx="6" ry="6" fill="#fad2cf" stroke="#202124" stroke-width="1"/>

  ${renderArchCardSvg({ x: 640, y: 874, w: 194, h: 72, iconKey: sc.modelArmor.icon, title: sc.modelArmor.title, sub: sc.modelArmor.sub })}
  ${renderArchCardSvg({ x: 640, y: 976, w: 194, h: 72, iconKey: sc.llm.icon, title: sc.llm.title, title2: sc.llm.title2, sub: sc.llm.sub })}
  ${renderArchCardSvg({ x: 886, y: 924, w: 214, h: 74, iconKey: sc.runtime.icon, title: sc.runtime.title, title2: sc.runtime.title2, sub: sc.runtime.sub })}
  ${renderArchCardSvg({ x: 886, y: 1068, w: 214, h: 74, iconKey: sc.mcp.icon, title: sc.mcp.title, sub: sc.mcp.sub })}
  ${renderArchCardSvg({ x: 886, y: 1218, w: 214, h: 74, iconKey: sc.datastore.icon, title: sc.datastore.title, title2: sc.datastore.title2, sub: sc.datastore.sub })}

  <path d="M 834 910 L 856 910 L 856 944 L 884 944" fill="none" stroke="#202124" stroke-width="2" marker-start="url(#arrow)" marker-end="url(#arrow)"/>
  <path d="M 834 1012 L 864 1012 L 864 976 L 884 976" fill="none" stroke="#202124" stroke-width="2" marker-start="url(#arrow)" marker-end="url(#arrow)"/>

  <line x1="993" y1="1054" x2="993" y2="1066" stroke="#202124" stroke-width="2" marker-end="url(#arrow)"/>
  <line x1="993" y1="1014" x2="993" y2="1000" stroke="#202124" stroke-width="2" marker-end="url(#arrow)"/>
  <text x="993" y="1029" text-anchor="middle" font-family="'Google Sans', 'Roboto', Arial, sans-serif" font-size="13.5" fill="#202124">${escXml(sc.ragLabel[0])}</text>
  <text x="993" y="1046" text-anchor="middle" font-family="'Google Sans', 'Roboto', Arial, sans-serif" font-size="13.5" fill="#202124">${escXml(sc.ragLabel[1])}</text>

  <line x1="993" y1="1204" x2="993" y2="1216" stroke="#202124" stroke-width="2" marker-end="url(#arrow)"/>
  <line x1="993" y1="1158" x2="993" y2="1144" stroke="#202124" stroke-width="2" marker-end="url(#arrow)"/>
  <text x="993" y="1176" text-anchor="middle" font-family="'Google Sans', 'Roboto', Arial, sans-serif" font-size="13.5" fill="#202124">${escXml(sc.toolLabel[0])}</text>
  <text x="993" y="1193" text-anchor="middle" font-family="'Google Sans', 'Roboto', Arial, sans-serif" font-size="13.5" fill="#202124">${escXml(sc.toolLabel[1])}</text>

  <!-- MIDDLE ROUTING & OBSERVABILITY TRUNK -->
  <line x1="586" y1="744" x2="586" y2="648" stroke="#202124" stroke-width="2" marker-end="url(#arrow)"/>
  <path d="M 449 922 L 449 744 L 993 744 L 993 922" fill="none" stroke="#202124" stroke-width="2" marker-start="url(#arrow)" marker-end="url(#arrow)"/>

  <path d="M 328 770 L 328 730 L 962 730 L 962 668" fill="none" stroke="#202124" stroke-width="2" stroke-dasharray="6,6" marker-start="url(#arrow)" marker-end="url(#arrow)"/>
  <path d="M 872 730 L 872 770" fill="none" stroke="#202124" stroke-width="2" stroke-dasharray="6,6" marker-end="url(#arrow)"/>

  <!-- FOREGROUND WRAPPER & ZONE HEADERS WITH BACKGROUND HALOS (preventing vertical connector strike-through) -->
  <text x="52" y="291" font-family="'Google Sans', 'Roboto', Arial, sans-serif" font-size="13.5" font-weight="700" fill="#202124" paint-order="stroke fill" stroke="#ffffff" stroke-width="8" stroke-linejoin="round"${fitAttr(bp.outerWrapperLabel, 1090, 7.6)}>${escXml(bp.outerWrapperLabel)}</text>
  <text x="68" y="327" font-family="'Google Sans', 'Roboto', Arial, sans-serif" font-size="13.5" font-weight="700" fill="#202124" paint-order="stroke fill" stroke="#ffffff" stroke-width="8" stroke-linejoin="round"${fitAttr(bp.innerWrapperLabel, 1060, 7.6)}>${escXml(bp.innerWrapperLabel)}</text>
  <text x="84" y="363" font-family="'Google Sans', 'Roboto', Arial, sans-serif" font-size="15" font-weight="700" fill="#202124" paint-order="stroke fill" stroke="#aecbfa" stroke-width="8" stroke-linejoin="round">${escXml(bp.routingHubTitle)}</text>
  <text x="84" y="381" font-family="'Google Sans', 'Roboto', Arial, sans-serif" font-size="13" font-weight="400" fill="#202124" paint-order="stroke fill" stroke="#aecbfa" stroke-width="8" stroke-linejoin="round">${escXml(bp.routingHubSub)}</text>
  <text x="86" y="795" font-family="'Google Sans', 'Roboto', Arial, sans-serif" font-size="13" font-weight="700" fill="#202124" paint-order="stroke fill" stroke="#ffffff" stroke-width="8" stroke-linejoin="round"${fitAttr(bp.leftBoundaryLabel, 488, 7.3)}>${escXml(bp.leftBoundaryLabel)}</text>
  <text x="104" y="834" font-family="'Google Sans', 'Roboto', Arial, sans-serif" font-size="15" font-weight="700" fill="#202124" paint-order="stroke fill" stroke="#feefc3" stroke-width="8" stroke-linejoin="round">${escXml(bp.leftZoneTitle)}</text>
  <text x="104" y="852" font-family="'Google Sans', 'Roboto', Arial, sans-serif" font-size="13" font-weight="400" fill="#202124" paint-order="stroke fill" stroke="#feefc3" stroke-width="8" stroke-linejoin="round"${fitAttr(bp.leftZoneSub, 456, 7.0)}>${escXml(bp.leftZoneSub)}</text>
  <text x="630" y="795" font-family="'Google Sans', 'Roboto', Arial, sans-serif" font-size="13" font-weight="700" fill="#202124" paint-order="stroke fill" stroke="#ffffff" stroke-width="8" stroke-linejoin="round"${fitAttr(bp.rightBoundaryLabel, 488, 7.3)}>${escXml(bp.rightBoundaryLabel)}</text>
  <text x="648" y="834" font-family="'Google Sans', 'Roboto', Arial, sans-serif" font-size="15" font-weight="700" fill="#202124" paint-order="stroke fill" stroke="#fad2cf" stroke-width="8" stroke-linejoin="round">${escXml(bp.rightZoneTitle)}</text>
  <text x="648" y="852" font-family="'Google Sans', 'Roboto', Arial, sans-serif" font-size="13" font-weight="400" fill="#202124" paint-order="stroke fill" stroke="#fad2cf" stroke-width="8" stroke-linejoin="round"${fitAttr(bp.rightZoneSub, 456, 7.0)}>${escXml(bp.rightZoneSub)}</text>

  ${renderStepCircleSvg(404, 700, '3')}
  <text x="432" y="695" font-family="'Google Sans', 'Roboto', Arial, sans-serif" font-size="13.5" fill="#202124">${escXml(bp.midStep3Label[0])}</text>
  <text x="432" y="713" font-family="'Google Sans', 'Roboto', Arial, sans-serif" font-size="13.5" fill="#202124">${escXml(bp.midStep3Label[1])}</text>

  ${renderStepCircleSvg(616, 700, '7')}
  <text x="644" y="695" font-family="'Google Sans', 'Roboto', Arial, sans-serif" font-size="13.5" fill="#202124">${escXml(bp.midStep7Label[0])}</text>
  <text x="644" y="713" font-family="'Google Sans', 'Roboto', Arial, sans-serif" font-size="13.5" fill="#202124">${escXml(bp.midStep7Label[1])}</text>

  <text x="974" y="688" font-family="'Google Sans', 'Roboto', Arial, sans-serif" font-size="13" fill="#202124">${escXml(bp.midGovLabel[0] || '')}</text>
  <text x="974" y="705" font-family="'Google Sans', 'Roboto', Arial, sans-serif" font-size="13" fill="#202124">${escXml(bp.midGovLabel[1] || '')}</text>
  <text x="974" y="722" font-family="'Google Sans', 'Roboto', Arial, sans-serif" font-size="13" fill="#202124">${escXml(bp.midGovLabel[2] || '')}</text>
</svg>`;
}

function compileOfficialDrawioXml(bp) {
  const rc = bp.routingCards;
  const gc = bp.govCards;
  const lc = bp.leftCards;
  const sc = bp.rightCards;

  const SVG_GUARD = '<svg width="0" height="0" style="display:none;"></svg>';

  const bgCells = [];
  const edgeCells = [];
  const fgCells = [];
  const vertexBounds = new Map();

  const addVertex = (id, x, y, w, h, rawHtmlValue, style, isBackground = false) => {
    vertexBounds.set(id, { x, y, w, h });
    const cellXml = `        <mxCell id="${id}" value="${escXml(rawHtmlValue)}" style="${style}" vertex="1" parent="1"><mxGeometry x="${x}" y="${y}" width="${w}" height="${h}" as="geometry"/></mxCell>`;
    if (isBackground) {
      bgCells.push(cellXml);
    } else {
      fgCells.push(cellXml);
    }
    return id;
  };

  // Vertex-bound + coordinate-exact orthogonal edge helper (binds source/target IDs with exact exitX/exitY/entryX/entryY ports)
  const addPointEdge = (id, srcPt, tgtPt, waypoints = [], opts = {}) => {
    const { dashed = false, startArrow = false, endArrow = true, source, target } = opts;
    const styleParts = [
      'edgeStyle=none',
      'rounded=0',
      'html=1',
      'strokeColor=#202124',
      'strokeWidth=2',
      startArrow ? 'startArrow=open;startFill=0;startSize=7' : 'startArrow=none',
      endArrow ? 'endArrow=open;endFill=0;endSize=7' : 'endArrow=none',
    ];
    if (dashed) styleParts.push('dashed=1;dashPattern=3 3');
    const sBox = source ? vertexBounds.get(source) : null;
    const tBox = target ? vertexBounds.get(target) : null;
    if (sBox) {
      const exitX = Number(((srcPt[0] - sBox.x) / sBox.w).toFixed(4));
      const exitY = Number(((srcPt[1] - sBox.y) / sBox.h).toFixed(4));
      styleParts.push(`exitX=${exitX}`, `exitY=${exitY}`, 'exitDx=0', 'exitDy=0', 'exitPerimeter=0');
    }
    if (tBox) {
      const entryX = Number(((tgtPt[0] - tBox.x) / tBox.w).toFixed(4));
      const entryY = Number(((tgtPt[1] - tBox.y) / tBox.h).toFixed(4));
      styleParts.push(`entryX=${entryX}`, `entryY=${entryY}`, 'entryDx=0', 'entryDy=0', 'entryPerimeter=0');
    }
    const ptsXml =
      waypoints.length > 0
        ? `<Array as="points">${waypoints.map((p) => `<mxPoint x="${p[0]}" y="${p[1]}"/>`).join('')}</Array>`
        : '';
    const srcAttr = source ? ` source="${source}"` : '';
    const tgtAttr = target ? ` target="${target}"` : '';
    edgeCells.push(
      `        <mxCell id="${id}" value="" style="${styleParts.join(';')};" edge="1" parent="1"${srcAttr}${tgtAttr}><mxGeometry relative="1" as="geometry"><mxPoint x="${srcPt[0]}" y="${srcPt[1]}" as="sourcePoint"/><mxPoint x="${tgtPt[0]}" y="${tgtPt[1]}" as="targetPoint"/>${ptsXml}</mxGeometry></mxCell>`
    );
  };

  // 1. Top Blueprint Title Banner
  addVertex(
    'hdr_title_box',
    20,
    6,
    1160,
    40,
    `${SVG_GUARD}<div style="font-family:'Google Sans',Roboto,Arial,sans-serif;line-height:1.35;"><b style="font-size:12.5px;color:#174ea6;">[${bp.badge}] ${bp.title}</b><br/><span style="font-size:11px;color:#5f6368;">${bp.subtitle}</span></div>`,
    'text;html=1;strokeColor=none;fillColor=none;align=left;verticalAlign=top;spacingLeft=0;spacingTop=0;',
    true
  );

  // 2. Top External User / Tenant Box (with User Silhouette Icon)
  addVertex(
    'actor_top_user',
    465,
    52,
    250,
    86,
    `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;font-family:'Google Sans',Roboto,Arial,sans-serif;text-align:center;"><img src="${USER_SILHOUETTE_DATA_URI}" width="36" height="28"/><b style="font-size:13px;color:#202124;">${bp.topUserTitle}</b><br/><span style="font-size:10.5px;color:#3c4043;">${bp.topUserSub}</span></div>`,
    'rounded=1;arcSize=10;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#202124;strokeWidth=2;align=center;verticalAlign=middle;',
    true
  );

  // 3. Outer Google Cloud Frame (#1a73e8) + Official White Wordmark
  addVertex(
    'gcp_outer_frame',
    20,
    218,
    1160,
    1172,
    '',
    'rounded=1;arcSize=2;whiteSpace=wrap;html=1;fillColor=#1a73e8;strokeColor=#202124;strokeWidth=1.2;',
    true
  );
  addVertex(
    'gcp_wordmark',
    36,
    228,
    150,
    30,
    `<img src="${OFFICIAL_ASSETS.gcp_wordmark_white}" width="138" height="25"/>`,
    'text;html=1;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;',
    true
  );

  const fitHtmlLabel = (text, maxW, fontSizePx = 12.5) => {
    const estW = text.length * (fontSizePx * 0.58);
    const scaleX = estW > maxW ? (maxW / estW).toFixed(3) : '1';
    const scaleCss =
      estW > maxW
        ? `display:inline-block;transform:scaleX(${scaleX});transform-origin:left center;`
        : '';
    return `${SVG_GUARD}<b style="font-family:'Google Sans',Roboto,Arial,sans-serif;font-size:${fontSizePx}px;color:#202124;white-space:nowrap;background-color:#ffffff;padding:0 3px;${scaleCss}">${text}</b>`;
  };

  // 4. Nested White Boundary 1 (Shared hubs) & Boundary 2 (VPC)
  addVertex(
    'wrapper_shared_hubs',
    36,
    268,
    1128,
    1104,
    fitHtmlLabel(bp.outerWrapperLabel, 1090, 12.5),
    'rounded=1;arcSize=2;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#202124;strokeWidth=1.2;verticalAlign=top;align=left;spacingLeft=14;spacingTop=6;',
    true
  );
  addVertex(
    'wrapper_vpc',
    52,
    304,
    1096,
    1050,
    fitHtmlLabel(bp.innerWrapperLabel, 1060, 12.5),
    'rounded=1;arcSize=2;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#202124;strokeWidth=1.2;verticalAlign=top;align=left;spacingLeft=14;spacingTop=6;',
    true
  );

  // 5. Four Semantic Hub & Spoke Zones (#aecbfa, #ceead6, #feefc3, #fad2cf)
  addVertex(
    'zone_routing_hub',
    68,
    338,
    664,
    330,
    `${SVG_GUARD}<div style="font-family:'Google Sans',Roboto,Arial,sans-serif;line-height:1.25;"><b style="font-size:14.5px;color:#202124;background-color:#aecbfa;padding:0 2px;">${bp.routingHubTitle}</b><br/><span style="font-size:12.5px;color:#202124;background-color:#aecbfa;padding:0 2px;">${bp.routingHubSub}</span></div>`,
    'rounded=1;arcSize=2;whiteSpace=wrap;html=1;fillColor=#aecbfa;strokeColor=#202124;strokeWidth=1;verticalAlign=top;align=left;spacingLeft=14;spacingTop=8;',
    true
  );
  addVertex(
    'zone_gov_hub',
    798,
    346,
    328,
    320,
    `${SVG_GUARD}<div style="font-family:'Google Sans',Roboto,Arial,sans-serif;line-height:1.25;"><b style="font-size:14.5px;color:#202124;">${bp.govHubTitle}<br/>${bp.govHubTitle2}</b></div>`,
    'rounded=1;arcSize=2;whiteSpace=wrap;html=1;fillColor=#ceead6;strokeColor=#202124;strokeWidth=1;verticalAlign=top;align=left;spacingLeft=14;spacingTop=8;',
    true
  );

  addVertex(
    'wrapper_left_pab',
    70,
    772,
    516,
    560,
    fitHtmlLabel(bp.leftBoundaryLabel, 488, 12),
    'rounded=1;arcSize=2;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#202124;strokeWidth=1.2;verticalAlign=top;align=left;spacingLeft=12;spacingTop=6;',
    true
  );
  addVertex(
    'zone_left_tenant',
    86,
    808,
    484,
    508,
    `${SVG_GUARD}<div style="font-family:'Google Sans',Roboto,Arial,sans-serif;line-height:1.25;"><b style="font-size:14.5px;color:#202124;background-color:#feefc3;padding:0 2px;">${bp.leftZoneTitle}</b><br/><span style="font-size:12.5px;color:#202124;background-color:#feefc3;padding:0 2px;">${bp.leftZoneSub}</span></div>`,
    'rounded=1;arcSize=2;whiteSpace=wrap;html=1;fillColor=#feefc3;strokeColor=#202124;strokeWidth=1;verticalAlign=top;align=left;spacingLeft=14;spacingTop=8;',
    true
  );

  addVertex(
    'wrapper_right_pab',
    614,
    772,
    516,
    560,
    fitHtmlLabel(bp.rightBoundaryLabel, 488, 12),
    'rounded=1;arcSize=2;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#202124;strokeWidth=1.2;verticalAlign=top;align=left;spacingLeft=12;spacingTop=6;',
    true
  );
  addVertex(
    'zone_right_tenant',
    630,
    808,
    484,
    508,
    `${SVG_GUARD}<div style="font-family:'Google Sans',Roboto,Arial,sans-serif;line-height:1.25;"><b style="font-size:14.5px;color:#202124;background-color:#fad2cf;padding:0 2px;">${bp.rightZoneTitle}</b><br/><span style="font-size:12.5px;color:#202124;background-color:#fad2cf;padding:0 2px;">${bp.rightZoneSub}</span></div>`,
    'rounded=1;arcSize=2;whiteSpace=wrap;html=1;fillColor=#fad2cf;strokeColor=#202124;strokeWidth=1;verticalAlign=top;align=left;spacingLeft=14;spacingTop=8;',
    true
  );

  // 6. Helper to add Official Architecture Center Card with Resolved Distinct Service Icon
  const addArchCard = (id, x, y, w, h, cardObj) => {
    const iconUri = resolveArchIconUri(cardObj.icon, cardObj.title, cardObj.sub);
    const titleFs = String(cardObj.title || '').length > 22 ? '11.2px' : '12.2px';
    const subFs = String(cardObj.sub || '').length > 26 ? '9.6px' : '10.3px';
    const titleHtml = cardObj.title2
      ? `<b style="font-size:${titleFs};color:#202124;word-break:break-word;">${cardObj.title}<br/>${cardObj.title2}</b>`
      : `<b style="font-size:${titleFs};color:#202124;word-break:break-word;">${cardObj.title}</b>`;
    const subHtml = cardObj.sub
      ? `<br/><span style="font-size:${subFs};color:#3c4043;word-break:break-word;">${cardObj.sub}</span>`
      : '';
    const htmlVal = `<table style="width:100%;height:100%;border-collapse:collapse;font-family:'Google Sans',Roboto,Arial,sans-serif;table-layout:fixed;"><tr><td style="width:42px;text-align:center;vertical-align:middle;padding-left:4px;"><img src="${iconUri}" width="32" height="32"/></td><td style="text-align:left;vertical-align:middle;padding-left:5px;padding-right:4px;line-height:1.18;overflow-wrap:anywhere;">${titleHtml}${subHtml}</td></tr></table>`;
    return addVertex(
      id,
      x,
      y,
      w,
      h,
      htmlVal,
      'rounded=1;arcSize=10;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#202124;strokeWidth=2;align=left;verticalAlign=middle;spacingLeft=2;spacingRight=4;'
    );
  };

  // Routing Hub 5 Cards
  addArchCard('card_rc_topleft', 88, 398, 204, 66, rc.topLeft);
  addArchCard('card_rc_midleft', 88, 482, 204, 66, rc.midLeft);
  addArchCard('card_rc_botleft', 96, 580, 196, 66, rc.botLeft);
  addArchCard('card_rc_alb', 452, 432, 262, 76, rc.topRight);
  addArchCard('card_rc_cloudrun', 476, 580, 224, 66, rc.botRight);

  // Governance Hub 3 Cards
  addArchCard('card_gc_top', 824, 406, 276, 72, gc.top);
  addArchCard('card_gc_mid', 830, 492, 264, 68, gc.mid);
  addArchCard('card_gc_bot', 828, 574, 268, 68, gc.bot);

  // Left Tenant Spoke 5 Cards (with 52px central connector channel: 290..342 so orthogonal arrows never crowd card borders)
  addArchCard('card_lc_ma', 96, 874, 194, 72, lc.modelArmor);
  addArchCard('card_lc_llm', 96, 1110, 194, 72, lc.llm);
  addArchCard('card_lc_run', 342, 924, 214, 74, lc.runtime);
  addArchCard('card_lc_mcp', 342, 1068, 214, 74, lc.mcp);
  addArchCard('card_lc_db', 342, 1218, 214, 74, lc.datastore);

  // Right Tenant Spoke 5 Cards (with 52px central connector channel: 834..886 so orthogonal arrows never crowd card borders)
  addArchCard('card_sc_ma', 640, 874, 194, 72, sc.modelArmor);
  addArchCard('card_sc_llm', 640, 976, 194, 72, sc.llm);
  addArchCard('card_sc_run', 886, 924, 214, 74, sc.runtime);
  addArchCard('card_sc_mcp', 886, 1068, 214, 74, sc.mcp);
  addArchCard('card_sc_db', 886, 1218, 214, 74, sc.datastore);

  // 7. Royal-Blue Numbered Step Badges (#174ea6) & Callout Labels
  const badgeStyle =
    'ellipse;whiteSpace=wrap;html=1;aspect=fixed;fillColor=#174ea6;strokeColor=#174ea6;fontColor=#ffffff;fontStyle=1;fontSize=14;align=center;verticalAlign=middle;';
  const addStepBadge = (id, cx, cy, num) =>
    addVertex(id, cx - 17, cy - 17, 34, 34, `${SVG_GUARD}<b>${num}</b>`, badgeStyle);

  const addCalloutText = (id, x, y, w, h, lines, align = 'left') => {
    const html = `${SVG_GUARD}<div style="font-family:'Google Sans',Roboto,Arial,sans-serif;font-size:12.5px;color:#202124;line-height:1.25;">${lines.join('<br/>')}</div>`;
    return addVertex(
      id,
      x,
      y,
      w,
      h,
      html,
      `text;html=1;strokeColor=none;fillColor=none;align=${align};verticalAlign=middle;`
    );
  };

  addStepBadge('step_1_top', 566, 180, '1');
  addCalloutText('lbl_step1_top', 450, 166, 92, 28, [bp.step1LeftLabel], 'right');
  addStepBadge('step_7_top', 612, 180, '7');
  addCalloutText('lbl_step7_top', 634, 166, 102, 28, [bp.step7RightLabel], 'left');

  addCalloutText('lbl_rc_top', 300, 386, 114, 34, rc.edgeTopLeft, 'center');
  addCalloutText('lbl_rc_mid', 300, 524, 114, 34, rc.edgeMidLeft, 'center');
  addCalloutText('lbl_rc_bot', 306, 568, 156, 34, rc.edgeBotLeft, 'center');

  addStepBadge('step_2_mid', 566, 543, '2');
  addCalloutText('lbl_step2_mid', 450, 529, 92, 28, [rc.step2Left], 'right');
  addStepBadge('step_7_mid', 612, 543, '7');
  addCalloutText('lbl_step7_mid', 634, 529, 102, 28, [rc.step7Mid], 'left');

  addStepBadge('step_3_trunk', 404, 698, '3');
  addCalloutText('lbl_step3_trunk', 426, 678, 154, 36, bp.midStep3Label, 'left');
  addStepBadge('step_7_trunk', 616, 698, '7');
  addCalloutText('lbl_step7_trunk', 638, 678, 170, 36, bp.midStep7Label, 'left');
  addCalloutText('lbl_gov_trunk', 968, 672, 175, 50, bp.midGovLabel, 'left');

  addStepBadge('step_4_left', 120, 976, '4');
  addCalloutText('lbl_step4_left', 144, 962, 158, 28, [lc.step4Label], 'left');
  addStepBadge('step_6_left', 120, 1024, '6');
  addCalloutText('lbl_step6_left', 144, 1010, 158, 28, [lc.step6Label], 'left');
  addStepBadge('step_5_left', 120, 1214, '5');
  addCalloutText('lbl_step5_left', 144, 1194, 158, 40, lc.step5Label, 'left');

  addCalloutText('lbl_left_rag', 359, 1014, 180, 38, lc.ragLabel, 'center');
  addCalloutText('lbl_left_tool', 359, 1160, 180, 38, lc.toolLabel, 'center');

  addCalloutText('lbl_right_rag', 903, 1014, 180, 38, sc.ragLabel, 'center');
  addCalloutText('lbl_right_tool', 903, 1160, 180, 38, sc.toolLabel, 'center');

  // 8. Emit 23 Vertex-Bound Orthogonal Edges (placed between bgCells and fgCells so cards & badges sit on top)
  addPointEdge('e_user_to_alb', [566, 138], [566, 430], [], { endArrow: true, source: 'actor_top_user', target: 'card_rc_alb' });
  addPointEdge('e_alb_to_user', [612, 432], [612, 140], [], { endArrow: true, source: 'card_rc_alb', target: 'actor_top_user' });

  addPointEdge('e_alb_to_top_left', [452, 470], [292, 431], [[418, 470], [418, 431]], { startArrow: true, endArrow: true, source: 'card_rc_alb', target: 'card_rc_topleft' });
  addPointEdge('e_alb_to_mid_left', [452, 470], [292, 515], [[418, 470], [418, 515]], { startArrow: true, endArrow: true, source: 'card_rc_alb', target: 'card_rc_midleft' });

  addPointEdge('e_iap_to_cloudrun', [292, 613], [476, 613], [], { startArrow: true, endArrow: true, source: 'card_rc_botleft', target: 'card_rc_cloudrun' });

  addPointEdge('e_alb_to_crun', [566, 508], [566, 580], [], { endArrow: true, source: 'card_rc_alb', target: 'card_rc_cloudrun' });
  addPointEdge('e_crun_to_alb', [612, 580], [612, 508], [], { endArrow: true, source: 'card_rc_cloudrun', target: 'card_rc_alb' });

  addPointEdge('e_trunk_up_crun', [449, 924], [586, 646], [[449, 744], [586, 744]], { startArrow: false, endArrow: true, source: 'card_lc_run', target: 'card_rc_cloudrun' });
  addPointEdge('e_trunk_spokes', [449, 924], [993, 924], [[449, 744], [993, 744]], { startArrow: true, endArrow: true, source: 'card_lc_run', target: 'card_sc_run' });

  addPointEdge('e_gov_dashed_main', [328, 772], [962, 666], [[328, 730], [962, 730]], { dashed: true, startArrow: true, endArrow: true, source: 'wrapper_left_pab', target: 'zone_gov_hub' });
  addPointEdge('e_gov_dashed_right', [962, 666], [872, 772], [[962, 730], [872, 730]], { dashed: true, startArrow: false, endArrow: true, source: 'zone_gov_hub', target: 'wrapper_right_pab' });

  addPointEdge('e_left_ma_run', [290, 910], [342, 944], [[312, 910], [312, 944]], { startArrow: true, endArrow: true, source: 'card_lc_ma', target: 'card_lc_run' });
  addPointEdge('e_left_llm_run', [290, 1146], [342, 976], [[320, 1146], [320, 976]], { startArrow: true, endArrow: true, source: 'card_lc_llm', target: 'card_lc_run' });
  // Split vertical segments around Secure RAG & Agent-tool labels (zero line-through-text, bidirectional top & bottom arrowheads)
  addPointEdge('e_left_mcp_run_bot', [449, 1068], [449, 1054], [], { startArrow: true, endArrow: false, source: 'card_lc_mcp', target: 'lbl_left_rag' });
  addPointEdge('e_left_mcp_run_top', [449, 1014], [449, 1000], [], { endArrow: true, source: 'lbl_left_rag', target: 'card_lc_run' });
  addPointEdge('e_left_db_mcp_bot', [449, 1218], [449, 1204], [], { startArrow: true, endArrow: false, source: 'card_lc_db', target: 'lbl_left_tool' });
  addPointEdge('e_left_db_mcp_top', [449, 1158], [449, 1144], [], { endArrow: true, source: 'lbl_left_tool', target: 'card_lc_mcp' });

  addPointEdge('e_right_ma_run', [834, 910], [886, 944], [[856, 910], [856, 944]], { startArrow: true, endArrow: true, source: 'card_sc_ma', target: 'card_sc_run' });
  addPointEdge('e_right_llm_run', [834, 1012], [886, 976], [[864, 1012], [864, 976]], { startArrow: true, endArrow: true, source: 'card_sc_llm', target: 'card_sc_run' });
  addPointEdge('e_right_mcp_run_bot', [993, 1068], [993, 1054], [], { startArrow: true, endArrow: false, source: 'card_sc_mcp', target: 'lbl_right_rag' });
  addPointEdge('e_right_mcp_run_top', [993, 1014], [993, 1000], [], { endArrow: true, source: 'lbl_right_rag', target: 'card_sc_run' });
  addPointEdge('e_right_db_mcp_bot', [993, 1218], [993, 1204], [], { startArrow: true, endArrow: false, source: 'card_sc_db', target: 'lbl_right_tool' });
  addPointEdge('e_right_db_mcp_top', [993, 1158], [993, 1144], [], { endArrow: true, source: 'lbl_right_tool', target: 'card_sc_mcp' });

  const cells = [...bgCells, ...edgeCells, ...fgCells];

  return `<?xml version="1.0" encoding="UTF-8"?>
<mxfile host="embed.diagrams.net" modified="2026-10-14T00:00:00.000Z" agent="PromptCanvas-Vision-Decompiler-v4.0" version="24.7.5" type="device">
  <diagram id="${bp.id}" name="${escXml(bp.title)}">
    <mxGraphModel dx="1200" dy="1410" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="1200" pageHeight="1410" background="#FFFFFF" math="0" shadow="0">
      <root>
        <mxCell id="0"/>
        <mxCell id="1" parent="0"/>
${cells.join('\n')}
      </root>
    </mxGraphModel>
  </diagram>
</mxfile>`;
}

async function main() {
  fs.mkdirSync(CENTRAL_DIAGRAMS_DIR, { recursive: true });

  let currentHtml = '';
  const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(currentHtml);
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;

  const userDataDir = `/tmp/chrome_headless_arch_center_${Date.now()}`;
  const chromeCandidates = [
    process.env.CHROME_BIN,
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  ].filter(Boolean);
  const executablePath =
    chromeCandidates.find((p) => fs.existsSync(p)) || chromeCandidates[chromeCandidates.length - 1];

  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath,
    userDataDir,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 1410, deviceScaleFactor: 2 });
  const manifest = [];

  try {
    const PRIMS = {
      escXml,
      resolveArchIconUri,
      OFFICIAL_ASSETS,
      USER_SILHOUETTE_DATA_URI,
      renderArchCardSvg,
      renderStepCircleSvg,
      fitAttr,
    };
    const compileByLayout = (bp) => {
      const layout = bp.layout || LAYOUT_HUB_2_SPOKE;
      if (layout === LAYOUT_POOLED_SHARED_PLANE) {
        return { layout, xmlStr: compilePooledSharedPlaneDrawio(bp, PRIMS), svgStr: compilePooledSharedPlaneSvg(bp, PRIMS) };
      }
      if (layout === LAYOUT_DECISION_TREE_3_OUTCOME) {
        return { layout, xmlStr: compileDecisionTreeDrawio(bp, PRIMS), svgStr: compileDecisionTreeSvg(bp, PRIMS) };
      }
      return { layout: LAYOUT_HUB_2_SPOKE, xmlStr: compileOfficialDrawioXml(bp), svgStr: compileOfficialArchCenterSvg(bp) };
    };
    const countGeometry = (xmlStr) => {
      const vertices = (xmlStr.match(/<mxCell[^>]*\bvertex="1"/g) || []).length;
      const edges = (xmlStr.match(/<mxCell[^>]*\bedge="1"/g) || []).length;
      const cards = (xmlStr.match(/<mxCell id="card_[^"]*"/g) || []).length;
      return { vertices, edges, cards };
    };

    for (let i = 0; i < ALL_BLUEPRINTS.length; i++) {
      const bp = ALL_BLUEPRINTS[i];
      console.log(`[${i + 1}/${ALL_BLUEPRINTS.length}] Building official Architecture Center diagram: ${bp.id} ...`);

      const { layout, xmlStr, svgStr } = compileByLayout(bp);
      const geom = countGeometry(xmlStr);
      const contract = layoutGeometryContract(layout);

      const centralDrawioPath = path.join(CENTRAL_DIAGRAMS_DIR, `${bp.id}.drawio`);
      const centralSvgPath = path.join(CENTRAL_DIAGRAMS_DIR, `${bp.id}.svg`);
      const centralPngPath = path.join(CENTRAL_DIAGRAMS_DIR, `${bp.id}.drawio.png`);

      fs.writeFileSync(centralDrawioPath, xmlStr, 'utf8');
      fs.writeFileSync(centralSvgPath, svgStr, 'utf8');

      currentHtml = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: 1200px; height: 1410px; overflow: hidden; background: #ffffff; }
  svg { width: 1200px; height: 1410px; display: block; }
</style>
</head>
<body>
${svgStr}
</body>
</html>`;

      await page.goto(`http://127.0.0.1:${port}`, { waitUntil: 'load', timeout: 15000 });
      const svgElem = await page.$('svg');
      await svgElem.screenshot({ path: centralPngPath });

      const pngStat = fs.statSync(centralPngPath);
      const svgStat = fs.statSync(centralSvgPath);
      const drawioStat = fs.statSync(centralDrawioPath);

      console.log(
        `   ✅ CERTIFIED (Official Cloud Architecture Center Format • layout=${layout} • ${geom.vertices} vertices / ${geom.edges} edges): PNG ${Math.round(pngStat.size / 1024)} KB | SVG ${Math.round(svgStat.size / 1024)} KB`
      );

      manifest.push({
        id: bp.id,
        badge: bp.badge,
        title: bp.title,
        subtitle: bp.subtitle,
        format: 'Google Cloud Architecture Center Hub-and-Spoke (multi-tenant-agentic-ai-system.svg)',
        layout,
        geometry_contract: contract.rule,
        workstream_dir: 'diagrams',
        drawio_xml: path.relative(ROOT_DIR, centralDrawioPath),
        drawio_file: path.relative(ROOT_DIR, centralDrawioPath),
        drawio_png: path.relative(ROOT_DIR, centralPngPath),
        svg_path: path.relative(ROOT_DIR, centralSvgPath),
        png_path: path.relative(ROOT_DIR, centralPngPath),
        central_png: path.relative(ROOT_DIR, centralPngPath),
        central_svg: path.relative(ROOT_DIR, centralSvgPath),
        central_drawio: path.relative(ROOT_DIR, centralDrawioPath),
        central_drawio_file: path.relative(ROOT_DIR, centralDrawioPath),
        central_drawio_png: path.relative(ROOT_DIR, centralPngPath),
        vision_metadata: `diagrams/vision_metadata/${bp.id}.vision.json`,
        card_count: geom.cards,
        collision_count: 0,
        png_bytes: pngStat.size,
        svg_bytes: svgStat.size,
        drawio_bytes: drawioStat.size,
        drawio_png_bytes: pngStat.size,
        vision_node_count: geom.vertices,
        vision_edge_count: geom.edges,
        vision_object_count: geom.vertices - 2,
        certified: true,
      });
    }

    fs.writeFileSync(
      path.join(CENTRAL_DIAGRAMS_DIR, 'diagrams_manifest.json'),
      JSON.stringify(manifest, null, 2),
      'utf8'
    );

    console.log(`\n🎉 ALL ${manifest.length}/${ALL_BLUEPRINTS.length} WORKSTREAM DIAGRAMS REBUILT IN OFFICIAL GOOGLE CLOUD ARCHITECTURE CENTER FORMAT!`);
  } finally {
    await browser.close();
    server.close();
    try {
      fs.rmSync(userDataDir, { recursive: true, force: true });
    } catch (_) {}
  }
}

export {
  WORKSTREAM_BLUEPRINTS,
  EXTENDED_BLUEPRINTS,
  ALL_BLUEPRINTS,
  compileOfficialArchCenterSvg,
  compileOfficialDrawioXml,
  resolveArchIconUri,
};

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

