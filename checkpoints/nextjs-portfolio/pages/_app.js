import '@/styles/globals.css';
import Layout from '@/components/Layout';

// _app wraps every page, so the Layout (navbar + footer) is added here once
export default function App({ Component, pageProps }) {
  return (
    <Layout>
      <Component {...pageProps} />
    </Layout>
  );
}
