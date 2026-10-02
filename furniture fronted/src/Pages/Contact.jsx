import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { StoreHeader } from "./Home";
import "./NewIn.css";
import "./StaticContent.css";

export default function Contact() {
  const location = useLocation();

  useEffect(() => {
    document.title = "Contact & FAQs | Skanvi";
  }, []);

  useEffect(() => {
    const target = location.hash && document.getElementById(location.hash.slice(1));
    if (target) window.requestAnimationFrame(() => target.scrollIntoView({ behavior: "smooth", block: "start" }));
  }, [location.hash]);

  return <main className="new-in-page static-content-page">
    <StoreHeader variant="paper" />
    <section className="new-in-hero" aria-labelledby="contact-title">
      <p className="new-in-hero__eyebrow">Support</p>
      <h1 id="contact-title">Contact &amp; FAQs</h1>
      <p>Questions about a product, your order, delivery or returns? Find the right local help below.</p>
    </section>

    <section className="static-content__contact" aria-label="Contact details">
      <div><p>Email</p><strong>support@skanvi.com</strong></div>
      <div><p>Phone</p><strong>+49 221 29246424</strong></div>
      <div><p>Opening hours</p><strong>Monday-Friday, 12 pm-6 pm</strong></div>
    </section>

    <section className="static-content__topics" aria-label="Help topics">
      <article id="order-tracking"><h2>Order tracking</h2><p>View orders saved in this browser through your account page.</p><Link to="/account">Open your account <span aria-hidden="true">→</span></Link></article>
      <article id="delivery"><h2>Delivery times</h2><p>Delivery information for a product is shown on its product page and confirmed during checkout.</p><Link to="/neuheiten?category=furniture">Browse furniture <span aria-hidden="true">→</span></Link></article>
      <article id="returns"><h2>Returns</h2><p>For help with a return, contact support with your order details.</p></article>
      <article id="contract-cancellation"><h2>Cancel a contract</h2><p>Contact support with your order details to request a cancellation.</p></article>
      <article id="imprint"><h2>Imprint</h2><p>For company information, contact support.</p></article>
      <article id="privacy"><h2>Privacy</h2><p>For privacy questions about this storefront, contact support.</p></article>
      <article id="terms"><h2>Terms</h2><p>For questions about terms and conditions, contact support.</p></article>
    </section>
  </main>;
}