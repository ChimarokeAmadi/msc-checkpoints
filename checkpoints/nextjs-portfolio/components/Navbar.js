import Link from 'next/link';
import { useRouter } from 'next/router';
import styles from '@/styles/Navbar.module.css';

// Each link points to a file in the pages folder (file-based routing)
const links = [
  { href: '/', label: 'Home' },
  { href: '/about', label: 'About' },
  { href: '/projects', label: 'Projects' },
  { href: '/contact', label: 'Contact' },
];

export default function Navbar() {
  const router = useRouter();

  // A link is "active" if we're on that page (or inside it, like /projects/movie-app)
  const isActive = (href) =>
    href === '/' ? router.pathname === '/' : router.pathname.startsWith(href);

  return (
    <header className={styles.header}>
      <nav className={styles.nav}>
        <Link href="/" className={styles.logo}>
          Chimaroke<span>.dev</span>
        </Link>
        <ul className={styles.links}>
          {links.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className={isActive(link.href) ? styles.active : undefined}
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
