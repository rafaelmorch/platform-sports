"use client";

import { Rowdies } from "next/font/google";
import { usePathname } from "next/navigation";
import BottomNavbar from "@/components/BottomNavbar";

const rowdies = Rowdies({
  subsets: ["latin"],
  weight: ["300", "400", "700"],
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const hideBottomNav =
    pathname === "/" ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/signup") ||
    pathname.startsWith("/register") ||
    pathname.startsWith("/contact");

  return (
    <html lang="en">
      <body className={rowdies.className}>
        {children}
        {!hideBottomNav && <BottomNavbar />}
      </body>
    </html>
  );
}
