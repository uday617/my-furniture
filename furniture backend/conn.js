const mongoose = require("mongoose")
require("dotenv").config()

const databaseReady = mongoose.connect(process.env.URL);
mongoose.connection.on('connected', () => console.log('connected'));

const { Schema } = mongoose;
const contactSchema = new Schema({
    firstName: String,
    lastName: String,
    email: String,
    message: String
});



const Contact = mongoose.model('Contact', contactSchema);


const orderschema = new Schema({
    formdata: {
      country:String,
      firstname: String,
      lastname: String,
      companyName: String,
      address: String,
      state: String,
      Zip: String,
      email: String,
      phoneNo: String,
      Notes: String,
    },
    cartdata: [
      {
        id:Number,
        productImage: String,
        productName: String,
        productPrice: String,
        pQuantity: Number,
      },
    ]
  })
const Order = mongoose.model('Order' ,orderschema)

const testPaymentSchema = new Schema({
    stripeSessionId: { type: String, required: true, unique: true },
    testOnly: { type: Boolean, default: true, immutable: true },
    status: { type: String, enum: ["test_paid"], default: "test_paid" },
    amountTotal: { type: Number, required: true },
    currency: { type: String, enum: ["eur"], default: "eur" },
    email: { type: String, required: true },
    customer: {
        name: String,
        phone: String
    },
    delivery: {
        name: String,
        line1: String,
        line2: String,
        city: String,
        region: String,
        postalCode: String,
        country: String
    },
    items: [{
        productId: String,
        name: String,
        image: String,
        unitAmount: Number,
        quantity: Number
    }],
    receiptEmailStatus: {
        type: String,
        enum: ["pending", "sending", "sent", "failed", "not_configured"],
        default: "pending"
    },
    receiptEmailSentAt: Date,
    receiptEmailAttemptedAt: Date
}, { timestamps: true })

const TestPayment = mongoose.models.TestPayment || mongoose.model("TestPayment", testPaymentSchema)

const accountSchema = new Schema({
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    passwordResetTokenHash: { type: String, select: false },
    passwordResetExpiresAt: { type: Date, select: false },
    role: { type: String, enum: ["customer", "admin"], default: "customer" },
    phone: { type: String, trim: true, maxlength: 30, default: "" },
    deliveryAddress: {
        firstName: { type: String, trim: true, maxlength: 100, default: "" },
        lastName: { type: String, trim: true, maxlength: 100, default: "" },
        country: { type: String, enum: ["US", ""], default: "" },
        address: { type: String, trim: true, maxlength: 200, default: "" },
        apartment: { type: String, trim: true, maxlength: 200, default: "" },
        city: { type: String, trim: true, maxlength: 100, default: "" },
        region: { type: String, trim: true, maxlength: 100, default: "" },
        postalCode: { type: String, trim: true, maxlength: 30, default: "" }
    },
    recommendationEmailsEnabled: { type: Boolean, default: true },
    lastRecommendationEmailAttemptAt: Date,
    lastRecommendationEmailSentAt: Date
}, { timestamps: true })

const Account = mongoose.models.Account || mongoose.model("Account", accountSchema)

const codOrderSchema = new Schema({
    orderNumber: { type: String, required: true, unique: true },
    userId: { type: Schema.Types.ObjectId, ref: "Account", required: true },
    checkoutRequestId: { type: String, required: true },
    status: { type: String, enum: ["pending", "processing", "shipped", "delivered", "cancelled"], default: "pending" },
    cancellationReason: { type: String, trim: true, maxlength: 500, default: "" },
    cancelledAt: Date,
    paymentMethod: { type: String, enum: ["cod"], default: "cod" },
    subtotal: { type: Number, required: true, min: 0.01 },
    discountAmount: { type: Number, min: 0, default: 0 },
    couponCode: { type: String, default: "" },
    total: { type: Number, required: true, min: 0.01 },
    currency: { type: String, enum: ["eur"], default: "eur" },
    customer: {
        name: { type: String, required: true },
        email: { type: String, required: true },
        phone: { type: String, required: true }
    },
    notes: { type: String, maxlength: 1000, default: "" },
    delivery: {
        firstName: { type: String, required: true },
        lastName: { type: String, required: true },
        address: { type: String, required: true },
        apartment: String,
        city: { type: String, required: true },
        region: { type: String, required: true },
        postalCode: { type: String, required: true },
        country: { type: String, enum: ["US"], required: true }
    },
    items: [{
        productId: { type: String, required: true },
        name: { type: String, required: true },
        image: String,
        unitAmount: { type: Number, required: true },
        quantity: { type: Number, required: true, min: 1 }
    }],
    receiptEmailStatus: { type: String, enum: ["pending", "sent", "failed", "not_configured"], default: "pending" },
    receiptEmailSentAt: Date
}, { timestamps: true })
codOrderSchema.index({ userId: 1, createdAt: -1 })
codOrderSchema.index({ userId: 1, checkoutRequestId: 1 }, { unique: true })

