import Link from 'next/link';

export default function ProjectsPage() {
  // Placeholder project list - will be fetched from API
  const projects = [
    { id: '550e8400-e29b-41d4-a716-446655440000', name: 'Demo Project' },
  ];

  return (
    <main style={{ padding: '2rem' }}>
      <h1>Projects</h1>
      <p>Select a project to view details.</p>
      <ul style={{ marginTop: '1rem' }}>
        {projects.map((project) => (
          <li key={project.id}>
            <Link href={`/projects/${project.id}/proposal`}>{project.name}</Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
