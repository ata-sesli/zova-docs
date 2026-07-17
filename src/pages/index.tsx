import Link from '@docusaurus/Link';
import Layout from '@theme/Layout';
import styles from './index.module.css';

const features = [
  ['SQLite at the core', 'Use tables, indexes, views, triggers, prepared statements, transactions, and SQL without a new query language.'],
  ['Objects and vectors', 'Store content-addressed bytes and exact-search vector collections beside application records.'],
  ['Graph-aware relationships', 'Model directed relationships and run bounded native or SQL-native traversal over stable application IDs.'],
  ['Operational by design', 'Back up, compact, diagnose, salvage, and optionally split object, vector, and graph storage.'],
];

export default function Home() {
  return <Layout title="Embedded storage that stays understandable" description="Zova documentation">
    <main>
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <div className={styles.heroCopy}>
            <span className={styles.eyebrow}>Zova v0.24.0 · format 8</span>
            <h1>Local data, shaped for real applications.</h1>
            <p>Keep relational data in SQLite, then add content-addressed objects, exact vectors, and graph-aware relationships without introducing a server.</p>
            <div className={styles.actions}>
              <Link className="button button--primary button--lg" to="/docs/intro">Start building</Link>
              <Link className="button button--secondary button--lg" to="/docs/get-started/installation">Install Zova</Link>
            </div>
            <p className={styles.releaseNote}>Embedded · offline-first · Rust, Python, Go, C, and Zig</p>
          </div>
          <div className={styles.logoFrame}><img src="img/zova-logo.png" alt="Crossed sage and seafoam feathers, the Zova logo" /></div>
        </div>
      </section>
      <section className={styles.features} aria-label="Zova capabilities">
        {features.map(([title, body], index) => <article key={title}><span className={styles.featureNumber}>0{index + 1}</span><h2>{title}</h2><p>{body}</p></article>)}
      </section>
      <section className={styles.path}>
        <div><span>01</span><h2>Install</h2><p>Choose the binding that matches your application and platform.</p></div>
        <div><span>02</span><h2>Model</h2><p>Keep metadata relational; add specialized storage only where it helps.</p></div>
        <div><span>03</span><h2>Operate</h2><p>Back up, diagnose, compact, and salvage with explicit local workflows.</p></div>
      </section>
      <section className={styles.install}><div><span>Rust</span><code>cargo add zova</code></div><div><span>Python</span><code>uv add zova</code></div><div><span>Go</span><code>go get github.com/atasesli/zova/bindings/go@v0.24.0</code></div></section>
    </main>
  </Layout>;
}
