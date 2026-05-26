import Link from 'next/link';

export const metadata = {
  title: 'Désinscription confirmée | IziSolo',
  description: 'Tu ne recevras plus de messages de notre part.',
};

export default function UnsubscribeConfirmPage() {
  return (
    <div className="legal-content" style={{ textAlign: 'center', padding: '60px 24px' }}>
      <div style={{ marginBottom: 40 }}>
        <Link
          href="/"
          style={{
            fontSize: '1.5rem',
            fontWeight: 700,
            color: '#d4a0a0',
            textDecoration: 'none',
          }}
        >
          IziSolo
        </Link>
      </div>

      <div style={{
        width: 64, height: 64, borderRadius: '50%',
        background: '#e8f5e9', display: 'flex', alignItems: 'center',
        justifyContent: 'center', margin: '0 auto 24px', fontSize: '2rem',
        color: '#4caf50',
      }}>
        ✓
      </div>

      <h1 style={{ fontSize: '1.5rem', marginBottom: 12 }}>
        C'est noté !
      </h1>

      <p style={{
        color: '#666', lineHeight: 1.7,
        maxWidth: 440, margin: '0 auto 8px',
      }}>
        Tu ne recevras plus de messages de notre part.
      </p>

      <p style={{
        color: '#888', lineHeight: 1.7, fontSize: '0.9rem',
        maxWidth: 440, margin: '0 auto',
      }}>
        Si c'est une erreur, tu peux nous écrire
        à <a href="mailto:bonjour@izisolo.fr" style={{ color: '#d4a0a0' }}>bonjour@izisolo.fr</a>.
      </p>

      <div style={{ marginTop: 32 }}>
        <Link
          href="https://www.izisolo.fr"
          style={{
            display: 'inline-block', padding: '10px 24px',
            background: '#d4a0a0', color: 'white', borderRadius: 8,
            textDecoration: 'none', fontWeight: 600, fontSize: '0.9rem',
          }}
        >
          Retour sur izisolo.fr
        </Link>
      </div>

      <div style={{
        textAlign: 'center', marginTop: 48, paddingTop: 24,
        borderTop: '1px solid #eee', fontSize: '0.8rem', color: '#aaa',
      }}>
        <p>
          Atelier Mélusine — SASU au capital de 1 000 € — SIREN 889 060 901<br />
          146 Rue Elsa Triolet, 38260 La Côte-Saint-André
        </p>
      </div>
    </div>
  );
}
