"use client";

import { Rowdies } from "next/font/google";
import { usePathname } from "next/navigation";
import BottomNavbar from "@/components/BottomNavbar";

const rowdies = Rowdies({
  subsets: ["latin"],
  weight: ["300", "400", "700"],
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // ✅ Somente as páginas principais do app têm BottomNavbar
  const showBottomNav =
    pathname === "/feed" ||
    pathname === "/events" ||
    pathname === "/activities" ||
    pathname === "/profile";

  return (
    <html lang="en">
      <body className={rowdies.className}>
        {children}
        {showBottomNav && <BottomNavbar />}
      </body>
    </html>
  );
}
