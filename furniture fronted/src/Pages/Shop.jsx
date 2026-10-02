import React, { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import Navbar from "../Components/Navbar";
import Hero from "../Components/Hero";
import ProductList from "../Components/ProductList";

const roomTitles = {
  "living-room": "Living room",
  "dining-room": "Dining room",
  bedroom: "Bedroom",
  "kids-room": "Kids’ room",
  hallway: "Hallway",
  kitchen: "Kitchen",
  bathroom: "Bathroom",
  outdoor: "Outdoor",
};

function Shop() {
  const [searchParams] = useSearchParams();
  const selectedRoom = roomTitles[searchParams.get("room")] || null;

  useEffect(() => {
    document.title = `${selectedRoom || "Shop"} | Skanvi`;
  }, [selectedRoom]);

  return (
    <>
      {/* navbar */}
      <Navbar one={{highlight:"shop"}}/>
      <Hero two={{title: selectedRoom || "Shop"}}/>
      {/* <h1>shop</h1> */}
      <ProductList/>
      {/* footer */}
    </>
  );
}

export default Shop;
