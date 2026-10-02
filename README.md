# my-furniture
furniture web site

## Production deployment

The frontend is a Vite app in `furniture fronted`; the Express API is in `furniture backend`.

1. Create a Render web service from this repository using the root `render.yaml`. Set `URL` to the MongoDB connection string and `CLIENT_URL` to the deployed Vercel site origin (for example, `https://my-furniture.vercel.app`, with no trailing slash). Render generates `SESSION_SECRET` for the service.
2. Create a Vercel project from the same repository and set its **Root Directory** to `furniture fronted`. Use the default Vite build settings (`npm run build`, output directory `dist`). Add `VITE_API_BASE_URL` with the Render service URL (for example, `https://my-furniture-api.onrender.com`, with no trailing slash), then deploy or redeploy.
3. If either hosted URL changes, update the other service's corresponding URL setting and redeploy. `CLIENT_URL` must match the browser origin exactly so credentialed requests and account sessions work.

Optional backend settings include Stripe test credentials (`STRIPE_SECRET_KEY`), SMTP settings for email, and any other integrations documented in the backend code. Keep secrets in the hosting provider's environment settings; do not commit `.env` files.

## Local checkout and accounts

1. Configure `furniture backend/.env` with the MongoDB `URL`, frontend `CLIENT_URL`, and a random `SESSION_SECRET` of at least 32 characters. Generate one with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`. Keep `.env` private; it is ignored by Git.
2. Start the backend from `furniture backend` with `npm run dev`, then start the frontend from `furniture fronted` with `npm run dev`.
3. Open **Your account** to register with a name, email, and password, or log in with an existing account. Passwords are hashed on the backend and login sessions are stored in MongoDB.
4. At checkout, cash on delivery is enabled only for logged-in customers. COD orders are saved to that account and the purchased quantities are removed from the bag after the server confirms the order.

Checkout currently accepts US delivery addresses and prices items in EUR. Stripe remains in test mode and does not create fulfillable card orders. COD saves a real pending order; shipping and tax are not calculated, and the store must arrange fulfillment. SMTP settings are optional for placing an order but required to email order confirmations.

Customers can cancel a COD order from their account while its status is pending or processing. Cancellation is not available once the order is shipped or delivered. Stripe test payments show the verified test receipt and delivery details entered, but remain non-purchases and cannot be shipped or cancelled as real orders.

The footer newsletter signup stores an email as pending and sends a single-use confirmation link that expires after 24 hours. Confirming the address sends a unique 15% coupon code by email. A logged-in customer can apply the coupon at checkout; it is validated against the signed-in email, and is limited to one first COD order.

The first administrator must be promoted manually in the MongoDB database used by `URL`, after registering and signing in once:

```javascript
db.accounts.updateOne(
  { email: "admin@example.com" },
  { $set: { role: "admin" } }
)
```

Refresh the site after promotion, then open `/admin`. The dashboard can review and update COD order statuses, manage catalog products and categories, archive or restore products, and view newsletter coupon redemptions. On backend startup, the bundled catalog is copied into the MongoDB `products` collection only when that collection is empty. Product changes made in the admin dashboard are stored in MongoDB.

Customers can use **Forgot password?** on the account sign-in screen. The backend sends a one-time reset link through the configured SMTP account; reset links expire after one hour. Signed-in browsing activity (visited pages/products, product searches, and approximate page duration) is kept for up to 180 days and shown to admins under **Customers**. Customers see a notice in their account and can disable weekly personalized product emails. Recommendation emails are sent at most once per week when related in-stock items are available.
