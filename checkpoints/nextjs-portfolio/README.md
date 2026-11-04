# My Next.js Portfolio

This is my portfolio website, built with Next.js. It has four main pages (Home, About, Projects and Contact) that show who I am, my skills, some projects I've built during the GoMyCode course, and a way to get in touch with me.

## How I set it up

I created the project with `create-next-app` and chose JavaScript and the Pages Router, since the checkpoint asks for a `pages`, `components` and `styles` folder. The `pages` folder holds one file per page, `components` holds the pieces that are reused on several pages (the navbar, the footer, the layout and the project card), and `styles` holds the CSS. I also added a `data` folder with a `projects.js` file, so all the project information is in one place instead of being copied into every page.

## Styling and images

For styling I used CSS Modules. Each component or page has its own `.module.css` file, and Next.js makes the class names unique, so a class called `.card` in one file can't clash with a `.card` somewhere else. The colours and a few shared classes like the buttons and the project grid are in `globals.css`. The layout also adapts to small screens, so on a phone the profile picture moves above the text and the contact form goes under the contact details.

The images are in `public/images` and are displayed with the Next.js `Image` component. There's a profile picture on the Home and About pages, and every project has its own preview image. The profile picture is just a placeholder with my initials for now. To use a real photo, I can put it in `public/images` and change the `src` in `pages/index.js` and `pages/about.js`.

## Page-based routing

Next.js creates the routes from the file names in the `pages` folder, so I didn't need to install a router:

- `pages/index.js` is the home page at `/`
- `pages/about.js` is `/about`
- `pages/projects/index.js` is `/projects`
- `pages/projects/[slug].js` is a dynamic route, so `/projects/movie-app`, `/projects/slack-bot` and so on all use this one file
- `pages/contact.js` is `/contact`
- `pages/404.js` is shown for any page that doesn't exist

The navbar uses the Next.js `Link` component to move between pages without reloading, and it highlights the page you're on.

## Server-side rendering

The Home page, the Projects page and each project's details page use `getServerSideProps`. This function runs on the server every time someone visits the page, gets the data, and Next.js sends back HTML that already has the content in it. To show that it's really happening, the bottom of the Projects page displays the time the page was rendered on the server, and it changes every time you refresh. On the details page, if the project in the URL doesn't exist, `getServerSideProps` returns `notFound` and you get the 404 page.

The contact form sends the message to an API route, `pages/api/contact.js`, which also runs on the server. It checks that every field is filled in and that the email looks valid, then prints the message in the terminal. It doesn't send a real email yet, but that's where I'd add a service like Resend or Nodemailer.

## How to run it

In this folder, install the packages and start the development server:

```bash
npm install
npm run dev
```

Then open http://localhost:3000. To try the production version, run `npm run build` and then `npm start`.

## Deploying

The easiest place to host a Next.js app is Vercel, which is made by the same team. I push the project to a GitHub repository, then sign in at https://vercel.com with GitHub, click **Add New → Project**, pick the repository and click **Deploy**. Vercel detects Next.js by itself, so no extra settings are needed, and it gives the site a public link. Every time I push new changes to GitHub, it redeploys automatically. Netlify works the same way if I'd rather use that.

## Things to update

Before sharing it, I need to replace the placeholder email, GitHub and LinkedIn links in `pages/contact.js` with my real ones, and swap in a real profile photo.
