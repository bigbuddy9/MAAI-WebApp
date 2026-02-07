'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body style={{
        padding: 40,
        backgroundColor: '#0A0A0A',
        color: '#fff',
        minHeight: '100vh',
        fontFamily: 'monospace',
        margin: 0,
      }}>
        <h1 style={{ color: '#ff4444', marginBottom: 20 }}>Critical Error</h1>
        <p style={{ color: '#888', marginBottom: 20 }}>
          The application encountered a critical error.
        </p>
        <details style={{ marginTop: 20 }}>
          <summary style={{ cursor: 'pointer', color: '#00FFFF' }}>Technical Details</summary>
          <pre style={{
            marginTop: 10,
            padding: 15,
            backgroundColor: '#1a1a1a',
            borderRadius: 8,
            overflow: 'auto',
            fontSize: 12,
            color: '#ff6b6b',
          }}>
            {error.message}
            {'\n\n'}
            {error.stack}
          </pre>
        </details>
        <button
          onClick={() => reset()}
          style={{
            marginTop: 20,
            padding: '12px 24px',
            backgroundColor: '#00FFFF',
            color: '#000',
            border: 'none',
            borderRadius: 8,
            cursor: 'pointer',
            fontWeight: 600,
          }}
        >
          Try Again
        </button>
      </body>
    </html>
  );
}
