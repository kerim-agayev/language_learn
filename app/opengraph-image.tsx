import { ImageResponse } from "next/og";

export const alt = "damla: iş arasında, damla damla İngilizce";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OG() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", background: "#e9edf3", padding: 80, gap: 70, fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
          <div style={{ fontSize: 40, fontWeight: 700, color: "#2b55d9" }}>damla</div>
          <div style={{ fontSize: 76, fontWeight: 800, color: "#1a2433", lineHeight: 1.05, marginTop: 20 }}>İş arasında, damla damla İngilizce.</div>
          <div style={{ fontSize: 30, color: "#5b6678", marginTop: 28 }}>A1 → C2, birkaç dakikada bir tek kart</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", width: 340, background: "#fff", borderRadius: 18, padding: 40, transform: "rotate(-3deg)", boxShadow: "0 20px 40px rgba(26,36,51,.18)", borderTop: "10px solid #f5b83d" }}>
          <div style={{ fontSize: 50, fontWeight: 800, color: "#1a2433" }}>run out of</div>
          <div style={{ fontSize: 24, color: "#5b6678", marginTop: 8 }}>phrasal verb</div>
          <div style={{ fontSize: 30, fontWeight: 700, color: "#1a2433", marginTop: 24 }}>-i bitmek, tükenmek</div>
        </div>
      </div>
    ),
    size,
  );
}
