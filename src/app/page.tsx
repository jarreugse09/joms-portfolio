import Image from "next/image";
import { experience, person, projects, stack, type Experience } from "@/content/site";
import { getContributions } from "@/lib/github";
import { getAlbums } from "@/lib/albums";
import { EyeAside, EyeHero } from "@/components/AsciiEye";
import { ProjectsView } from "@/components/ProjectsView";
import { Header, Visitors } from "@/components/Chrome";
import GithubActivity from "@/components/GithubActivity";
import { CopyEmail, LocalTime, SmoothScroll } from "@/components/Interactive";
import TechIcon, { IconRow } from "@/components/TechIcon";
import Walkman from "@/components/Walkman";
import { Arrow } from "@/components/Icons";

const GH_USER = "jarreugse09";

function Hatch() {
  return <div className="hatch" aria-hidden="true"><div className="frame" /></div>;
}

function Row({ children, id, className = "", label }: { children: React.ReactNode; id?: string; className?: string; label?: string }) {
  return (
    <section id={id} className="row" aria-label={label}>
      <div className={`frame ${className}`}>{children}</div>
    </section>
  );
}

const CHIP_ICON = {
  code: <path d="M5.5 4.5L2 8l3.5 3.5M10.5 4.5L14 8l-3.5 3.5" />,
  web: <><rect x="1.75" y="2.75" width="12.5" height="8.5" rx="1.5" /><path d="M5.5 13.75h5M8 11.25v2.5" /></>,
  app: <><rect x="4.25" y="1.75" width="7.5" height="12.5" rx="1.75" /><path d="M7 11.75h2" /></>,
  ai: <path d="M8 1.5l1.4 4.1 4.1 1.4-4.1 1.4L8 12.5 6.6 8.4 2.5 7l4.1-1.4L8 1.5zM13 11l.6 1.4 1.4.6-1.4.6L13 15l-.6-1.4-1.4-.6 1.4-.6L13 11z" />,
  rocket: <><path d="M9.5 2.5c2.2-.6 3.6-.6 4-.5.1.4.1 1.8-.5 4L9 10.5 5.5 7l4-4.5z" /><path d="M5.5 7L3 7.5 1.5 9.5l3 .5M9 10.5L8.5 13l-2 1.5-.5-3M3.5 12.5c-.5.5-1 2-1 2s1.5-.5 2-1" /></>,
  pencil: <path d="M10.5 2.5l3 3L5.5 13.5 2 14l.5-3.5 8-8zM9 4l3 3" />,
} as const;

function Chip({ icon, children }: { icon: keyof typeof CHIP_ICON; children: React.ReactNode }) {
  return (
    <span className="chip">
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{CHIP_ICON[icon]}</svg>
      {children}
    </span>
  );
}

const SOCIAL_ICON: Record<string, string> = { GitHub: "GitHub", LinkedIn: "LinkedIn", Facebook: "Facebook", Instagram: "Instagram" };
// hover color per network (solid brand colors, no gradients)
const SOCIAL_HUE: Record<string, string> = { GitHub: "var(--ink)", LinkedIn: "#0a66c2", Facebook: "#0866ff", Instagram: "#e4405f", Email: "var(--red)" };

function duration(start: string | null, end: string | null) {
  if (!start || !end) return null;
  const [sm, sy] = start.split(".").map(Number);
  const now = new Date();
  const [em, ey] = end === "Present" ? [now.getMonth() + 1, now.getFullYear()] : end.split(".").map(Number);
  const months = (ey - sy) * 12 + (em - sm) + 1;
  if (!(months > 0)) return null;
  const y = Math.floor(months / 12), m = months % 12;
  return [y && `${y}y`, m && `${m}m`].filter(Boolean).join(" ");
}

function XpEntry({ x }: { x: Experience }) {
  const period = x.period ?? (x.start || x.end ? [x.start, x.end].filter(Boolean).join(" – ") : null);
  const dur = x.length ?? duration(x.start, x.end);
  return (
    <article className="xp">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <h3 className="flex items-center gap-2.5 text-[16px] font-medium">
          {x.href ? <a className="link" href={x.href} target="_blank" rel="noopener noreferrer">{x.org}</a> : x.org}
          {x.placeholder && <span className="todo">To fill in</span>}
        </h3>
        {x.location && <span className="text-[13px] text-faint">{x.location}</span>}
      </div>
      <div className="mt-3 flex items-center gap-2.5">
        <span className="xp-role-ic" aria-hidden="true">
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5.5 4.5L2 8l3.5 3.5M10.5 4.5L14 8l-3.5 3.5" />
          </svg>
        </span>
        <span className="text-[14px] font-medium">{x.role}</span>
      </div>
      <div className="xp-meta mt-1.5 pl-[32px]">
        <span>{x.kind}</span>
        {period && <><span className="sep" /><span className="mono text-[12px]">{period}</span></>}
        {dur && <><span className="sep" /><span>{dur}</span></>}
      </div>
      <div className="pl-[32px]">
        {x.summary && <p className="mt-3 text-[14px] text-muted">{x.summary}</p>}
        <ul>{x.points.map((p) => <li key={p}>{p}</li>)}</ul>
        <IconRow items={x.stack} />
      </div>
    </article>
  );
}

