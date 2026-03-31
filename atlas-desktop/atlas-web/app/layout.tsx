import localFont from "next/font/local";
import "./globals.css";

const inter = localFont({
  src: "./fonts/Inter-Variable.ttf",
  variable: "--font-inter",
  display: "swap",
});

export const metadata = {
  title: "Atlas AI",
  description: "Your private, offline AI assistant",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} dark h-full antialiased`}>
      <body className="h-full bg-[#0a0a0a] text-white font-sans">
        {children}
      </body>
    </html>
  );
}
