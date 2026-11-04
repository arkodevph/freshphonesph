import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import Models from "@/components/Models";
import Faq from "@/components/Faq";
import CtaJoin from "@/components/CtaJoin";
import Footer from "@/components/Footer";
import {
  Process,
  RequirementsAndPayments,
} from "@/components/RecentLandingSections";
import ScrollPhoneStory from "@/components/ScrollPhoneStory";
import LandingLoader from "@/components/LandingLoader";
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
        <Footer standalone={false} />
      </div>
    </div>
  );
}
