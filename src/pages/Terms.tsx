import type { ReactNode } from 'react'
import { Link } from 'react-router'

export const CONTACT_EMAIL = 'guardeded@gmail.com'

const Contact = () => (
  <a href={`mailto:${CONTACT_EMAIL}`} className="text-white underline hover:text-accent">
    {CONTACT_EMAIL}
  </a>
)

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold text-white">{title}</h2>
      {children}
    </section>
  )
}

function List({ children }: { children: ReactNode }) {
  return <ul className="list-disc space-y-1 pl-5">{children}</ul>
}

/** Readable signed in or out, so the sign-up forms can link to it. */
export function Terms() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-12 text-zinc-300">
      <Link to="/" className="text-sm text-zinc-400 hover:text-white hover:underline">
        ← Back to Music
      </Link>

      <h1 className="mt-6 mb-2 text-3xl font-black tracking-tight text-white">Terms and privacy</h1>
      <p className="mb-8 text-sm text-zinc-500">Last updated 11 November 2026</p>

      <div className="space-y-8">
        <Section title="About">
          <p>
            Music is a small personal hobby project hosted in the United Kingdom, for streaming AI-generated and
            royalty-free music. It's free and provided as is. By creating an account or joining as a guest, you agree
            to these terms. It shares its accounts with the other apps on this server.
          </p>
          <p>
            Contact, reports and complaints: <Contact />
          </p>
        </Section>

        <Section title="Who can use it">
          <p>
            You must be <strong>18 or over</strong>.
          </p>
        </Section>

        <Section title="The music">
          <List>
            <li>Tracks marked AI were made with AI tools. Each track is published by the creator named on it.</li>
            <li>
              Creators must own, or have the rights to share, everything they publish. Music that infringes someone
              else's copyright is removed once we're aware of it: email <Contact /> with the track and your claim.
            </li>
            <li>The music is for streaming here. Don't copy it elsewhere unless its creator allows that.</li>
            <li>No content that's illegal in the UK, including in titles, lyrics and cover art.</li>
          </List>
        </Section>

        <Section title="Your data">
          <List>
            <li>
              <strong>Registered accounts:</strong> display name, email address and a hashed password. The password
              itself is never stored.
            </li>
            <li>
              <strong>Guests:</strong> display name only.
            </li>
            <li>
              <strong>Everyone:</strong> your playlists, liked songs and your last 200 plays (for "Recently played").
              Playlists are private to you.
            </li>
            <li>
              <strong>Where:</strong> a private server in the UK. Traffic passes through Cloudflare, which sees your
              IP address.
            </li>
            <li>
              <strong>Cookies:</strong> only the ones needed to keep you signed in, plus your volume setting stored in
              your browser. No tracking or advertising.
            </li>
            <li>Your data is never sold or shared, except where the law requires it.</li>
          </List>
        </Section>

        <Section title="When data is deleted">
          <List>
            <li>Guest accounts are deleted when you log out or your session expires, with their playlists and likes.</li>
            <li>To delete a registered account, email us from the address you signed up with.</li>
            <li>Database backups may hold deleted data until they're replaced.</li>
          </List>
          <p>
            You can ask for a copy of your data, a correction, or for it to be erased, at <Contact />. If you're
            unhappy with how your data is handled, you can complain to the{' '}
            <a href="https://ico.org.uk" className="text-white underline hover:text-accent">
              Information Commissioner's Office
            </a>
            .
          </p>
        </Section>

        <Section title="No guarantees">
          <p>
            The service may change, go offline or close at any time, and data may be lost. Don't rely on it for
            anything important.
          </p>
        </Section>
      </div>
    </main>
  )
}
