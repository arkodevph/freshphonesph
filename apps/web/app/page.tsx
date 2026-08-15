import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import Marquee from "@/components/Marquee";
import Stats from "@/components/Stats";
import HowItWorks from "@/components/HowItWorks";
import Models from "@/components/Models";
import Plans from "@/components/Plans";
import PosterGallery from "@/components/PosterGallery";
import Features from "@/components/Features";
import Testimonials from "@/components/Testimonials";
import Faq from "@/components/Faq";
import CtaJoin from "@/components/CtaJoin";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <Marquee />
        <Stats />
        <HowItWorks />
        <Models />
        <Plans />
        <PosterGallery />
        <Features />
        <Testimonials />
        <Faq />
        <CtaJoin />
      </main>
      <Footer />
    </>
  );
}
