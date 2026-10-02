import Navbar from "../Components/Navbar";
import Hero from "../Components/Hero";
import ThankYouPage from "../Components/ThankYouPage";
function ThankYou() {
  return (
    <>
      <Navbar one={{ highlight: "cart" }} />
      <Hero
        two={{
          title: "Cart",
        }}
      />
      <ThankYouPage />
      {/* footer */}
    </>
  );
}

export default ThankYou;
