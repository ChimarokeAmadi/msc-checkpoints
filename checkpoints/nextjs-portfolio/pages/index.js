import Head from 'next/head';
import Image from 'next/image';
import Link from 'next/link';
import ProjectCard from '@/components/ProjectCard';
import projects from '@/data/projects';
import styles from '@/styles/Home.module.css';

// Home page -> "/"
export default function Home({ featured }) {
  return (
    <>
      <Head>
        <title>Chimaroke Amadi | Portfolio</title>
        <meta name="description" content="Portfolio of Chimaroke Amadi, web developer" />
      </Head>

      <section className={styles.hero}>
        <div className={styles.text}>
          <p className={styles.hello}>Hi, I&apos;m</p>
          <h1>Chimaroke Amadi</h1>
          <p className={styles.role}>Full-stack web developer in training</p>
          <p>
            I build web apps with JavaScript, React and Node.js. I&apos;m currently
            learning at GoMyCode, and this site shows some of the things I&apos;ve made.
          </p>
          <div className={styles.buttons}>
            <Link href="/projects" className="button">See my projects</Link>
            <Link href="/contact" className="button outline">Contact me</Link>
          </div>
        </div>
        <Image
          src="/images/profile.svg"
          alt="Chimaroke Amadi"
          width={260}
          height={260}
          className={styles.avatar}
          priority
        />
      </section>

      <section>
        <h2>Featured projects</h2>
        <div className="grid">
          {featured.map((project) => (
            <ProjectCard key={project.slug} project={project} />
          ))}
        </div>
      </section>
    </>
  );
}

// Server-side rendering: runs on the server for every request,
// and the page is sent to the browser already filled with the data
export async function getServerSideProps() {
  return {
    props: { featured: projects.slice(0, 3) },
  };
}
