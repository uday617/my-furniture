# Furniture Store Website Remake

## Collaboration preference

- Before making project changes, briefly restate what the user means and the changes planned. If an important behavior is unclear, ask a focused question and wait for the answer before changing it.

## Purpose

Remake the existing furniture website while retaining its overall style and useful customer flows. Keep the existing React frontend and Node.js/Express backend, and use the current MongoDB/Mongoose prototype as the starting point for the MVP. Do not migrate databases or replace working UI as part of the planning work; first inspect and extend the existing implementation.

## Design requirements

- The website must be responsive across desktop, tablet, and mobile screens; each page and shared component should be designed and reviewed at those sizes.
- Write customer-facing text in a natural, direct voice. Avoid vague, overly polished, or repetitive copy that sounds machine-generated. Prefer concrete product, delivery, and support information.

## Agreed product decisions

- Visitors can browse products and add them to a cart without signing in.
- At checkout, customers can sign in, create an account, or continue as a guest.
- Checkout collects contact and delivery details, calculates delivery and applicable tax, and shows the complete amount and payment currency before the customer confirms payment or places a COD order.
- Guest checkout is supported without creating an account. The order still contains the contact and delivery details needed to fulfill it.
- Guest purchases require online payment. Do not treat a guest order as paid or confirmed until the payment provider verifies payment.
- Signed-in customers may use online payment or Cash on Delivery (COD), but show COD only when the delivery address is eligible. Phone confirmation is required for COD.
- Both guest and signed-in purchases use the same order and checkout flow. Signed-in orders are linked to the account; guest orders are not.
- Current direction: keep the catalog's EUR prices for Stripe test-mode payment-flow testing. This does not approve live prices, shipping/tax, merchant settlement currency, or order placement.
- Target Stripe as the primary online payment provider. Implement test mode only until merchant eligibility, live pricing, delivery, and tax are confirmed. PayPal is a possible later addition, not an MVP dependency.
- Initial design and implementation started with the home page; continue by reviewing and extending the existing pages rather than replacing completed work.

## Planned technical stack

- Frontend: React
- Backend: Node.js with Express
- Database: MongoDB with Mongoose
- Online payments: Stripe-hosted card checkout in test mode only; requires a private `sk_test_` key. Never accept a live key in the test checkout endpoint.
- Currency: EUR for current test-mode item subtotals, using server-side catalog prices. Live order/payment currency remains undecided and must match confirmed merchant/provider setup.
- The existing Express/Mongoose backend is an early prototype; production data models, authentication, and checkout/order lifecycle are not implemented.

## MVP market and checkout boundaries

- Merchant operating country: United States.
- Launch delivery market: United States only. Confirm the merchant's legal/registered operating details and actual delivery coverage before enabling live checkout.
- The frontend sends product IDs and quantities only; the backend resolves prices from the catalog and creates the EUR Stripe test session. Never trust client-supplied prices or totals.
- Test checkout collects US addresses and charges only the EUR item subtotal. It explicitly excludes delivery and tax, creates no fulfillable order, and must not be presented as a live purchase.
- Live checkout and order placement remain disabled until approved live prices/currency, delivery coverage/prices, applicable tax obligations/calculation, merchant/provider onboarding, and order fulfillment operations are confirmed.
- Do not use precise device-location permission to determine eligibility. Use the customer-entered delivery address and server-side delivery rules.
- Stripe is the planned primary online provider, not yet a verified live integration. Confirm that the merchant account can onboard and process the intended US transactions before implementation is treated as launch-ready.
- PayPal, international delivery, additional currencies, currency conversion, and country-specific payment methods (including India-focused methods) are explicitly deferred.
- COD is limited to signed-in customers in configured eligible delivery zones and requires phone confirmation. Until delivery zones and operational checks are defined and implemented, COD must remain unavailable.
- No live checkout, real payment processing, or order placement should be enabled until live prices/currency, delivery coverage/costs, tax handling, provider onboarding, and the complete-total display are verified. The EUR flow is strictly Stripe test mode.

## Work plan

1. Inventory existing pages, shared components, backend endpoints, data storage, and working flows; preserve the existing design and behavior that already works.
2. Configure Stripe test mode and verify the EUR payment preview; keep live purchase features disabled until all launch gates below are confirmed.
3. Define MongoDB/Mongoose models and API contracts for products, carts, customers, addresses, orders, order items, payments, and fulfillment; do not migrate to PostgreSQL for this MVP.
4. Finish the current React shopping pages and guest/signed-in checkout UX against those API contracts, showing accurate delivery, tax, currency, and final totals.
5. Implement backend validation, account/session handling, order lifecycle, delivery eligibility, and Stripe payment creation/verification.
6. Connect frontend and backend; test guest online payment, signed-in online payment, eligible/ineligible COD, payment failure/cancellation, and order confirmation end to end.
7. Enable live checkout only after all release gates pass; then review responsive behavior and operational order handling.

