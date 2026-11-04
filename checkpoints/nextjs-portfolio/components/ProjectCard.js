import Image from 'next/image';
import Link from 'next/link';
import styles from '@/styles/ProjectCard.module.css';

// One card in the projects grid. Clicking it opens /projects/<slug>
export default function ProjectCard({ project }) {
  return (
    <Link href={`/projects/${project.slug}`} className={styles.card}>
      <Image
        src={project.image}
        alt={`${project.title} preview`}
        width={800}
        height={450}
        className={styles.image}
      />
      <div className={styles.body}>
        <h3>{project.title}</h3>
        <p>{project.summary}</p>
        <ul className={styles.tags}>
          {project.tech.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      </div>
    </Link>
  );
}
