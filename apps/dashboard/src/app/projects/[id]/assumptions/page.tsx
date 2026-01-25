import Link from 'next/link';

interface Props {
  params: { id: string };
}

export default function AssumptionsPage({ params }: Props) {
  return (
    <main style={{ padding: '2rem' }}>
      <nav style={{ marginBottom: '1rem' }}>
        <Link href="/projects">← Back to Projects</Link>
      </nav>
      <h1>Assumptions</h1>
      <p>Project ID: {params.id}</p>
      <p style={{ color: '#666', marginTop: '1rem' }}>
        Project assumptions and decisions will be tracked here.
      </p>
      <nav style={{ marginTop: '2rem' }}>
        <ul>
          <li><Link href={`/projects/${params.id}/proposal`}>Proposal</Link></li>
          <li><Link href={`/projects/${params.id}/assumptions`}>Assumptions</Link></li>
          <li><Link href={`/projects/${params.id}/requirements`}>Requirements</Link></li>
          <li><Link href={`/projects/${params.id}/tasks`}>Tasks</Link></li>
        </ul>
      </nav>
    </main>
  );
}
