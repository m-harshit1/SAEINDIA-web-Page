import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Applications · SAEINDIA IIITDM Kurnool",
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return children;
}