## MVP execution checklist

### Gate 1 — Confirm business and provider setup (before live checkout)

- Confirm the merchant's legal entity/registered country, Stripe live account onboarding eligibility, and live settlement currency.
- Confirm which US states/ZIP codes the store can actually deliver to, including any excluded areas.
- Decide delivery prices and rules (for example, flat rate, threshold-based, or address/product-based); calculate them before payment.
- Confirm applicable sales-tax obligations and choose how tax is calculated and recorded. A displayed estimate must not be mistaken for a compliant final calculation. Do not take live payments or place orders until this is settled.
- Define COD zones, eligibility checks, phone-confirmation process, and how COD payment collection is recorded.
- Confirm product/stock source and who will manage fulfillment, shipment updates, cancellations, and refunds.
- Decide and approve the live product prices and currency. The current EUR catalog is used only for test-mode payment verification until then.

### Gate 2 — Build and verify the MVP

- Keep the existing homepage and design work; complete/review the shop/catalog, product detail, cart, account, checkout, and order confirmation pages.
- Support guest checkout without account creation and signed-in checkout with orders linked to the account.
- Use a server-created order/payment amount as the source of truth; never trust client-submitted prices, totals, payment status, or COD eligibility.
- For test-mode payment, create Stripe Checkout Sessions on the server from catalog prices and verify the returned session directly with Stripe. Keep test payments separate from order placement.
- Before live launch, add verified Stripe webhook handling, idempotent order/payment persistence, and safe retry/cancellation/failure/refund behavior.
- Keep payment state separate from fulfillment state. Minimum payment states: pending, paid, failed, cancelled, refunded (and partially refunded only if supported). Minimum fulfillment states: unfulfilled, processing, shipped, delivered, cancelled.
- For COD, allow only a signed-in eligible customer after required phone confirmation; record it as payment due on delivery, not as already paid.
- Store order items and the address/price details needed to fulfill and support the order, so later catalog or profile changes do not rewrite order history.
- Provide an order confirmation view only for a successfully paid online order or an accepted COD order; provide a safe way for a guest to retrieve order status without exposing another customer's order.
- Test responsive layouts and accessibility for desktop, tablet, and mobile, and test the full flows including invalid addresses, unavailable delivery zones, payment failure, refresh/retry, and repeated provider notifications.

### MVP release scope

- Included: Home, shop/catalog, product detail, cart, guest and signed-in checkout, account basics, order confirmation/status, and the minimum order operations required to fulfill purchases.
- Deferred: international shipping, multi-currency conversion, India-specific payment methods, PayPal, advanced promotions/loyalty, and unsupported COD zones.
- Deferred live capabilities must not appear as working checkout choices. Do not claim delivery, tax, live-payment, or order capabilities that are not configured and tested.

## Open decisions

- Confirm merchant legal/registered details and Stripe onboarding/transaction eligibility.
- Confirm US delivery states/ZIP codes, shipping prices, and any product-specific delivery restrictions.
- Confirm the applicable sales-tax approach and implementation/provider.
- Define eligible COD zones, phone verification, collection, and exception handling.
- Decide whether guests should be offered account creation after a successful purchase (not required for guest checkout).
- Clarify what “Bin” refers to, if it is still a requested payment provider or method.

## Current implementation sequence

1. Preserve and review the existing homepage and shared navigation.
2. Review/complete shop and product discovery, then product detail.
3. Review/complete cart, account basics, and the Stripe EUR test-mode checkout; keep live payment/order placement disabled while release gates are open.
4. Implement MongoDB-backed API, authentication/session handling, delivery/tax calculations, Stripe payment verification, COD eligibility, and order management.
5. Connect and test the complete guest and signed-in journeys, then enable live checkout only after release gates pass.

The frontend uses the current catalog's EUR prices only for Stripe test-mode payment-flow verification. Test checkout collects US addresses, charges the item subtotal only, and does not place an order. Do not enable live payment processing or order placement until live prices/currency, merchant/provider onboarding, delivery rules, tax handling, order persistence, and fulfillment are confirmed and tested.

## Homepage design draft

