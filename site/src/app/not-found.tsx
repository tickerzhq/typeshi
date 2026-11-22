import type { Metadata } from "next";
import Link from "next/link";
import Doors from "@/components/Doors";
import Footer from "@/components/Footer";
import PageHead from "@/components/PageHead";
import s from "./not-found.module.css";

export const metadata: Metadata = { title: "404" };

// Our own not-found page, so the site's tokens and theme apply. Next's built-in one sets its own body
// colors from prefers-color-scheme, which left a dark header over a white page in the light theme.
export default function NotFound() {
  return (
    <>
      <div className="wrap">
        <PageHead
          title={
            <>
              404. <span className={s.ngmi}>ngmi.</span>
            </>
          }
        >
          There&apos;s no page here. Maybe it never launched, maybe it got rugged. Either way, nothing to see.
        </PageHead>
        <div className={s.actions}>
          <Link href="/" className="button">
            back home <span aria-hidden="true">→</span>
          </Link>
        </div>
        <Doors label="or try one of these" />
      </div>
      <Footer />
    </>
  );
}
