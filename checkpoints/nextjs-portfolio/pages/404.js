import Head from 'next/head';
import Link from 'next/link';

// Custom "page not found" page
export default function NotFound() {
  return (
    <>
      <Head>
        <title>Page not found | Chimaroke Amadi</title>
      </Head>
      <div style={{ textAlign: 'center', padding: '60px 0' }}>
        <h1>404</h1>
        <p>Sorry, this page doesn&apos;t exist.</p>
        <Link href="/" className="button">Go back home</Link>
      </div>
    </>
  );
}