- Reworked the homepage to follow the shared Skanvi reference screenshots: two-row search/navigation header, full-width lifestyle hero, horizontal category browse row, editorial room cards, makers strip, featured furniture, newsletter panel, and multi-column footer.
- Follow-up visual corrections: reduced and constrained the hero headline to prevent wrapping/overflow; made the category browse row horizontally scrollable with previous/next controls and touch scrolling; removed colored category tile panels, used six matching category cutouts (storage, bed, dining set, lounge chair, sofa, chair), and placed each label beneath the correct image.
- Carousel refinement: limited the desktop viewport to five of the six category cards so horizontal overflow is present and the arrows can reveal the last card; constrained cutouts to their native dimensions to avoid enlarging the screenshot-derived images and making them look pixelated.
- Header reference correction: removed the separate announcement strip and positioned the logo, search, account, wishlist, bag, navigation, and delivery message over the full-viewport hero image, following the latest Skanvi screenshot. The hero copy is placed over the photo with a darker gradient for readability.
- Navigation interaction: hovering or focusing the Furniture control opens a green category panel and blurs/dims the hero; Escape and the backdrop close it. On narrow screens, tapping Furniture expands the category links inside the mobile menu.
- Used the publicly served Skanvi hero poster at `https://skanvi.com/video/skanvi-hero-desktop-poster.webp` as the hero image requested by the user. The six category cutouts were cropped from the Skanvi screenshot supplied by the user so each image matches its English label; other draft imagery comes from the project's existing local image assets.
- Adapted the visible reference copy into short, conversational English. Current examples include “Rooms that feel like you,” “What are you looking for?” and “Furniture we keep coming back to.”
- Added responsive layouts for desktop, tablet, and mobile, including a horizontally scrollable mobile category row, stacked editorial cards, and full-screen mobile navigation.
- Corrected the desktop Furniture menu so its green header and overlay meet flush at the top edge, locked page scrolling while the menu is open, and added the second category column shown in the reference. Menu panels open with a short, restrained fade/slide; category rows use consistent spacing.
- Tuned the menu typography and row height down to match the reference more closely, removed the visible panel scrollbar when the category list fits, and reduced the delivery pill size.
- Furniture menu hover now remains open while the pointer is over either green panel and closes when the pointer enters the dimmed area outside them.
- The secondary product menu now stays hidden until a main category is hovered or keyboard-focused, and resets closed when the menu closes.
- Added a third hover level for product subtypes, including sofa sizes and styles, with related nested choices for tables, chairs, beds, rugs, lighting, mirrors, and accessories.
- The Rooms navigation now opens a full-screen dark green room picker, with a centered list and a highlighted active room to match the supplied reference.
- Kept the room list within the viewport below the fixed header, and made the Furniture hover close the room picker before opening the product menu.
- On the light Designer header, opening Furniture or Rooms switches the header controls and navigation back to the light-on-green treatment. The menus also start below the taller header (160px desktop, 108px tablet), so they cannot cover the nav controls and intercept pointer input.
- Reset the browser's default link underlines across the shared header and hover menus, including the wordmark, icon links, Designers/New In navigation, and category rows; the Furniture and Rooms hover states no longer add an underline.
- Restored underlines only while hovering or keyboard-focusing the four main navigation labels. From the Designer route, hovering or activating Furniture navigates to Home (`/`) and carries the open menu into the Home header. Moving away closes the menu and keeps Home open, so the URL matches the visible page.
- Added a responsive Designer directory at `/designer`, linked from the Designers navigation item. It follows the Skanvi reference with a light two-row header, large green title, fine four-column card grid, portrait photography, designer names, and profile links; the grid collapses to two columns on mobile and one on very narrow screens.
- Brand and sample product names/prices remain design placeholders. Currency display, search, navigation destinations, and newsletter submission are not yet connected to working store features.
- Updated the homepage title and description. Local preview: `http://127.0.0.1:5173/` while the development server is running.

## Design and feature reference: Skanvi

Reviewed the public Skanvi storefront on 2026-09-24 as a reference for this remake, not as a source to copy wholesale.

### Pages and flows reviewed

- **Home:** Large lifestyle hero, quick category carousel, featured products, brand strip, service promises, newsletter, and detailed footer.
- **Shop/catalog:** Product grid, product count, sorting (relevance, newest, price, name), expandable filters (color, shape, brand/collection/series, price, availability), wishlist controls, and load-more pagination.
- **Category and room pages:** Product grids can be reached from shopping categories and room inspiration pages. The room index lists living room, dining room, bedroom, kids' room, hallway, kitchen, bathroom, and outdoor/terrace.
- **Product detail:** Product image gallery, stock status, price, add-to-cart, wishlist, delivery/return information, product detail accordions, and related products.
- **Cart:** Quantity controls, remove item, subtotal/tax/shipping/total, checkout button, and reassurance about shipping, returns, and accepted payment types.
- **Checkout:** Three-step progress indicator (information, payment, completion); login prompt is optional; customer details are entered without requiring login; account creation is an optional checkbox; alternate delivery address and order notes can be selected.
- **Account:** Login form and password reset link. Account creation is offered at checkout rather than as a separate registration form on the account page.
- **Editorial/support:** Designer directory and profiles, new arrivals, About, and Contact/FAQ pages.
- **Site-wide:** Search, menu, cart badge, newsletter, contact details, FAQ, delivery/returns links, legal pages, and payment/shipping logos.

