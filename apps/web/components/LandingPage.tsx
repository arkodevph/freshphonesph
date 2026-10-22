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
import CloudDivider from "@/components/CloudDivider";
import LandingLoader from "@/components/LandingLoader";
import "../app/landing.css";

export default function Home() {
  return (
    <>
      <LandingLoader />
      <Navbar immersive />
      <main>
        <Hero />
        <CloudDivider />
        <ScrollPhoneStory />
        <Models />
        <Process />
        <RequirementsAndPayments />
        <Faq />
        <CtaJoin />
      </main>
      <Footer />
    </>
  );
}
