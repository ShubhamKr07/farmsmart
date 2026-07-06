// Rebuilt from the web dashboard's actual tokens (artifacts/admin-dashboard/src/index.css),
// converted HSL -> hex, replacing the old independent mobile-only palette. See
// docs/alpha-app.md Phase 4.0 for the audit that found the previous light palette had never
// been derived from web at all, and dark had 2 wrong tokens (accent, destructive).
const colors = {
  light: {
    background: "#F6F6F9",
    foreground: "#16181D",

    card: "#FFFFFF",
    cardForeground: "#16181D",

    primary: "#2E6B44",
    primaryForeground: "#FFFFFF",

    secondary: "#F3F4F6",
    secondaryForeground: "#2E3140",

    muted: "#F3F4F6",
    mutedForeground: "#5C6370",

    accent: "#F3F4F6",
    accentForeground: "#2E3140",

    destructive: "#EF4343",
    destructiveForeground: "#FFFFFF",

    border: "#E5E7EB",
    input: "#E5E7EB",

    statusOk: "#2D7648",
    statusOkForeground: "#FFFFFF",
    statusWarn: "#C68310",
    statusWarnForeground: "#FFFFFF",
    statusCritical: "#C52020",
    statusCriticalForeground: "#FFFFFF",

    chart1: "#2E6B44",
    chart2: "#59A675",
    chart3: "#A3C2AE",
    chart4: "#576175",
    chart5: "#8A94A8",

    // The old logo-green primary, kept as a distinct, intentional brand pop-color —
    // no longer the same slot as `accent` (which now matches web's neutral hover-surface).
    highlight: "#2ECC71",

    // Same hue already used as a fixed categorical pH accent in RackReadingsCard/
    // ChannelMonitoringCard — reused here for the Home yield chart's bad-trays
    // series (Phase 6), a deliberate mobile-only divergence from web's chart,
    // which colors that series destructive-red.
    chartPurple: "#9C27B0",
  },

  // Mirrors the web dashboard's .dark palette (artifacts/admin-dashboard/src/index.css)
  // hue-for-hue, converted from its HSL tokens — same brand green primary, same
  // background/foreground relationship, so the two apps read as one product in
  // either theme.
  dark: {
    background: "#16181D",
    foreground: "#F0F2F4",

    card: "#1A1D23",
    cardForeground: "#F0F2F4",

    primary: "#3D8F5B",
    primaryForeground: "#FFFFFF",

    secondary: "#272C35",
    secondaryForeground: "#F0F2F4",

    muted: "#272C35",
    mutedForeground: "#8F96A3",

    accent: "#272C35",
    accentForeground: "#F0F2F4",

    // Intentionally kept at web's --status-critical brightness (#DD3C3C) rather than
    // web's dimmer actual --destructive (#7C1D1D) — already shipped and verified legible
    // on mobile's FAB/banner/badge surfaces; web's dimmer value was tuned for buttons
    // sitting on --card, not verified against mobile's usage.
    destructive: "#DD3C3C",
    destructiveForeground: "#FFFFFF",

    border: "#2B303B",
    input: "#363D49",

    statusOk: "#45A167",
    statusOkForeground: "#FFFFFF",
    statusWarn: "#E8A530",
    statusWarnForeground: "#0B0B0C",
    statusCritical: "#DD3C3C",
    statusCriticalForeground: "#FFFFFF",

    chart1: "#3D8F5B",
    chart2: "#7AB891",
    chart3: "#C2D6C9",
    chart4: "#8A94A8",
    chart5: "#C4C9D4",

    highlight: "#2ECC71",
    chartPurple: "#9C27B0",
  },

  radius: 8,
};

export default colors;
