import { Link } from "react-router-dom";
import { StoreHeader } from "./Home";
import "./NewIn.css";
import "./StaticContent.css";

export default function About() {
  return <main className="new-in-page static-content-page">
    <StoreHeader variant="paper" />
    <section className="new-in-hero" aria-labelledby="about-title">
      <p className="new-in-hero__eyebrow">Skanvi</p>
      <h1 id="about-title">Furniture for the way you live.</h1>
      <p>Thoughtful furniture, lighting, rugs and home accessories for everyday spaces.</p>
    </section>
    <section className="static-content__about">
      <p>We bring together useful design and considered details to help make a home feel personal, comfortable and ready for real life.</p>
      <p>Explore the collection by category, browse designers, or get in touch with our support team for help with a product or order.</p>
      <div className="static-content__about-links"><Link to="/neuheiten?category=furniture">Explore furniture <span aria-hidden="true">→</span></Link><Link to="/designer">Meet the designers <span aria-hidden="true">→</span></Link><Link to="/contact">Contact &amp; FAQs <span aria-hidden="true">→</span></Link></div>
    </section>
  </main>;
}
