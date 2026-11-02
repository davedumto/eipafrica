import { FilterProvider } from "./components/FilterStore";
import SmoothAnchors from "./components/SmoothAnchors";
import Stage from "./components/StageLoader";
import Header from "./components/Header";
import Hero from "./components/Hero";
import Journey from "./components/Journey";
import HowItWorks from "./components/HowItWorks";
import Opportunities from "./components/Opportunities";
import Trust from "./components/Trust";
import Audience from "./components/Audience";
import Cta from "./components/Cta";
import Footer from "./components/Footer";

export const instant = false;

export default function Home() {
  return (
    <FilterProvider>
      <canvas id="stage" aria-hidden="true"></canvas>
      <div className="scrim"></div>
      <div id="pins" aria-hidden="true"></div>
      <div id="loading" role="status">
        <span id="loadtxt">LOADING 3D SCENE</span>
        <u></u>
      </div>

      <SmoothAnchors />
      <Stage />
      <Header />

      <main>
        <Hero />
        <Journey />
        <HowItWorks />
        <Opportunities />
        <Trust />
        <Audience />
        <Cta />
      </main>

      <Footer />
    </FilterProvider>
  );
}
