import Head from 'next/head';
import Navbar from './Navbar';
import Footer from './Footer';
import styles from '@/styles/Layout.module.css';

// Wraps every page (see pages/_app.js) so the navbar and footer show everywhere
export default function Layout({ children }) {
  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div className={styles.wrapper}>
        <Navbar />
        <main className={styles.main}>{children}</main>
        <Footer />
      </div>
    </>
  );
}
