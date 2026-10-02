
import Navbar from "../Components/Navbar";
import Hero from "../Components/Hero";
import ProductList from "../Components/ProductList";

function Shop() {
  return (
    <>
      {/* navbar */}
      <Navbar one={{highlight:"shop"}}/>
      <Hero two={{title:"Shop"}}/>
      {/* <h1>shop</h1> */}
      <ProductList/>
      {/* footer */}
    </>
  );
}

export default Shop;
