import { ArrowRight, CalendarCheck, ChatCircleDots, ShieldCheck } from "@phosphor-icons/react/dist/ssr";
import Image from "next/image";
import HeroLoop from "./HeroLoop";

export default function Hero() {
  return (
    <section id="top" className="landing-hero">
      <div className="landing-hero-frame">
        <HeroLoop />
        <div className="landing-hero-shade" aria-hidden="true" />
        <div className="landing-hero-doodles" aria-hidden="true">
          <Image className="landing-hero-doodle bird-one" src="/brand/doodles/bird-flight.png" alt="" width={1024} height={1024} sizes="76px" />
          <Image className="landing-hero-doodle bird-two" src="/brand/doodles/bird-happy.png" alt="" width={1024} height={1024} sizes="76px" />
          <Image className="landing-hero-doodle cloud-one" src="/brand/doodles/cloud-soft.png" alt="" width={1024} height={1024} sizes="76px" />
          <Image className="landing-hero-doodle cloud-two" src="/brand/doodles/cloud-round.png" alt="" width={1024} height={1024} sizes="76px" />
          <Image className="landing-hero-doodle sparkle-one" src="/brand/doodles/sparkle.png" alt="" width={1024} height={1024} sizes="76px" />
          <Image className="landing-hero-doodle heart-one" src="/brand/doodles/winged-heart.png" alt="" width={1024} height={1024} sizes="76px" />
          <Image className="landing-hero-doodle bubble-one" src="/brand/doodles/bubble.png" alt="" width={1024} height={1024} sizes="76px" />
        </div>

        <div className="landing-hero-intro">
          <span className="landing-hero-eyebrow">
            <ShieldCheck weight="fill" aria-hidden="true" />
            DTI registered iPhone &amp; iPad paluwagan
          </span>
          <h1>
            <span>Your next phone</span>
            <span>made manageable</span>
          </h1>
        </div>

        <div className="landing-hero-facts" aria-label="Fresh Phones service highlights">
          <article>
            <CalendarCheck weight="duotone" aria-hidden="true" />
            <div><strong>Clear schedules</strong><span>Know each expected due date.</span></div>
          </article>
          <article>
            <ChatCircleDots weight="duotone" aria-hidden="true" />
            <div><strong>Human support</strong><span>Help from application to release.</span></div>
          </article>
        </div>

        <article className="landing-hero-plan">
          <div><span>Paluwagan plan</span><strong>0% interest</strong></div>
          <p>Approved batches with a clear payment schedule.</p>
        </article>

        <a href="#units" className="landing-hero-cta">
          View available units
          <span><ArrowRight weight="bold" aria-hidden="true" /></span>
        </a>

        <div className="landing-hero-mobile-facts" aria-hidden="true">
          <span>0% interest</span><span>Clear schedules</span><span>Human support</span>
        </div>
      </div>
    </section>
  );
}
