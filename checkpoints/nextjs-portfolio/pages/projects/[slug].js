import Head from 'next/head';
import Image from 'next/image';
import Link from 'next/link';
import projects from '@/data/projects';
import styles from '@/styles/ProjectDetails.module.css';

// One page per project -> "/projects/movie-app", "/projects/slack-bot", ...
// The [slug] in the file name is a dynamic route segment
export default function ProjectDetails({ project }) {
  return (
    <>
      <Head>
        <title>{`${project.title} | Chimaroke Amadi`}</title>
      </Head>

      <Link href="/projects" className={styles.back}>← Back to projects</Link>

      <article className={styles.article}>
        <h1>{project.title}</h1>
        <Image
          src={project.image}
          alt={`${project.title} preview`}
          width={800}
          height={450}
          className={styles.image}
          priority
        />
        <p className={styles.description}>{project.description}</p>

        <h2>Built with</h2>
        <ul className={styles.tags}>
          {project.tech.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      </article>
    </>
  );
}

// Runs on the server: finds the project from the URL, or shows the 404 page
export async function getServerSideProps({ params }) {
  const project = projects.find((p) => p.slug === params.slug);

  if (!project) {
    return { notFound: true };
  }

  return { props: { project } };
}
