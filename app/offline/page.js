export default function OfflinePage() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'column',
      gap: '16px',
      padding: '20px',
      background: 'var(--bg-page)',
      textAlign: 'center',
    }}>
      <div style={{ fontSize: '3rem' }}>📡</div>
      <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>
        Pas de connexion
      </h1>
      <p style={{ fontSize: '0.9375rem', color: 'var(--text-secondary)', maxWidth: '300px' }}>
        IziSolo a besoin d'internet pour fonctionner. Vérifie ta connexion et réessaie.
      </p>
      <button
        onClick={() => window.location.reload()}
        className="izi-btn izi-btn-primary"
      >
        Réessayer
      </button>
    </div>
  );
}
