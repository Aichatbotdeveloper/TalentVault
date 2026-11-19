import { PublicFooter } from "@/components/public/footer";
import { PublicHeader } from "@/components/public/header";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[60] btn-primary">Skip to content</a>
      <PublicHeader />
      <main id="main" className="w-full pt-20 bg-surface min-h-screen">{children}</main>
      <PublicFooter />
    </>
  );
}
