const colors = {
  light: {
    text: "#1A2B1A",
    tint: "#1A6B3C",

    background: "#F5F7F4",
    foreground: "#1A2B1A",

    card: "#FFFFFF",
    cardForeground: "#1A2B1A",

    primary: "#1A6B3C",
    primaryForeground: "#FFFFFF",

    secondary: "#E8F0E8",
    secondaryForeground: "#1A3E26",

    muted: "#EEF3EE",
    mutedForeground: "#6B7C6B",

    accent: "#2ECC71",
    accentForeground: "#0D3320",

    destructive: "#C62828",
    destructiveForeground: "#FFFFFF",

    border: "#D4E0D4",
    input: "#D4E0D4",

    success: "#2ECC71",
    warning: "#F59E0B",
    info: "#3B82F6",
  },

  // Mirrors the web dashboard's .dark palette (artifacts/admin-dashboard/src/index.css)
  // hue-for-hue, converted from its HSL tokens — same brand green primary, same
  // background/foreground relationship, so the two apps read as one product in
  // either theme.
  dark: {
    text: "#F0F2F4",
    tint: "#3D8F5B",

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

    accent: "#2ECC71",
    accentForeground: "#0B2818",

    destructive: "#DD3C3C",
    destructiveForeground: "#FFFFFF",

    border: "#2B303B",
    input: "#363D49",

    success: "#45A167",
    warning: "#E8A530",
    info: "#3B82F6",
  },

  radius: 10,
};

export default colors;
