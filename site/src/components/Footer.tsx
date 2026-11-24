import Link from "next/link";
import s from "./Footer.module.css";

/** The foot of every reading page (not the playground or a lesson, which fill the screen). */
export default function Footer() {
  return (
    <footer className={s.footer}>
      <div className={`wrap ${s.in}`}>
        <div className={s.top}>
          <p className={s.mark}>
            typeshi <span>lock in fn.</span>
          </p>
          <nav aria-label="footer" className={s.links}>
            <Link href="/tour">tour</Link>
            <Link href="/play">playground</Link>
            <Link href="/exploits">exploits</Link>
            <Link href="/opinions">opinions</Link>
            <Link href="/keywords">keywords</Link>
            <Link href="/built">how it&apos;s built</Link>
            <a href="/llms.txt">llms.txt</a>
            <a href="https://github.com/tickerzhq/typeshi">github</a>
          </nav>
        </div>
        <div className={s.bottom}>
          <p>
            MIT · not affiliated with TypeScript or Microsoft · not financial advice · made by{" "}
            <a href="https://tickerz.com">Tickerz</a>
          </p>
          <p className={s.moon}>wen moon? soon™</p>
        </div>
      </div>
    </footer>
  );
}
