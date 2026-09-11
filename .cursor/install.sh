#!/usr/bin/env bash
set -euo pipefail

# Gauge CLI
if ! command -v gauge >/dev/null 2>&1; then
  curl -SsL https://downloads.gauge.org/stable | sh
fi

# Gauge language/report plugins (idempotent)
if ! gauge version 2>/dev/null | grep -q 'js (5'; then
  gauge install js
fi
if ! gauge version 2>/dev/null | grep -q 'html-report'; then
  gauge install html-report
fi

# studio-reporter from GitHub release (prebuilt; avoids Go 1.26 toolchain in base image)
STUDIO_REPORTER_VERSION="0.4.6"
PLUGIN_DIR="${HOME}/.gauge/plugins/studio-reporter/${STUDIO_REPORTER_VERSION}"
if [ ! -x "${PLUGIN_DIR}/bin/studio-reporter" ]; then
  mkdir -p "${PLUGIN_DIR}"
  tmpzip="$(mktemp)"
  curl -fsSL -o "${tmpzip}" \
    "https://github.com/Linhanmic/studio-reporter/releases/download/v${STUDIO_REPORTER_VERSION}/studio-reporter-${STUDIO_REPORTER_VERSION}-linux.x86_64.zip"
  unzip -oq "${tmpzip}" -d "${PLUGIN_DIR}"
  chmod +x "${PLUGIN_DIR}/bin/studio-reporter"
  rm -f "${tmpzip}"
fi

# studio-reporter source checkout for dual-repo PR iteration
SRC_DIR="${HOME}/repos/studio-reporter"
if [ ! -d "${SRC_DIR}/.git" ]; then
  mkdir -p "${HOME}/repos"
  git clone --depth 1 https://github.com/Linhanmic/studio-reporter.git "${SRC_DIR}"
fi

# gauge-js-demo for smoke/integration against GaugeStudio
DEMO_DIR="${HOME}/repos/gauge-js-demo"
if [ ! -d "${DEMO_DIR}/.git" ]; then
  mkdir -p "${HOME}/repos"
  git clone --depth 1 https://github.com/Linhanmic/gauge-js-demo.git "${DEMO_DIR}"
fi
cd "${DEMO_DIR}"
npm ci

# GaugeStudio (primary repo at /workspace)
cd /workspace
npm ci
