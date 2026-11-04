import Navbar from "@/components/landing-v2/Navbar";
import Hero from "@/components/landing-v2/Hero";
import Models from "@/components/landing-v2/Models";
import Faq from "@/components/landing-v2/Faq";
import CtaJoin from "@/components/landing-v2/CtaJoin";
import Footer from "@/components/landing-v2/Footer";
import {
  Process,
  RequirementsAndPayments,
} from "@/components/landing-v2/RecentLandingSections";
import ScrollPhoneStory from "@/components/landing-v2/ScrollPhoneStory";
import LandingLoader from "@/components/landing-v2/LandingLoader";
import { landingV2Font } from "./font";
import scene from "./LandingContent.module.css";
import typography from "./typography.module.css";
import "./landing-v2.css";

export default function LandingPageV2() {
  return (
    <div
      data-landing-version="2"
      className={`${landingV2Font.variable} ${typography.root}`}
    >
      <LandingLoader />
      <Navbar />
      <main className="landing-page">
        <Hero />
        <ScrollPhoneStory />
        <Models />
        <Process />
        <RequirementsAndPayments />
        <Faq />
      </main>
      <div className={scene.footerScene}>
        <CtaJoin />
        <Footer />
      </div>
    </div>
  );
}
