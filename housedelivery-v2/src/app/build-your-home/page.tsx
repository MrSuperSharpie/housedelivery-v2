import { ArrowUpRight, Plus } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { BuildHomeHero } from "@/components/build-home-hero";
import { HeadlineReveal } from "@/components/headline-reveal";
import { BuildHomeInquiryForm } from "@/components/build-home-inquiry-form";
import { SiteHeader } from "@/components/site-header";
import { DesignStudioImageNote } from "@/components/design-studio-image-note";
import { models } from "@/data/models";
import styles from "./landing.module.css";

const title = "Build Your Home with House Delivery";
const description = "Build your home in British Columbia with House Delivery. Considered design, coordinated housing systems and lasting value. Start a project conversation.";

export const metadata: Metadata = {
  title: { absolute: `${title} | British Columbia` },
  description,
  alternates: { canonical: "https://www.housedelivery.ca/build-your-home" },
  // Keep this acquisition page out of search until production release is approved.
  robots: process.env.VERCEL_ENV === "production" ? { index: true, follow: true } : { index: false, follow: false },
  openGraph: {
    title,
    description,
    url: "https://www.housedelivery.ca/build-your-home",
    type: "website",
    locale: "en_CA",
    images: [{ url: "/solace-1a.png", width: 1992, height: 1120, alt: "Solace architectural design by House Delivery" }],
  },
  twitter: { card: "summary_large_image", title, description, images: ["/solace-1a.png"] },
};

type HousingStory = {
  title: string;
  description: string;
  image: string;
  alt: string;
  href: string;
  link: string;
  studioHref?: string;
  studioLabel?: string;
};

function customHomeStory(slug: "cedarview" | "maplewood" | "salt-spring") {
  const model = models.find((home) => home.slug === slug);
  if (!model) throw new Error(`Featured home ${slug} is unavailable.`);
  const homeName = model.name.replace(/^The\s+/, "");
  const title = /(?:House|Duplex)$/.test(model.name) ? model.name : `${model.name} House`;
  return {
    title,
    description: model.summary,
    image: model.heroImage,
    alt: `${title} exterior architecture`,
    href: `/homes/${model.slug}`,
    link: `Explore ${title}`,
    studioHref: `/homes/${model.slug}#home-inclusions`,
    studioLabel: `Design My ${homeName}`,
  };
}

const customHomes = [
  customHomeStory("cedarview"),
  customHomeStory("maplewood"),
  customHomeStory("salt-spring"),
];

const solutions: HousingStory[] = [
  ...customHomes,
  { title: "Laneway Homes", description: "Make more of the land you already have. A compact home, thoughtfully planned for everyday life.", image: "/images/carriage-homes/The-Willow-Nook-1.jpg", alt: "The Willow Nook compact home with warm timber detailing", href: "/homes/laneway-carriage/willow-nook", link: "Explore The Willow Nook" },
  { title: "Carriage Homes", description: "A little independence. A place for family. A considered second residence with a character of its own.", image: "/images/carriage-homes/Heritage-Mews-1.jpg", alt: "The Heritage Mews exterior with an open front deck", href: "/homes/laneway-carriage/heritage-mews", link: "Explore The Heritage Mews" },
];

const steps = [
  { title: "Tell Us About Your Project", body: "Share your property location, goals and housing requirements." },
  { title: "Explore Your Options", body: "Review suitable architectural designs and construction systems. Explore Premium and Signature finishes in the Design Studio and create your personalized Look Book." },
  { title: "Develop Your Project Scope", body: "Discuss site conditions, design requirements, construction responsibilities and delivery considerations." },
  { title: "Move Toward Construction", body: "Coordinate the appropriate manufacturing, delivery and Canadian construction arrangements for the project." },
];

const questions = [
  { question: "Do I need completed architectural plans?", answer: "No. You can begin with a property, an idea or a preferred home from our collection. We’ll discuss your goals and the design, engineering and local approvals your project may need." },
  { question: "Can House Delivery work with my existing builder?", answer: "We welcome conversations with your builder. Together, we can review the proposed housing system, site work, assembly and finishing responsibilities to see how the project could be coordinated." },
  { question: "What types of homes can House Delivery supply?", answer: "Our housing solutions include laneway and carriage homes, custom residences, duplexes and small residential developments. Design suitability and supply scope are reviewed for each property and project." },
  { question: "How does your manufacturing and construction process work?", answer: "We bring together engineered housing systems, coordinated procurement and manufacturing with Canadian construction partners. Light-gauge steel, domestic timber or other suitable engineered methods may be considered. The scope of supply, site work, assembly, permitting and completion responsibilities are established for your project before commitments are made." },
  { question: "What happens after I submit an inquiry?", answer: "Your details go to our team for personal follow-up. We’ll discuss your property, priorities, timing and budget readiness, then identify whether there is a suitable pathway to develop your project. Submitting an inquiry creates no purchase commitment." },
];

function InquiryLink({ children = "Discuss Your Project", light = false }: { children?: React.ReactNode; light?: boolean }) {
  return <a href="#project-inquiry" className={`${styles.button} ${light ? styles.lightButton : ""}`}>{children}<ArrowUpRight size={17} aria-hidden="true" /></a>;
}

