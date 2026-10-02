import React, { useEffect, useState } from "react";
import CardProductList from "./CardProductList";

function ProductList() {
  const [cardData, setCardData] = useState([])
  useEffect(() => {
    const apiFetch = async () => {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || "http://localhost:8000"}/shop/alldata`)
      const jsonResponse = await response.json();
      // console.log(jsonResponse);
      setCardData(jsonResponse["data"])
    }
    apiFetch()
  }, [])
  return (
    <>

      <div className="untree_co-section product-section before-footer-section">
        <div className="container">
          <div className="row">
            {cardData.map((item, index) => (
              <CardProductList one={item} key={index} />
            ))}
          </div>
        </div>
      </div>

    </>
  );
}

export default ProductList;
