import Link from 'next/link';

interface Props {
  params: { id: string };
}

export default function SettingsPage({ params }: Props) {
  return (
    <main style={{ padding: '2rem' }}>
      <nav style={{ marginBottom: '1rem' }}>
        <Link href="/projects">&larr; Back to Projects</Link>
      </nav>
      <h1>Project Settings</h1>
      <p>Project ID: {params.id}</p>

      <section style={{ marginTop: '2rem' }}>
        <h2>Execution Mode</h2>
        <p style={{ color: '#666' }}>
          Toggle dry-run mode. When enabled, all actions are logged but not executed.
        </p>
        <label style={{ display: 'block', marginTop: '0.5rem' }}>
          <input type="checkbox" disabled /> Dry Run Mode
        </label>
      </section>

      <section style={{ marginTop: '2rem' }}>
        <h2>Actions</h2>
        <p style={{ color: '#666' }}>Enable or disable specific actions for this project.</p>
        <label style={{ display: 'block', marginTop: '0.5rem' }}>
          <input type="checkbox" disabled /> Move Pipeline Stage
        </label>
        <label style={{ display: 'block', marginTop: '0.5rem' }}>
          <input type="checkbox" disabled /> Trigger Workflows
        </label>
      </section>

      <section style={{ marginTop: '2rem' }}>
        <h2>Allowlisted Stages</h2>
        <p style={{ color: '#666' }}>
          Only these pipeline stages can be targeted by the move_stage action.
        </p>
        <ul>
          <li style={{ color: '#999' }}>No stages synced yet.</li>
        </ul>
      </section>

      <section style={{ marginTop: '2rem' }}>
        <h2>Allowlisted Workflows</h2>
        <p style={{ color: '#666' }}>
          Only these workflows can be triggered by the trigger_workflow action.
        </p>
        <ul>
          <li style={{ color: '#999' }}>No workflows synced yet.</li>
        </ul>
      </section>

      <section style={{ marginTop: '2rem' }}>
        <h2>Sync</h2>
        <button disabled style={{ marginRight: '0.5rem' }}>
          Sync Pipelines
        </button>
        <button disabled>
          Sync Workflows
        </button>
        <p style={{ color: '#666', marginTop: '0.5rem' }}>
          Fetches latest pipeline stages and workflows from GHL.
        </p>
      </section>

      <nav style={{ marginTop: '2rem' }}>
        <ul>
          <li><Link href={`/projects/${params.id}/proposal`}>Proposal</Link></li>
          <li><Link href={`/projects/${params.id}/assumptions`}>Assumptions</Link></li>
          <li><Link href={`/projects/${params.id}/requirements`}>Requirements</Link></li>
          <li><Link href={`/projects/${params.id}/tasks`}>Tasks</Link></li>
          <li><Link href={`/projects/${params.id}/settings`}>Settings</Link></li>
        </ul>
      </nav>
    </main>
  );
}
