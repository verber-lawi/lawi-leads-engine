import "./globals.css";

export const metadata = {
  title: "Lawi Leads Engine",
  description: "Plataforma de generación y gestión de leads — Lawi LawTech",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