const CodOrder = mongoose.models.CodOrder || mongoose.model("CodOrder", codOrderSchema)

const productSchema = new Schema({
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true, trim: true, maxlength: 200 },
    slug: { type: String, required: true, unique: true, trim: true, lowercase: true },
    aliases: { type: [String], default: [] },
    url: { type: String, default: "" },
    sku: { type: String, default: "" },
    priceMinor: { type: Number, required: true, min: 1 },
    currency: { type: String, default: "€" },
    image: { type: String, default: "" },
    hoverImage: { type: String, default: "" },
    gallery: { type: [String], default: [] },
    dimensions: { type: String, default: "" },
    categories: { type: [String], required: true },
    brand: { type: String, default: "" },
    colors: { type: [String], default: [] },
    options: { type: Schema.Types.Mixed, default: undefined },
    inStock: { type: Boolean, default: true },
    hasOptions: { type: Boolean, default: false },
    active: { type: Boolean, default: true }
}, { timestamps: true, strict: true })
productSchema.index({ active: 1, categories: 1 })

const Product = mongoose.models.Product || mongoose.model("Product", productSchema)

const customerActivitySchema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: "Account", required: true, index: true },
    kind: { type: String, enum: ["page_view", "product_view", "search"], required: true },
    path: { type: String, required: true, maxlength: 300 },
    query: { type: String, maxlength: 100, default: "" },
    durationSeconds: { type: Number, min: 0, max: 1800, default: 0 },
    productId: { type: String, default: "" },
    productName: { type: String, default: "" },
    productSlug: { type: String, default: "" },
    categories: { type: [String], default: [] },
    expiresAt: { type: Date, required: true, default: () => new Date(Date.now() + 180 * 24 * 60 * 60 * 1000) }
}, { timestamps: true })
customerActivitySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })
customerActivitySchema.index({ userId: 1, createdAt: -1 })
customerActivitySchema.index({ userId: 1, productId: 1, createdAt: -1 })

const CustomerActivity = mongoose.models.CustomerActivity ||
    mongoose.model("CustomerActivity", customerActivitySchema)

const newsletterSubscriptionSchema = new Schema({
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    status: { type: String, enum: ["pending", "confirmed"], default: "pending" },
    confirmationTokenHash: { type: String, select: false },
    confirmationExpiresAt: Date,
    confirmationEmailStatus: {
        type: String,
        enum: ["pending", "sent", "failed", "not_configured"],
        default: "pending"
    },
    confirmedAt: Date,
    couponCode: { type: String, unique: true, sparse: true },
    redeemedBy: { type: Schema.Types.ObjectId, ref: "Account", default: null },
    redeemedOrderNumber: { type: String, default: "" },
    redeemedAt: Date,
    couponEmailStatus: {
        type: String,
        enum: ["pending", "sending", "sent", "failed", "not_configured"],
        default: "pending"
    }
}, { timestamps: true })

const NewsletterSubscription = mongoose.models.NewsletterSubscription ||
    mongoose.model("NewsletterSubscription", newsletterSubscriptionSchema)

module.exports = {Contact,Order,TestPayment,Account,CodOrder,NewsletterSubscription,Product,CustomerActivity,mongoose,databaseReady}
