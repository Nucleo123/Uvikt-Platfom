import type { Metadata } from "next";
import "../styles/globals.css";

export const metadata: Metadata = {
  title: "UVIKT — Property Intelligence",
  description: "Dispara. Valida. Personaliza. Envía.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
