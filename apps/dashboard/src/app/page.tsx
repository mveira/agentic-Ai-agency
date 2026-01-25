import Link from 'next/link';

export default function Home() {
  return (
    <main style={{ padding: '2rem' }}>
      <h1>Agency Dashboard</h1>
      <p>Agency AI Operating System - Week 1 Scaffold</p>
      <nav style={{ marginTop: '2rem' }}>
        <ul>
          <li>
            <Link href="/projects">Projects</Link>
          </li>
        </ul>
      </nav>
    </main>
  );
}
