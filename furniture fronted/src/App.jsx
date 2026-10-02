import "./App.css";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import Home from './Pages/Home'
import About from './Pages/About'
import Blog from './Pages/Blog'
import Cart from './Pages/Cart'
import Contact from './Pages/Contact'
import Service from './Pages/Service'
import Shop from './Pages/Shop'
import CheckOut from './Pages/CheckOut'
import ThankYou from './Pages/ThankYou'
import Designer from './Pages/Designer'
import NewIn from './Pages/NewIn'
import Mirrors from './Pages/Mirrors'
import Rugs from './Pages/Rugs'
import Wishlist from './Pages/Wishlist'
import Account from './Pages/Account'
import ProductDetail from './Pages/ProductDetail'
import NewsletterConfirm from './Pages/NewsletterConfirm'
import Admin from './Pages/Admin'
import StoreFooter from "./Components/StoreFooter";
import ActivityTracker from "./Components/ActivityTracker";
function App() {
  return (
    <>
      <BrowserRouter>
        <ActivityTracker />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/blog" element={<Blog />} />
          <Route path="/shop" element={<Shop />} />
          <Route path="/designer" element={<Designer />} />
          <Route path="/neuheiten" element={<NewIn />} />
          <Route path="/spiegel" element={<Mirrors />} />
          <Route path="/teppiche" element={<Rugs />} />
          <Route path="/wishlist" element={<Wishlist />} />
          <Route path="/account" element={<Account />} />
          <Route path="/account/reset-password" element={<Account />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/newsletter/confirm" element={<NewsletterConfirm />} />
          <Route path="/produkt/:slug" element={<ProductDetail />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/services" element={<Service />} />
          <Route path="/checkout" element={<CheckOut />} />
          <Route path="/thankyou" element={<ThankYou />} />
        </Routes>
        <StoreFooter />
      </BrowserRouter>
    </>
  );
}

export default App;
