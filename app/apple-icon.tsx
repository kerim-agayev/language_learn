import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#2b55d9" }}>
        <svg width="120" height="120" viewBox="0 0 64 64"><path d="M32 6C25 18 15 28 15 39a17 17 0 0 0 34 0C49 28 39 18 32 6z" fill="#fff" /></svg>
      </div>
    ),
    size,
  );
}