### Navbar and header styling reviewed

- At the narrow viewport reviewed, the header uses a compact horizontal layout: Skanvi logo on the left, a long pill-shaped search field, a round cart button with an item-count badge, and a round hamburger button on the right.
- The open navigation is a full-screen muted green panel with the logo and close button at the top. Category and destination rows use simple line icons, large light text, fine dividers, and plus markers on expandable product categories.
- The menu groups product categories first, then room inspiration, designers, new arrivals, account, and wishlist. This gives a useful reference for keeping shopping and discovery destinations easy to find.
- The header cart button opens a cart drawer with product, quantity/remove controls, subtotal, tax, and direct cart/checkout actions. The item count updates when a product is added.
- Visual review was at the narrow browser viewport available in this session; desktop header behavior and responsive breakpoints still need a separate review.

### Useful design ideas to consider

- Keep product discovery visual, with lifestyle imagery, straightforward categories, room-based browsing, product cards, filters, sorting, and product recommendations.
- Make cart totals, delivery cost, tax, return details, and checkout progress easy to understand.
- Use an optional account creation step during checkout so guest buyers are not forced to register.
- Treat support, order tracking, delivery, and returns as part of the store experience, not just footer links.

### Reference issues and constraints noticed

- The Skanvi new-arrivals page initially displays the same 929-product count and the same leading catalog items as the general shop, with relevance as its default sort. New-arrivals behavior should be checked carefully if we implement that page.
- The living-room page showed a “Wohnzimmerteppiche” category with 0 products, despite showing other living-room products. We should make sure our category links and counts match actual product assignments.
- This storefront is German-language and Euro-based; the observed pages show 19% VAT and free delivery from €249. Its setup does not establish our own target countries, currencies, tax, delivery, COD, or payment-provider rules.
- Payment options shown across its product/cart/footer include PayPal, Klarna, cards, Apple Pay, Google Pay, and SEPA. These are reference examples, not a decision for our store.
- We inspected the Skanvi checkout fields and guest/account options but did not enter personal information, submit an order, or make a payment. Payment completion behavior was therefore not tested.

### Payment research notes

- Earlier PayPal and Paytm research was for possible international expansion, not the MVP provider decision. Those options remain deferred.
- For local test checkout, configure a private Stripe test secret (`STRIPE_SECRET_KEY=sk_test_...`) and the frontend URL (`CLIENT_URL`); never put secret keys in frontend variables or commit them.
- Stripe Checkout Sessions use Dashboard-managed payment methods; do not pass the removed `payment_method_types` parameter.
- Before live checkout, verify current Stripe onboarding and transaction eligibility against the merchant's confirmed legal/registered details, then validate the configured payment flow in test mode.
- Revisit provider/currency research only when a later international expansion is approved.

## Progress log

- Planning: set the MVP direction to guest checkout, Stripe as the planned primary provider, and COD only for verified eligible signed-in customers. Recorded unresolved launch gates and staged implementation checklist above.
- Reference review: inspected Skanvi home, catalog/filter, product detail, room and designer browsing, cart, checkout form, account login, About, and Contact/FAQ pages. Added observations above.
- Header review: inspected the compact navbar, expanded full-screen menu, and cart drawer; cleared the temporary reference item from the cart after checking the shopping flow.
- Homepage: first draft implemented and previewed locally; adjusted the desktop header/search proportions, top alignment, hero copy inset and headline scale against the supplied Skanvi screenshot. Responsive tablet and mobile overrides remain in place.
- Designer directory: implemented from the supplied Skanvi reference screenshots and the public Designer page; the local preview server could not be started in this session because the sandbox denied Vite access to a parent directory.
- Checkout follow-up: persist Stripe-verified EUR test payments in MongoDB as a separate test-only record, mirror them into same-browser account history without counting them as real orders/spend, and email a prominently labeled test receipt via SMTP. SMTP delivery state is recorded and explicitly retryable; guest online checkout remains sign-in-free, while COD stays unavailable.
