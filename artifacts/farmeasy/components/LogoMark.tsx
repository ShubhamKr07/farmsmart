import React from "react";
import Svg, { Path } from "react-native-svg";

/**
 * The real brand mark (leaf icon) — same path data as the web app's
 * logo-mark.svg/logo-lockup.svg. Fixed brand green regardless of theme
 * (matches how the web logo stays #1A6B3C in both light and dark mode —
 * a logo is brand identity, not a themeable UI color).
 */
export default function LogoMark({ size = 32 }: { size?: number }) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="#1A6B3C"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
      <Path d="M7 14h2.2l1.3-2.6 1.8 4 1.3-2.6H16" strokeWidth={1.4} />
    </Svg>
  );
}