export default function BuildYourHomePage() {
  return (
    <>
      <a className={styles.skipLink} href="#build-home-content">Skip to content</a>
      <SiteHeader />
      <main id="build-home-content" className={styles.page}>
        <BuildHomeHero />

        <section id="why-house-delivery" className={styles.section} aria-labelledby="why-heading">
          <div className={styles.container}>
            <p className={styles.eyebrow}>01 / Why House Delivery</p>
            <div className={styles.sectionIntro}>
              <HeadlineReveal><h2 id="why-heading">Considered design.<br /><span className={styles.muted}>Experienced hands.</span></h2></HeadlineReveal>
              <p>A home is a significant investment. The people, materials and decisions behind it deserve the same care as the architecture.</p>
            </div>
            <div className={styles.experienceLayout}>
              <div className={styles.experienceStatement}>
                <p className={styles.experienceNumber}>35<span>+</span></p>
                <h3>Years of Manufacturing Experience</h3>
                <p>Our founder brings more than 35 years of international manufacturing, importing, sourcing and commercial experience.</p>
              </div>
              <div className={styles.experienceRows}>
                <article><span className={styles.rowLabel}>01 / Coordination</span><h3>Integrated Housing Delivery</h3><p>Engineered housing systems, coordinated procurement, international manufacturing relationships and Canadian construction expertise, brought together around your project.</p></article>
                <article><span className={styles.rowLabel}>02 / Longevity</span><h3>Quality That Endures</h3><p>Materials chosen for durability. Components considered for maintenance and serviceability. Beautiful design with a life beyond the first impression.</p></article>
              </div>
            </div>
            <p className={styles.companyStatement}>House Delivery is an Indigenous-owned Canadian company developing an integrated housing delivery platform. We consider light-gauge steel, domestic timber and other suitable engineered systems according to each project’s requirements.</p>
          </div>
        </section>

        <section className={styles.valueSection} aria-labelledby="value-heading">
          <figure className={styles.valueImage}>
            <Image src="/images/build-your-home/master-bedroom.png" alt="Master bedroom design reference with warm timber panelling, an upholstered bed and a seating area beside full-height windows" fill sizes="100vw" quality={95} className={styles.cover} />
            <figcaption><span>Material, light &amp; quiet retreat</span><span>Master bedroom / Interior design reference</span></figcaption>
          </figure>
          <div className={`${styles.container} ${styles.valueEditorial}`}>
            <p className={styles.eyebrow}>02 / Built for lasting value</p>
            <div className={styles.valueComposition}>
              <HeadlineReveal><h2 id="value-heading">Value for<br /><span className={styles.muted}>generations.</span></h2></HeadlineReveal>
              <div className={styles.valueCopy}>
                <p className={styles.valueLead}>A great home should deliver value for generations.</p>
                <p>We look beyond the initial purchase price. Quality, durability, energy performance and the way a home lives all contribute to its lifetime value.</p>
                <p>Practical maintenance, serviceability and replacement-part availability matter as much as the first impression. Our role is to bring those considerations together with intelligent design and manufacturing efficiency.</p>
                <Link href="/inclusions" className={styles.textLink}>Explore our materials &amp; finishes <ArrowUpRight size={15} aria-hidden="true" /></Link>
              </div>
            </div>
            <div className={styles.valuePrinciples}><span>Durability</span><span>Performance</span><span>Serviceability</span><span>Lifetime value</span></div>
          </div>
        </section>

        <section id="home-models" className={`${styles.section} ${styles.solutionsSection}`} aria-labelledby="solutions-heading">
          <div className={styles.container}>
            <p className={styles.eyebrow}>03 / Homes for the way you want to live</p>
            <div className={styles.sectionIntro}>
              <HeadlineReveal><h2 id="solutions-heading">Quality, Durability<br /><span className={styles.muted}>&amp; Lasting Value</span></h2></HeadlineReveal>
              <div className={styles.solutionsPhilosophy}><blockquote><p>Quality, reliability, and longevity should be fundamental to every home—not privileges reserved for the most expensive custom builds. We don’t build cheap homes; we build exceptional, factory-engineered homes that represent intelligent value.</p></blockquote><a href="#design-studio" className={`${styles.button} ${styles.lightButton}`}>Explore the Design Studio <ArrowUpRight size={15} aria-hidden="true" /></a></div>
            </div>
            <div className={styles.solutions}>
              {solutions.map((item, index) => <article key={item.title} className={styles.solutionStory}>
                <Link href={item.href} className={styles.solutionImage} aria-label={item.link}>
                  <Image src={item.image} alt={item.alt} fill sizes="(max-width: 767px) 100vw, (max-width: 1023px) 50vw, 65vw" quality={95} className={styles.cover} />
                </Link>
                <div className={styles.solutionCaption}>
                  <p className={styles.cardNumber}>{String(index + 1).padStart(2, "0")} / Housing solution</p>
                  <h3><Link href={item.href}>{item.title}<ArrowUpRight size={23} aria-hidden="true" /></Link></h3>
                  <p>{item.description}</p>
                  <Link className={styles.textLink} href={item.studioHref ?? item.href}>{item.studioLabel ?? item.link}<ArrowUpRight size={14} aria-hidden="true" /></Link>
                </div>
              </article>)}
            </div>
            <p className={styles.sectionNote}>Architectural designs and design references shown for inspiration. Site suitability, local approvals and the scope of supply and construction are reviewed for each project.</p>
          </div>
        </section>

        <section id="design-studio" className={`${styles.section} ${styles.studioSection}`} aria-labelledby="studio-heading">
          <div className={`${styles.container} ${styles.studioComposition}`}>
            <div className={styles.studioIntro}>
              <p className={styles.eyebrow}>04 / The Design Studio</p>
              <HeadlineReveal><h2 id="studio-heading">Make it<br /><span className={styles.muted}>yours.</span></h2></HeadlineReveal>
              <p>Explore our Premium and Signature collections. Shape the spaces, materials and finishes that make a home your own, then create a personalized House Look Book to discuss with our team.</p>
              <p>Begin with a home you love. Its Design Studio brings your choices together, from the kitchen and bathrooms to flooring, doors and windows.</p>
              <div className={styles.studioActions}>
                {customHomes.map((home, index) => <Link key={home.href} href={home.studioHref} className={index === 0 ? `${styles.button} ${styles.lightButton}` : styles.textLink}>{home.studioLabel}<ArrowUpRight size={15} aria-hidden="true" /></Link>)}
              </div>
              <div className={styles.studioNote}><DesignStudioImageNote /></div>
            </div>
            <figure className={styles.studioImage}>
              <Image src="/images/homes/cedarview/visual-guide/Cedarview_01_Kitchen_Signature-1_Raven-Basalt.png" alt="Cedarview Design Studio kitchen board in the Signature Raven Basalt collection, with dark cabinetry, stone surfaces and coordinated material samples" width={1448} height={1086} sizes="(max-width: 1023px) 100vw, 60vw" quality={95} />
              <figcaption>Cedarview / Signature 1 — Raven Basalt / Design Studio reference</figcaption>
            </figure>
          </div>
        </section>

        <section className={`${styles.section} ${styles.processSection}`} aria-labelledby="process-heading">
          <div className={`${styles.container} ${styles.processComposition}`}>
            <div className={styles.processIntro}>
              <p className={styles.eyebrow}>05 / How House Delivery works</p>
              <HeadlineReveal><h2 id="process-heading">A clearer<br /><span className={styles.muted}>way forward.</span></h2></HeadlineReveal>
              <p>Good coordination starts early. We work through the design, scope and delivery decisions with you, before your project moves toward construction.</p>
              <Link href="/how-it-works" className={styles.textLink}>Explore the delivery journey <ArrowUpRight size={15} aria-hidden="true" /></Link>
            </div>
            <ol className={styles.steps}>
              {steps.map((item, index) => <li key={item.title}><span className={styles.stepNumber}>{String(index + 1).padStart(2, "0")}</span><div><h3>{item.title}</h3><p>{item.body}</p></div></li>)}
            </ol>
          </div>
        </section>

        <section id="project-inquiry" className={`${styles.section} ${styles.inquirySection}`} aria-labelledby="inquiry-heading">
          <div className={styles.container}>
            <p className={styles.lightEyebrow}>06 / Discuss your project</p>
            <HeadlineReveal><h2 id="inquiry-heading">Let’s talk about<br /><span>your project.</span></h2></HeadlineReveal>
            <div className={styles.inquiryContainer}>
              <p className={styles.inquiryIntro}>Whether you’re planning a laneway home, a custom residence or a small residential development, we’d welcome the opportunity to discuss your plans.</p>
              <BuildHomeInquiryForm />
            </div>
          </div>
        </section>

        <section className={`${styles.section} ${styles.faqSection}`} aria-labelledby="faq-heading">
          <div className={`${styles.container} ${styles.faqComposition}`}>
            <div><p className={styles.eyebrow}>07 / A little more clarity</p><HeadlineReveal><h2 id="faq-heading">Before<br /><span className={styles.muted}>we begin.</span></h2></HeadlineReveal></div>
            <div className={styles.faqs}>
              {questions.map((item) => <details key={item.question}><summary>{item.question}<Plus className={styles.plus} size={18} strokeWidth={1} aria-hidden="true" /></summary><p>{item.answer}</p></details>)}
            </div>
          </div>
        </section>

        <section className={styles.finalSection} aria-labelledby="final-heading">
          <div className={styles.container}>
            <p className={styles.eyebrow}>Exceptional Design. Lasting Value.</p>
            <HeadlineReveal><h2 id="final-heading">Let’s build<br />something <span>exceptional.</span></h2></HeadlineReveal>
            <div className={styles.finalInvitation}><p>Tell us what you’re planning.<br />We’ll help you explore the right housing solution.</p><InquiryLink light /></div>
          </div>
        </section>
      </main>
    </>
  );
}
