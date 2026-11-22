/** The top of a reading page: a heading in the display face, and a lede. */
export default function PageHead({ title, children }: { title: React.ReactNode; children?: React.ReactNode }) {
  return (
    <header className="page-head">
      <h1>{title}</h1>
      {children ? <p>{children}</p> : null}
    </header>
  );
}
