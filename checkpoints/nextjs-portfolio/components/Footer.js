import styles from '@/styles/Footer.module.css';

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <p>© {new Date().getFullYear()} Chimaroke Amadi · Built with Next.js</p>
    </footer>
  );
}