export default async function Home() {
  const [years, albums] = await Promise.all([getContributions(), getAlbums()]);
  const thisYear = years[0];
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: person.fullName,
    jobTitle: person.role,
    email: `mailto:${person.email}`,
    address: { "@type": "PostalAddress", addressLocality: "Manila", addressCountry: "PH" },
    alumniOf: "Technological University of the Philippines, Manila",
    sameAs: person.socials.map((s) => s.href),
  };

  return (
    <div id="top">
      <a href="#main" className="skip">Skip to content</a>
      <Header />
      <SmoothScroll />

      <main id="main">
        {/* Fig. 1 — the eye */}
        <EyeHero />

        {/* profile */}
        <Row className="profile" label="Profile">
          <div className="portrait">
            <Image src={person.portrait} alt="Portrait of Jomarie Esguerra" width={320} height={320} priority sizes="168px" unoptimized />
          </div>
          <div className="flex flex-col">
            <div className="name-area relative flex flex-1 items-end px-4 pb-3 pt-6">
              <Image className="sprite sprite-luffy" src="/images/sprites/luffy.gif" alt="" width={231} height={232} unoptimized priority aria-hidden="true" />
              <h1 className="name">
                {person.name}
                <span className="badge" role="img" aria-label="Available for work" title="Available for work">
                  <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true"><path d="M2 5.2l2 2L8 3" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </span>
              </h1>
            </div>
            <div className="role-line flex items-center justify-between gap-3 border-t border-line px-4 py-2.5">
              <p className="font-mono text-[12.5px] text-muted">
                {person.role} <span className="text-faint">·</span> {person.location}
              </p>
              <Visitors />
            </div>
            <p className="edu-line border-t border-line px-4 py-2.5">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M1.5 6L8 3l6.5 3L8 9 1.5 6zM4 7.5V11c1.2 1 2.6 1.5 4 1.5s2.8-.5 4-1.5V7.5" /></svg>
              <span>BS Computer Science, <span className="text-ink">Magna Cum Laude</span> <span className="text-faint">·</span> TUP Manila, 2026</span>
            </p>
          </div>
        </Row>

        <Hatch />

        <Row label="Social links">
          <ul className="soc-grid">
            {[...person.socials, { label: "Email", href: `mailto:${person.email}`, handle: "say hello" }].map((s) => (
              <li key={s.label}>
                <a
                  className="soc"
                  href={s.href}
                  {...(s.label === "Email" ? {} : { target: "_blank", rel: "noopener noreferrer" })}
                  style={{ "--hue": SOCIAL_HUE[s.label] } as React.CSSProperties}
                >
                  <span className="soc-ic">
                    {s.label === "Email" ? (
                      <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true"><rect x="1.75" y="3.25" width="12.5" height="9.5" rx="1.5" /><path d="M2.5 4.5L8 8.5l5.5-4" /></svg>
                    ) : (
                      <TechIcon name={SOCIAL_ICON[s.label]} size={18} mono />
                    )}
                  </span>
                  <span className="soc-txt">
                    <span className="soc-name">{s.label}</span>
                    <span className="soc-handle">{s.label === "Email" ? s.handle : `@${s.handle}`}</span>
                  </span>
                  <span className="soc-arrow" aria-hidden="true"><Arrow /></span>
                </a>
              </li>
            ))}
          </ul>
        </Row>

        {/* about */}
        <Row id="about" label="About">
          <div className="bio px-4 pb-8 pt-7">
            <p>
              I’m a <Chip icon="code">full-stack</Chip> developer. I build <Chip icon="web">websites</Chip> &amp; <Chip icon="app">web apps</Chip>,
              and these days I’m focused on <Chip icon="ai">AI-powered tools</Chip>.
            </p>
            <p>
              Right now I’m building <Chip icon="rocket">new things</Chip> every chance I get. I love turning <Chip icon="pencil">intangible ideas</Chip> into
              things people actually use. <a className="link strong" href="#contact">Let’s talk</a>.
            </p>
          </div>
        </Row>

        <Row className="stats" label="Numbers">
          <div className="stat"><div className="stat-n">{projects.length}</div><div className="stat-l mono-label">projects shipped</div></div>
          <div className="stat"><div className="stat-n">{thisYear ? thisYear.total.toLocaleString() : "—"}</div><div className="stat-l mono-label">contributions {thisYear?.year ?? ""}</div></div>
        </Row>

        <Hatch />

        <Row label="GitHub activity">
          <div className="px-4 py-5">
            <GithubActivity years={years} user={GH_USER} />
          </div>
        </Row>

        <Hatch />

        {/* experience */}
        <Row id="experience" label="Experience">
          <h2 className="h2 border-b border-line px-4 py-4">Experience</h2>
          {experience.map((x) => <XpEntry key={x.org} x={x} />)}
        </Row>

        <Hatch />

        {/* stack */}
        <Row id="stack" label="Tech stack">
          <h2 className="h2 border-b border-line px-4 py-4">Stack</h2>
          {stack.map((g) => (
            <div key={g.group}>
              <div className="stack-group mono-label">{g.group}</div>
              <ul className="stack-grid">
                {g.items.map((i) => (
                  <li key={i} className="tile">
                    <TechIcon name={i} size={22} />
                    <span>{i}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </Row>

        <Hatch />

        {/* projects */}
        <Row id="projects" label="Projects">
          <ProjectsView link={<a className="mono-label hover:text-ink" href={`https://github.com/${GH_USER}`} target="_blank" rel="noopener noreferrer">@{GH_USER} ↗</a>}>
            {projects.map((p, i) => (
              <article key={p.slug} className="proj">
                <a href={p.live ?? p.repo} target="_blank" rel="noopener noreferrer" className="shot" aria-label={`Open ${p.name}`}>
                  <Image src={p.image} alt={`Screenshot of ${p.name}`} width={p.width} height={p.height} sizes="(max-width: 640px) 100vw, 368px" loading={i < 2 ? "eager" : "lazy"} />
                </a>
                <div className="proj-head">
                  <h3 className="proj-title">{p.name}</h3>
                  <span className="proj-links">
                    {p.live && <a href={p.live} target="_blank" rel="noopener noreferrer" aria-label={`${p.name} live site`}>Live <Arrow /></a>}
                    {p.repo && (
                      <a href={p.repo} target="_blank" rel="noopener noreferrer" aria-label={`${p.name} source on GitHub`}>
                        <TechIcon name="GitHub" size={14} mono />
                      </a>
                    )}
                  </span>
                </div>
                <p>{p.description}</p>
                <IconRow items={p.stack} />
              </article>
            ))}
          </ProjectsView>
        </Row>

        <Hatch />

        {/* contact */}
        <Row id="contact" label="Contact">
          <div className="px-4 pb-9 pt-7">
            <h2 className="h2">Let’s work together.</h2>
            <p className="mt-3 max-w-[56ch] text-muted">
              I’m open to full-stack and AI roles, and happy to talk about freelance projects. Email is the fastest way to reach me.
            </p>
            <a className="big-mail mt-6 inline-block" href={`mailto:${person.email}`}>{person.email}</a>
            <div className="mt-5 flex flex-wrap gap-2">
              <a className="btn btn-ink" href={`mailto:${person.email}`}>Write an email</a>
              <CopyEmail email={person.email} />
            </div>
          </div>
        </Row>

        <Hatch />

        <section className="row" aria-hidden="true">
          <div className="frame sprite-stage">
            <Image className="sprite sprite-duel" src="/images/sprites/sanji-vs-zoro.gif" alt="" width={150} height={150} unoptimized loading="lazy" />
          </div>
        </section>
      </main>

      <footer className="row">
        <div className="frame px-4 pb-24 pt-8 lg:pb-10">
          <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-start">
            <div>
              <p className="mono-label mb-3">Connect</p>
              <ul className="flex gap-3.5">
                {person.socials.map((s) => (
                  <li key={s.label}>
                    <a className="tip text-ink/80 hover:text-ink" data-tip={s.label} href={s.href} target="_blank" rel="noopener noreferrer" aria-label={s.label}>
                      <TechIcon name={SOCIAL_ICON[s.label]} size={17} mono />
                    </a>
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex flex-col gap-1 font-mono text-[13px] sm:items-end">
              <p className="text-muted">Manila, PH · <LocalTime tz={person.timezone} /></p>
            </div>
          </div>
          <div className="mt-10 flex flex-wrap items-center justify-between gap-4">
            <p className="font-mono text-[12px] text-faint">Designed &amp; developed by <span className="text-ink">Jomarie</span> · ©2026</p>
            <a className="pill" href="#top">Back to top ↑</a>
          </div>
        </div>
      </footer>

      <EyeAside />
      <Walkman albums={albums} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </div>
  );
}
