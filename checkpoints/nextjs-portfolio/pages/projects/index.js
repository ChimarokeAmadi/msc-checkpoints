import Head from 'next/head';
import ProjectCard from '@/components/ProjectCard';
import projects from '@/data/projects';

// Projects page -> "/projects" (pages/projects/index.js)
export default function Projects({ projects, renderedAt }) {
  return (
    <>
      <Head>
        <title>Projects | Chimaroke Amadi</title>
      </Head>

      <h1>Projects</h1>
      <p>Some of the projects I&apos;ve built while learning. Click one to see more.</p>

      <div className="grid">
        {projects.map((project) => (
          <ProjectCard key={project.slug} project={project} />
        ))}
      </div>

      {/* Shows that the page was rendered on the server for this request */}
      <p className="muted small">Page rendered on the server at {renderedAt}</p>
    </>
  );
}

// Server-side rendering: Next.js runs this on the server on every request
// and passes the result to the page as props
export async function getServerSideProps() {
  return {
    props: {
      projects,
      renderedAt: new Date().toLocaleString('en-GB'),
    },
  };
}
