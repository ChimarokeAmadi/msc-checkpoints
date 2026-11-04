import Head from 'next/head';
import Image from 'next/image';
import styles from '@/styles/About.module.css';

// About page -> "/about"
const skills = {
  Frontend: ['HTML', 'CSS', 'JavaScript (ES6+)', 'React', 'Redux Toolkit', 'Next.js', 'Bootstrap', 'Tailwind CSS'],
  Backend: ['Node.js', 'SQL', 'REST APIs'],
  Tools: ['Git & GitHub', 'TypeScript', 'VS Code', 'npm'],
  'Computer science': ['Data structures', 'Graph algorithms', 'Sorting & searching', 'Recursion'],
};

export default function About() {
  return (
    <>
      <Head>
        <title>About | Chimaroke Amadi</title>
      </Head>

      <h1>About me</h1>

      <section className={styles.intro}>
        <Image
          src="/images/profile.svg"
          alt="Chimaroke Amadi"
          width={180}
          height={180}
          className={styles.photo}
        />
        <div>
          <p>
            I&apos;m Chimaroke, a web developer learning full-stack development at
            GoMyCode. I started with HTML and CSS, then moved on to JavaScript, React,
            Node.js and databases.
          </p>
          <p>
            I like building things I can actually click on, and I enjoy the
            problem-solving side too, from working out a recursive function to finding
            the shortest path through a graph.
          </p>
        </div>
      </section>

      <h2>Skills</h2>
      <div className={styles.skills}>
        {Object.entries(skills).map(([group, items]) => (
          <div key={group} className={styles.group}>
            <h3>{group}</h3>
            <ul>
              {items.map((skill) => (
                <li key={skill}>{skill}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </>
  );
}
