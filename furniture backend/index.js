require("dotenv").config()
const express = require('express')
const app = express()
const port = process.env.PORT||8000
const cors = require("cors")
const { Contact, TestPayment, Account, CodOrder, NewsletterSubscription, Product, CustomerActivity, mongoose, databaseReady } = require("./conn.js")
const bodyParser = require('body-parser')
const Stripe = require("stripe")
const nodemailer = require("nodemailer")
const { Resend } = require("resend")
const path = require("path")
const crypto = require("crypto")
const { promisify } = require("util")
const session = require("express-session")
const { MongoStore } = require("connect-mongo")
const { rateLimit } = require("express-rate-limit")
const sourceProducts = require(path.join(__dirname, "..", "furniture fronted", "public", "data", "new-in-products.json"))
const scrypt = promisify(crypto.scrypt)
const frontendUrl = (process.env.CLIENT_URL || "http://localhost:5173").replace(/\/$/, "")
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: { error: "TOO_MANY_AUTH_ATTEMPTS", message: "Too many sign-in attempts. Please wait and try again." }
})
const newsletterLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 5,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: { error: "TOO_MANY_NEWSLETTER_ATTEMPTS", message: "Too many newsletter requests. Please wait and try again." }
})
const passwordResetLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 5,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: { error: "TOO_MANY_PASSWORD_RESET_ATTEMPTS", message: "Too many password reset requests. Please wait and try again." }
})

if (process.env.NODE_ENV === "production") app.set("trust proxy", 1)
app.use(bodyParser.urlencoded({ extended: false }))
// parse application/json
app.use(bodyParser.json())
app.use(cors({ origin: frontendUrl, credentials: true }))
if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) {
    throw new Error("SESSION_SECRET must be set to a random value of at least 32 characters.")
}
app.use(session({
    name: "furniture.sid",
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl: process.env.URL,
        collectionName: "sessions"
    }),
    cookie: {
        httpOnly: true,
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
        secure: process.env.NODE_ENV === "production",
        maxAge: 7 * 24 * 60 * 60 * 1000
    }
}))

function publicAccount(account) {
    return {
        id: String(account._id),
        name: account.name,
        email: account.email,
        role: account.role || "customer",
        phone: account.phone || "",
        deliveryAddress: account.deliveryAddress || {},
        recommendationEmailsEnabled: account.recommendationEmailsEnabled !== false
    }
}

function toCodOrderResponse(order) {
    return {
        id: order.orderNumber,
        createdAt: order.createdAt,
        status: order.status,
        cancellationReason: order.cancellationReason || "",
        cancelledAt: order.cancelledAt || null,
        paymentMethod: "Cash on delivery",
        subtotal: (order.subtotal || order.total) / 100,
        discountAmount: (order.discountAmount || 0) / 100,
        couponCode: order.couponCode || "",
        total: order.total / 100,
        currency: order.currency.toUpperCase(),
        emailStatus: order.receiptEmailStatus,
        items: order.items.map(item => ({
            id: item.productId,
            name: item.name,
            image: item.image,
            price: item.unitAmount / 100,
            quantity: item.quantity
        })),
        delivery: {
            firstName: order.delivery.firstName,
            lastName: order.delivery.lastName,
            address: order.delivery.address,
            apartment: order.delivery.apartment,
            city: order.delivery.city,
            region: order.delivery.region,
            postalCode: order.delivery.postalCode,
            country: order.delivery.country
        }
    }
}

async function hashPassword(password) {
    const salt = crypto.randomBytes(16).toString("hex")
    const hash = await scrypt(password, salt, 64)
    return `${salt}:${hash.toString("hex")}`
}

async function verifyPassword(password, passwordHash) {
    const [salt, expectedHex] = (passwordHash || "").split(":")
    if (!salt || !expectedHex) return false
    const expected = Buffer.from(expectedHex, "hex")
    const actual = await scrypt(password, salt, expected.length)
    return expected.length === actual.length && crypto.timingSafeEqual(expected, actual)
}

function establishAccountSession(req, accountId) {
    return new Promise((resolve, reject) => {
        req.session.regenerate(error => {
            if (error) return reject(error)
            req.session.accountId = String(accountId)
            req.session.save(saveError => saveError ? reject(saveError) : resolve())
        })
    })
}

async function requireAccount(req, res, next) {
    try {
        if (!req.session.accountId) {
            return res.status(401).json({ error: "LOGIN_REQUIRED", message: "Log in to use this feature." })
        }
        const account = await Account.findById(req.session.accountId)
        if (!account) {
            req.session.destroy(() => {})
            return res.status(401).json({ error: "LOGIN_REQUIRED", message: "Log in to use this feature." })
        }
        req.account = account
        next()
    } catch (error) {
        next(error)
    }
}

function requireAdmin(req, res, next) {
    requireAccount(req, res, error => {
        if (error) return next(error)
        if (!req.account || req.account.role !== "admin") {
            return res.status(403).json({ error: "ADMIN_REQUIRED", message: "Administrator access is required." })
        }
        next()
    })
}

function requireFrontendOrigin(req, res, next) {
    if (req.get("origin") !== frontendUrl) {
        return res.status(403).json({ error: "INVALID_REQUEST_ORIGIN", message: "This request origin is not allowed." })
    }
    next()
}

app.post("/auth/register", requireFrontendOrigin, authLimiter, async (req, res, next) => {
    try {
        const name = typeof req.body?.name === "string" ? req.body.name.trim() : ""
        const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : ""
        const password = typeof req.body?.password === "string" ? req.body.password : ""
        if (!name || name.length > 100 || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
            password.length < 8 || password.length > 128) {
            return res.status(400).json({
                error: "INVALID_REGISTRATION",
                message: "Enter your name, a valid email, and a password between 8 and 128 characters."
            })
        }
        const account = await Account.create({ name, email, passwordHash: await hashPassword(password) })
        await establishAccountSession(req, account._id)
        res.status(201).json({ user: publicAccount(account) })
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({ error: "EMAIL_ALREADY_REGISTERED", message: "An account with this email already exists. Log in instead." })
        }
        next(error)
    }
})

app.post("/auth/login", requireFrontendOrigin, authLimiter, async (req, res, next) => {
    try {
        const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : ""
        const password = typeof req.body?.password === "string" ? req.body.password : ""
        if (email.length > 254 || password.length > 128) {
            return res.status(401).json({ error: "INVALID_CREDENTIALS", message: "Email or password is incorrect." })
        }
        const account = await Account.findOne({ email }).select("+passwordHash")
        if (!account || !await verifyPassword(password, account.passwordHash)) {
            return res.status(401).json({ error: "INVALID_CREDENTIALS", message: "Email or password is incorrect." })
        }
        await establishAccountSession(req, account._id)
        res.json({ user: publicAccount(account) })
    } catch (error) {
        next(error)
    }
})

app.post("/auth/password/forgot", requireFrontendOrigin, passwordResetLimiter, async (req, res, next) => {
    const genericResponse = {
        message: "If an account exists for that email, password reset instructions will be sent."
    }
    try {
        const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : ""
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
            return res.status(202).json(genericResponse)
        }

        const account = await Account.findOne({ email })
        if (!account) return res.status(202).json(genericResponse)

        const resetToken = crypto.randomBytes(32).toString("hex")
        const resetTokenHash = crypto.createHash("sha256").update(resetToken).digest("hex")
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000)
        account.passwordResetTokenHash = resetTokenHash
        account.passwordResetExpiresAt = expiresAt
        await account.save()

        const resetUrl = `${frontendUrl}/account/reset-password?token=${resetToken}`
        const emailResult = await sendNewsletterEmail({
            to: account.email,
            subject: "Reset your Skanvi account password",
            text: `A password reset was requested for your Skanvi account. Use this one-time link within 1 hour: ${resetUrl}\n\nIf you did not request this, ignore this email.`,
            html: `<div style="font-family:Arial,sans-serif;color:#292929;line-height:1.6"><h1>Reset your password</h1><p>A password reset was requested for your Skanvi account. This one-time link expires in 1 hour.</p><p><a href="${resetUrl}" style="display:inline-block;padding:12px 20px;background:#41665a;color:#fff5e9;text-decoration:none">Choose a new password</a></p><p>If you did not request this, ignore this email.</p></div>`
        })
        if (!emailResult.sent) {
            await Account.updateOne(
                { _id: account._id, passwordResetTokenHash: resetTokenHash },
                { $unset: { passwordResetTokenHash: 1, passwordResetExpiresAt: 1 } }
            )
            if (emailResult.reason === "failed") {
                console.error("Password reset email could not be delivered.")
            }
        }
        res.status(202).json(genericResponse)
    } catch (error) {
        next(error)
    }
})

app.post("/auth/password/reset", requireFrontendOrigin, passwordResetLimiter, async (req, res, next) => {
    try {
        const token = typeof req.body?.token === "string" ? req.body.token : ""
        const password = typeof req.body?.password === "string" ? req.body.password : ""
        if (!/^[0-9a-f]{64}$/i.test(token) || password.length < 8 || password.length > 128) {
            return res.status(400).json({
                error: "INVALID_PASSWORD_RESET",
                message: "This reset link is invalid or expired, or the new password does not meet the requirements."
            })
        }

        const passwordResetTokenHash = crypto.createHash("sha256").update(token).digest("hex")
        const passwordHash = await hashPassword(password)
        const account = await Account.findOneAndUpdate(
            {
                passwordResetTokenHash,
                passwordResetExpiresAt: { $gt: new Date() }
            },
            {
                $set: { passwordHash },
                $unset: { passwordResetTokenHash: 1, passwordResetExpiresAt: 1 }
            },
            { new: true }
        )
        if (!account) {
            return res.status(400).json({
                error: "INVALID_PASSWORD_RESET",
                message: "This reset link is invalid or expired. Request a new one."
            })
        }
        res.json({ message: "Password changed. You can now log in with your new password." })
    } catch (error) {
        next(error)
    }
})

app.get("/auth/me", requireAccount, (req, res) => {
    res.json({ user: publicAccount(req.account) })
})

app.get("/account/profile", requireAccount, (req, res) => {
    res.json({ profile: publicAccount(req.account) })
})

app.patch("/account/profile", requireFrontendOrigin, requireAccount, async (req, res, next) => {
    try {
        const name = typeof req.body?.name === "string" ? req.body.name.trim() : ""
        const phone = typeof req.body?.phone === "string" ? req.body.phone.trim() : ""
        const address = req.body?.deliveryAddress
        if (!name || name.length > 100 || phone.length > 30) {
            return res.status(400).json({ error: "INVALID_PROFILE", message: "Enter a name and a valid phone number." })
        }
        if (!address || typeof address !== "object" || Array.isArray(address)) {
            return res.status(400).json({ error: "INVALID_ADDRESS", message: "Enter your delivery address details." })
        }
        const fields = ["firstName", "lastName", "address", "city", "region", "postalCode"]
        if (fields.some(key => typeof address[key] !== "string" || address[key].trim().length > 200) ||
            (address.country && address.country !== "US") ||
            (typeof address.apartment === "string" && address.apartment.trim().length > 200)) {
            return res.status(400).json({ error: "INVALID_ADDRESS", message: "Check your delivery address fields." })
        }
        req.account.name = name
        req.account.phone = phone
        req.account.deliveryAddress = {
            firstName: address.firstName.trim(),
            lastName: address.lastName.trim(),
            country: address.country === "US" ? "US" : "",
            address: address.address.trim(),
            apartment: (address.apartment || "").trim(),
            city: address.city.trim(),
            region: address.region.trim(),
            postalCode: address.postalCode.trim()
        }
        await req.account.save()
        res.json({ profile: publicAccount(req.account) })
    } catch (error) {
        next(error)
    }
})

app.post("/auth/logout", requireFrontendOrigin, (req, res, next) => {
    req.session.destroy(error => {
        if (error) return next(error)
        res.clearCookie("furniture.sid", {
            httpOnly: true,
            sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
            secure: process.env.NODE_ENV === "production"
        })
        res.status(204).end()
    })
})

app.get("/account/orders", requireAccount, async (req, res, next) => {
    try {
        const orders = await CodOrder.find({ userId: req.account._id }).sort({ createdAt: -1 }).limit(100).lean()
        res.json({ orders: orders.map(toCodOrderResponse) })
    } catch (error) {
        next(error)
    }
})

app.post("/account/orders/:orderNumber/cancel", requireFrontendOrigin, requireAccount, async (req, res, next) => {
    try {
        const cancellationReason = typeof req.body?.reason === "string" ? req.body.reason.trim() : ""
        if (cancellationReason.length < 5 || cancellationReason.length > 500) {
            return res.status(400).json({
                error: "INVALID_CANCELLATION_REASON",
                message: "Please enter a cancellation reason between 5 and 500 characters."
            })
        }
        const order = await CodOrder.findOneAndUpdate(
            {
                orderNumber: req.params.orderNumber,
                userId: req.account._id,
                status: { $in: ["pending", "processing"] }
            },
            { $set: { status: "cancelled", cancellationReason, cancelledAt: new Date() } },
            { new: true, runValidators: true }
        )
        if (order) return res.json({ order: toCodOrderResponse(order) })

        const existingOrder = await CodOrder.findOne({
            orderNumber: req.params.orderNumber,
            userId: req.account._id
        }).select("status")
        if (!existingOrder) {
            return res.status(404).json({ error: "ORDER_NOT_FOUND", message: "That order could not be found in your account." })
        }
        return res.status(409).json({
            error: "ORDER_CANNOT_BE_CANCELLED",
            message: existingOrder.status === "shipped" || existingOrder.status === "delivered"
                ? "This order has already shipped and can no longer be cancelled online."
                : "This order has already been cancelled."
        })
    } catch (error) {
        next(error)
    }
})

app.get("/account/test-payments", requireAccount, async (req, res, next) => {
    try {
        const payments = await TestPayment.find({
            email: req.account.email.toLowerCase(),
            testOnly: true
        }).sort({ createdAt: -1 }).limit(100).lean()
        res.json({ payments: payments.map(toTestPaymentResponse) })
    } catch (error) {
        next(error)
    }
})

app.post("/account/activity", requireFrontendOrigin, requireAccount, async (req, res, next) => {
    try {
        const pathName = typeof req.body?.path === "string" ? req.body.path : ""
        const query = typeof req.body?.query === "string" ? req.body.query.trim().slice(0, 100) : ""
        const durationSeconds = Number(req.body?.durationSeconds)
        if (!pathName.startsWith("/") || pathName.length > 300 ||
            !Number.isInteger(durationSeconds) || durationSeconds < 0 || durationSeconds > 1800) {
            return res.status(400).json({ error: "INVALID_ACTIVITY", message: "The browsing activity data is invalid." })
        }

        let kind = query ? "search" : "page_view"
        let product = null
        const productRoute = pathName.match(/^\/produkt\/([^/]+)$/)
        if (productRoute) {
            const slug = decodeURIComponent(productRoute[1])
            product = await Product.findOne({
                active: true,
                $or: [{ slug }, { aliases: slug }, { id: slug }]
            }).select("id name slug categories").lean()
            if (product) kind = "product_view"
        }
        await CustomerActivity.create({
            userId: req.account._id,
            kind,
            path: pathName,
            query,
            durationSeconds,
            productId: product?.id || "",
            productName: product?.name || "",
            productSlug: product?.slug || "",
            categories: product?.categories || []
        })
        res.status(201).json({ saved: true })
    } catch (error) {
        next(error)
    }
})

app.get("/account/recommendations", requireAccount, async (req, res, next) => {
    try {
        const viewedProducts = await CustomerActivity.aggregate([
            {
                $match: {
                    userId: req.account._id,
                    kind: "product_view",
                    createdAt: { $gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) },
                    productId: { $ne: "" }
                }
            },
            {
                $group: {
                    _id: "$productId",
                    name: { $last: "$productName" },
                    durationSeconds: { $sum: "$durationSeconds" },
                    views: { $sum: 1 },
                    lastViewedAt: { $max: "$createdAt" }
                }
            },
            { $sort: { durationSeconds: -1, views: -1, lastViewedAt: -1 } },
            { $limit: 10 }
        ])
        const viewedIds = viewedProducts.map(item => item._id)
        const viewedCatalogProducts = viewedIds.length
            ? await Product.find({ id: { $in: viewedIds } }, { categories: 1 }).lean()
            : []
        const categories = [...new Set(viewedCatalogProducts.flatMap(product => product.categories || []))]
        const recommendations = categories.length
            ? await Product.find({
                active: true,
                inStock: true,
                categories: { $in: categories },
                id: { $nin: viewedIds }
            }).sort({ updatedAt: -1 }).limit(8).lean()
            : []

        let recommendationEmailStatus = "not_sent"
        if (recommendations.length > 0 && req.account.recommendationEmailsEnabled !== false) {
            const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
            const claim = await Account.findOneAndUpdate(
                {
                    _id: req.account._id,
                    $or: [
                        { lastRecommendationEmailAttemptAt: { $exists: false } },
                        { lastRecommendationEmailAttemptAt: { $lt: weekAgo } }
                    ]
                },
                { $set: { lastRecommendationEmailAttemptAt: new Date() } },
                { new: true }
            )
            if (claim) {
                const productLines = recommendations.slice(0, 5).map(product =>
                    `${product.name}: ${frontendUrl}/produkt/${encodeURIComponent(product.slug)}`)
                const productList = recommendations.slice(0, 5).map(product =>
                    `<li><a href="${frontendUrl}/produkt/${encodeURIComponent(product.slug)}">${escapeHtml(product.name)}</a></li>`).join("")
                const emailResult = await sendNewsletterEmail({
                    to: req.account.email,
                    subject: "Furniture picks inspired by your recent browsing",
                    text: ["A few in-stock products related to what you recently viewed:", "", ...productLines, "", "You can manage your account at " + frontendUrl + "/account"].join("\n"),
                    html: `<div style="font-family:Arial,sans-serif;color:#292929;line-height:1.6"><h1>Picked for you</h1><p>These in-stock products are related to items you recently viewed:</p><ul>${productList}</ul><p><a href="${frontendUrl}/account">Visit your account</a></p></div>`
                })
                recommendationEmailStatus = emailResult.sent ? "sent" : emailResult.reason
                if (emailResult.sent) {
                    await Account.updateOne(
                        { _id: req.account._id, lastRecommendationEmailAttemptAt: claim.lastRecommendationEmailAttemptAt },
                        { $set: { lastRecommendationEmailSentAt: new Date() } }
                    )
                } else if (emailResult.reason === "failed") {
                    console.error("Personalized recommendation email could not be delivered.")
                }
            } else {
                recommendationEmailStatus = "weekly_limit"
            }
        }

        res.json({
            recommendations: recommendations.map(toPublicProduct),
            recommendationEmailStatus,
            basedOnCategories: categories
        })
    } catch (error) {
        next(error)
    }
})

app.patch("/account/recommendations/preferences", requireFrontendOrigin, requireAccount, async (req, res, next) => {
    try {
        if (typeof req.body?.enabled !== "boolean") {
            return res.status(400).json({ error: "INVALID_PREFERENCE", message: "Choose whether recommendation emails are enabled." })
        }
        req.account.recommendationEmailsEnabled = req.body.enabled
        await req.account.save()
        res.json({ enabled: req.account.recommendationEmailsEnabled })
    } catch (error) {
        next(error)
    }
})

app.post("/newsletter/subscribe", requireFrontendOrigin, newsletterLimiter, async (req, res, next) => {
    try {
        const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : ""
        if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.status(400).json({ error: "INVALID_EMAIL", message: "Enter a valid email address." })
        }

        const confirmationToken = crypto.randomBytes(32).toString("hex")
        const confirmationTokenHash = crypto.createHash("sha256").update(confirmationToken).digest("hex")
        const confirmationExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)
        let subscription
        try {
            subscription = await NewsletterSubscription.findOneAndUpdate(
                { email, status: "pending" },
                { $set: { confirmationTokenHash, confirmationExpiresAt, confirmationEmailStatus: "pending" } },
                { new: true, upsert: true, setDefaultsOnInsert: true }
            )
        } catch (error) {
            if (error.code !== 11000) throw error
            subscription = await NewsletterSubscription.findOne({ email }).select("+confirmationTokenHash")
            if (subscription?.status === "confirmed") {
                return res.json({ message: "This email is already subscribed." })
            }
            if (!subscription) throw error
            subscription.confirmationTokenHash = confirmationTokenHash
            subscription.confirmationExpiresAt = confirmationExpiresAt
            subscription.confirmationEmailStatus = "pending"
            await subscription.save()
        }

        if (subscription.status === "confirmed") {
            return res.json({ message: "This email is already subscribed." })
        }

        const confirmationUrl = `${frontendUrl}/newsletter/confirm?token=${confirmationToken}`
        const emailResult = await sendNewsletterEmail({
            to: email,
            subject: "Confirm your Skanvi newsletter subscription",
            text: [
                "Please confirm your Skanvi newsletter subscription.",
                "",
                `Confirm your email within 24 hours: ${confirmationUrl}`,
                "",
                "After confirmation, we will email your personal 15% first-order coupon."
            ].join("\n"),
            html: `<div style="font-family:Arial,sans-serif;color:#292929;line-height:1.6"><h1>Confirm your subscription</h1><p>Please confirm your Skanvi newsletter subscription within 24 hours. After confirmation, we will email your personal 15% first-order coupon.</p><p><a href="${confirmationUrl}" style="display:inline-block;padding:12px 20px;background:#41665a;color:#fff5e9;text-decoration:none">Confirm email</a></p><p>If you did not request this, you can ignore this email.</p></div>`
        })
        await NewsletterSubscription.updateOne(
            { _id: subscription._id, confirmationTokenHash },
            { $set: { confirmationEmailStatus: emailResult.sent ? "sent" : emailResult.reason } }
        )
        if (!emailResult.sent) {
            return res.status(503).json({
                error: emailResult.reason === "not_configured" ? "NEWSLETTER_EMAIL_NOT_CONFIGURED" : "NEWSLETTER_EMAIL_FAILED",
                message: emailResult.reason === "not_configured"
                    ? "Newsletter email is not configured yet. Please try again later."
                    : "We could not send the confirmation email. Please try again."
            })
        }

        res.status(202).json({ message: "Check your inbox to confirm your subscription. The confirmation link expires in 24 hours." })
    } catch (error) {
        next(error)
    }
})

app.post("/newsletter/confirm", requireFrontendOrigin, newsletterLimiter, async (req, res, next) => {
    try {
        const token = typeof req.body?.token === "string" ? req.body.token : ""
        if (!/^[0-9a-f]{64}$/i.test(token)) {
            return res.status(400).json({ error: "INVALID_CONFIRMATION_TOKEN", message: "This confirmation link is invalid or expired." })
        }
        const confirmationTokenHash = crypto.createHash("sha256").update(token).digest("hex")
        let subscription = await NewsletterSubscription.findOne({
            confirmationTokenHash,
            confirmationExpiresAt: { $gt: new Date() }
        }).select("+confirmationTokenHash")
        if (!subscription) {
            return res.status(400).json({ error: "INVALID_CONFIRMATION_TOKEN", message: "This confirmation link is invalid or expired. Please sign up again." })
        }

        if (subscription.status === "pending") {
            const couponCode = `SKANVI-${crypto.randomBytes(5).toString("hex").toUpperCase()}`
            subscription = await NewsletterSubscription.findOneAndUpdate(
                { _id: subscription._id, status: "pending" },
                { $set: { status: "confirmed", confirmedAt: new Date(), couponCode, couponEmailStatus: "pending" } },
                { new: true }
            ) || await NewsletterSubscription.findById(subscription._id).select("+confirmationTokenHash")
        }
        if (!subscription) {
            return res.status(404).json({ error: "SUBSCRIPTION_NOT_FOUND", message: "This newsletter subscription could not be found." })
        }
        if (subscription.couponEmailStatus === "sent") {
            return res.json({ message: "Your email is confirmed and your 15% coupon has been emailed.", emailStatus: "sent" })
        }

        const claimed = await NewsletterSubscription.findOneAndUpdate(
            { _id: subscription._id, couponEmailStatus: { $in: ["pending", "failed", "not_configured"] } },
            { $set: { couponEmailStatus: "sending" } },
            { new: true }
        )
        if (!claimed) {
            return res.status(202).json({ message: "Your email is confirmed. Your coupon email is being sent.", emailStatus: "sending" })
        }

        const emailResult = await sendNewsletterEmail({
            to: claimed.email,
            subject: "Your personal 15% Skanvi welcome coupon",
            text: [
                "Thanks for confirming your Skanvi newsletter subscription.",
                "",
                "Your personal 15% first-order coupon is:",
                claimed.couponCode,
                "",
                "Keep this code for your first order."
            ].join("\n"),
            html: `<div style="font-family:Arial,sans-serif;color:#292929;line-height:1.6"><h1>Your 15% welcome coupon</h1><p>Thanks for confirming your Skanvi newsletter subscription.</p><p>Your personal first-order coupon:</p><p style="display:inline-block;padding:12px 18px;background:#edf3ee;color:#315b4e;font-size:20px;font-weight:bold;letter-spacing:.08em">${escapeHtml(claimed.couponCode)}</p><p>Keep this code for your first order.</p></div>`
        })
        const nextEmailStatus = emailResult.sent ? "sent" : emailResult.reason
        const update = { couponEmailStatus: nextEmailStatus }
        if (emailResult.sent) {
            await NewsletterSubscription.findByIdAndUpdate(claimed._id, {
                $set: update,
                $unset: { confirmationTokenHash: 1, confirmationExpiresAt: 1 }
            })
        } else {
            await NewsletterSubscription.findByIdAndUpdate(claimed._id, { $set: update })
        }
        if (!emailResult.sent) {
            return res.status(503).json({
                error: emailResult.reason === "not_configured" ? "NEWSLETTER_EMAIL_NOT_CONFIGURED" : "NEWSLETTER_EMAIL_FAILED",
                message: emailResult.reason === "not_configured"
                    ? "Your email is confirmed, but coupon email is not configured yet. Try again later."
                    : "Your email is confirmed, but we could not send the coupon. Please try again."
            })
        }
        res.json({ message: "Your email is confirmed and your 15% coupon has been emailed.", emailStatus: "sent" })
    } catch (error) {
        next(error)
    }
})
//
app.get('/shop/alldata', (req, res) => {
    let data = [{
        id: 1,
        productImage: "images/product-3.png",
        productName: "Ergonomic Chair",
        productPrice: 100,
        pQuantity: 1
    }, {
        id: 2,
        productImage: "images/product-1.png",
        productName: "Nordic Chair",
        productPrice: 50.00,
        pQuantity: 1
    }, {
        id: 3,
        productImage: "images/product-2.png",
        productName: "Kruzo Aero Chair",
        productPrice: 78.00,
        pQuantity: 1
    }, {
        id: 4,
        productImage: "images/product-3.png",
        productName: "Ergonomic Chair",
        productPrice: 43.00,
        pQuantity: 1
    }, {
        id: 5,
        productImage: "images/product-3.png",
        productName: "Nordic Chair",
        productPrice: 50.00,
        pQuantity: 1
    }, {
        id: 6,
        productImage: "images/product-1.png",
        productName: "Nordic Chair",
        productPrice: 50.00,
        pQuantity: 1
    }, {
        id: 7,
        productImage: "images/product-2.png",
        productName: "Kruzo Aero Chair",
        productPrice: 78.00,
        pQuantity: 1
    }, {
        id: 8,
        productImage: "images/product-3.png",
        productName: "Ergonomic Chair",
        productPrice: 43.00,
        pQuantity: 1
    }]
    res.json({ data: data })
})

app.get('/about/teams', (req, res) => {
    let data = [{ image: "images/person_1.jpg", name: "Lawson Arnold", postion: "CEO, Founder, Atty", description: " Separated they live in. Separated they live in Bookmarksgrov", more: "Learn More" }, { image: "images/person_2.jpg", name: "Jeremy Walker ", postion: "CEO, Founder, Atty", description: " Separated they live in. Separated they live in Bookmarksgrov", more: "Learn More" }, { image: "images/person_3.jpg", name: "Patrik White", postion: "CEO, Founder, Atty", description: " Separated they live in. Separated they live in Bookmarksgrov", more: "Learn More" }, { image: "images/person_4.jpg", name: "Kathryn Ryan", postion: "CEO, Founder, Atty", description: " Separated they live in. Separated they live in Bookmarksgrov", more: "Learn More" }]
    res.json({ data: data })
})

app.post('/contact/insert', async (req, res) => {
    let data = req.body;
    console.log(data);
    const newContact = await Contact.create(data)
    const ContactData = await newContact.save()
    res.json({ data: "", message: "Data inserted successfully" })
})

function getStripeTestClient(res) {
    const secretKey = process.env.STRIPE_SECRET_KEY
    if (!secretKey || !secretKey.startsWith("sk_test_")) {
        res.status(503).json({
            error: "STRIPE_TEST_MODE_NOT_CONFIGURED",
            message: "Stripe test mode is not configured. No payment or order was created."
        })
        return null
    }
    return new Stripe(secretKey)
}

async function resolveCartItems(items) {
    if (!Array.isArray(items) || items.length === 0 || items.length > 50) {
        return { error: { status: 400, code: "INVALID_CART", message: "Your shopping bag is empty or invalid." } }
    }

    return Product.find({ id: { $in: items.map(item => String(item?.id)) }, active: true })
        .lean()
        .then(catalogProducts => {
    const catalog = new Map(catalogProducts.map(product => [String(product.id), product]))
    const resolvedItems = []
    for (const item of items) {
        if (!item || typeof item !== "object") {
            return { error: { status: 400, code: "INVALID_CART_ITEM", message: "A product or quantity in your bag is unavailable." } }
        }
        const product = catalog.get(String(item.id))
        const quantity = Number(item.pQuantity)
        if (!product || product.inStock === false || !Number.isInteger(quantity) || quantity < 1 || quantity > 10 ||
            !Number.isInteger(product.priceMinor) || product.priceMinor < 1) {
            return { error: { status: 400, code: "INVALID_CART_ITEM", message: "A product or quantity in your bag is unavailable." } }
        }
        resolvedItems.push({
            id: String(product.id),
            name: product.name,
            image: product.image,
            unitAmount: product.priceMinor,
            quantity
        })
    }

    const amountTotal = resolvedItems.reduce((total, item) => total + item.unitAmount * item.quantity, 0)
    if (!Number.isSafeInteger(amountTotal) || amountTotal < 1 || amountTotal > 999999999) {
        return { error: { status: 400, code: "INVALID_CART_TOTAL", message: "The shopping bag total is outside the supported payment range." } }
    }
    return { items: resolvedItems, amountTotal }
        })
}

async function getEligibleCoupon(account, rawCode, subtotal) {
    const code = typeof rawCode === "string" ? rawCode.trim().toUpperCase() : ""
    if (!code) return { error: { status: 400, code: "COUPON_REQUIRED", message: "Enter your coupon code." } }
    const orderCount = await CodOrder.countDocuments({ userId: account._id })
    if (orderCount > 0) {
        return { error: { status: 400, code: "FIRST_ORDER_ONLY", message: "This welcome coupon is valid on your first COD order only." } }
    }
    const subscription = await NewsletterSubscription.findOne({
        email: account.email,
        couponCode: code,
        status: "confirmed",
        redeemedAt: null
    })
    if (!subscription) {
        return { error: { status: 400, code: "COUPON_INVALID", message: "That coupon is invalid, already used, or does not belong to this account email." } }
    }
    const discountAmount = Math.floor(subtotal * 15 / 100)
    return {
        subscription,
        code,
        discountAmount,
        total: subtotal - discountAmount
    }
}

function toPublicProduct(product) {
    const { _id, __v, active, createdAt, updatedAt, ...fields } = product
    return { ...fields, active }
}

function normalizeProductInput(input, existingId) {
    const product = input && typeof input === "object" && !Array.isArray(input) ? input : {}
    const name = typeof product.name === "string" ? product.name.trim() : ""
    const slug = typeof product.slug === "string"
        ? product.slug.trim().toLowerCase()
        : name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
    const categories = Array.isArray(product.categories)
        ? [...new Set(product.categories.map(category => typeof category === "string" ? category.trim() : ""))]
            .filter(Boolean)
        : []
    const priceMinor = Number(product.priceMinor)
    const validImage = value => typeof value === "string" && value.length <= 2000 &&
        (value.startsWith("/") || /^https?:\/\/\S+$/i.test(value))
    if (!name || name.length > 200 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 200 ||
        !Number.isSafeInteger(priceMinor) || priceMinor < 1 || priceMinor > 999999999 ||
        !validImage(product.image) || categories.length === 0 || categories.length > 20 ||
        categories.some(category => category.length > 80)) {
        return { error: "Product needs a name, URL-safe slug, price in cents, image URL and at least one category." }
    }
    const stringList = value => Array.isArray(value)
        ? [...new Set(value.filter(item => typeof item === "string").map(item => item.trim()).filter(Boolean))].slice(0, 30)
        : []
    const gallery = stringList(product.gallery)
    if (!gallery.every(validImage) || (product.hoverImage && !validImage(product.hoverImage))) {
        return { error: "Product gallery images must use a valid HTTP(S) URL or a local absolute path." }
    }
    return {
        value: {
            ...(existingId ? { id: existingId } : { id: String(product.id || crypto.randomUUID()) }),
            name,
            slug,
            aliases: stringList(product.aliases),
            url: typeof product.url === "string" && /^https?:\/\/\S+$/i.test(product.url) ? product.url : "",
            sku: typeof product.sku === "string" ? product.sku.trim().slice(0, 100) : "",
            priceMinor,
            currency: "€",
            image: product.image.trim(),
            hoverImage: product.hoverImage || "",
            gallery,
            dimensions: typeof product.dimensions === "string" ? product.dimensions.trim().slice(0, 200) : "",
            categories,
            brand: typeof product.brand === "string" ? product.brand.trim().slice(0, 100) : "",
            colors: stringList(product.colors),
            options: product.options && typeof product.options === "object" && !Array.isArray(product.options) ? product.options : undefined,
            inStock: product.inStock !== false,
            hasOptions: product.hasOptions === true,
            active: product.active !== false
        }
    }
}

async function seedCatalogIfEmpty() {
    const sourceCatalog = sourceProducts.map(product => ({
        ...product,
        id: String(product.id),
        active: true
    }))
    const existingProducts = await Product.find(
        { id: { $in: sourceCatalog.map(product => product.id) } },
        { id: 1, _id: 0 }
    ).lean()
    const existingIds = new Set(existingProducts.map(product => product.id))
    const missingProducts = sourceCatalog.filter(product => !existingIds.has(product.id))
    if (missingProducts.length === 0) return

    await Product.insertMany(missingProducts, { ordered: false })
    console.log(`Restored ${missingProducts.length} missing products from the bundled catalog.`)
}

app.get("/catalog/products", async (req, res, next) => {
    try {
        const products = await Product.find({ active: true }).sort({ name: 1 }).lean()
        res.json(products.map(toPublicProduct))
    } catch (error) {
        next(error)
    }
})

app.get("/admin/orders", requireAdmin, async (req, res, next) => {
    try {
        const orders = await CodOrder.find().sort({ createdAt: -1 }).limit(250).lean()
        res.json({ orders: orders.map(order => ({
            ...toCodOrderResponse(order),
            customer: order.customer,
            delivery: order.delivery,
            notes: order.notes || "",
            cancellationReason: order.cancellationReason || "",
            cancelledAt: order.cancelledAt || null,
            subtotal: order.subtotal / 100,
            discountAmount: (order.discountAmount || 0) / 100,
            couponCode: order.couponCode || ""
        })) })
    } catch (error) {
        next(error)
    }
})

app.get("/admin/customers", requireAdmin, async (req, res, next) => {
    try {
        const activityCutoff = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000)
        const [totalUsers, accounts, activitySummaries, productSummaries, orderSummaries] = await Promise.all([
            Account.countDocuments({ role: "customer" }),
            Account.find({ role: "customer" })
                .select("name email createdAt")
                .sort({ createdAt: -1 })
                .limit(500)
                .lean(),
            CustomerActivity.aggregate([
                { $match: { createdAt: { $gte: activityCutoff } } },
                { $sort: { createdAt: -1 } },
                {
                    $group: {
                        _id: "$userId",
                        lastActivityAt: { $max: "$createdAt" },
                        totalTrackedSeconds: { $sum: "$durationSeconds" },
                        activityCount: { $sum: 1 },
                        recentActivities: {
                            $push: {
                                kind: "$kind",
                                path: "$path",
                                query: "$query",
                                durationSeconds: "$durationSeconds",
                                productName: "$productName",
                                createdAt: "$createdAt"
                            }
                        }
                    }
                },
                {
                    $project: {
                        lastActivityAt: 1,
                        totalTrackedSeconds: 1,
                        activityCount: 1,
                        recentActivities: { $slice: ["$recentActivities", 8] }
                    }
                }
            ]),
            CustomerActivity.aggregate([
                {
                    $match: {
                        kind: "product_view",
                        createdAt: { $gte: activityCutoff },
                        productId: { $ne: "" }
                    }
                },
                { $group: { _id: { userId: "$userId", productId: "$productId", name: "$productName" }, views: { $sum: 1 } } },
                { $sort: { "_id.userId": 1, views: -1 } },
                {
                    $group: {
                        _id: "$_id.userId",
                        topProducts: { $push: { id: "$_id.productId", name: "$_id.name", views: "$views" } }
                    }
                },
                { $project: { topProducts: { $slice: ["$topProducts", 5] } } }
            ]),
            CodOrder.aggregate([
                { $group: { _id: "$userId", orderCount: { $sum: 1 }, totalSpentMinor: { $sum: "$total" } } }
            ])
        ])
        const activityByUser = new Map(activitySummaries.map(item => [String(item._id), item]))
        const productsByUser = new Map(productSummaries.map(item => [String(item._id), item.topProducts]))
        const ordersByUser = new Map(orderSummaries.map(item => [String(item._id), item]))
        res.json({
            totalUsers,
            customers: accounts.map(account => {
                const id = String(account._id)
                const activity = activityByUser.get(id)
                const orders = ordersByUser.get(id)
                return {
                    id,
                    name: account.name,
                    email: account.email,
                    createdAt: account.createdAt,
                    orderCount: orders?.orderCount || 0,
                    totalSpent: (orders?.totalSpentMinor || 0) / 100,
                    lastActivityAt: activity?.lastActivityAt || null,
                    trackedMinutes: Math.round((activity?.totalTrackedSeconds || 0) / 60),
                    activityCount: activity?.activityCount || 0,
                    topProducts: productsByUser.get(id) || [],
                    recentActivities: activity?.recentActivities || []
                }
            })
        })
    } catch (error) {
        next(error)
    }
})

app.patch("/admin/orders/:orderNumber", requireFrontendOrigin, requireAdmin, async (req, res, next) => {
    try {
        const statuses = ["pending", "processing", "shipped", "delivered", "cancelled"]
        const status = typeof req.body?.status === "string" ? req.body.status : ""
        if (!statuses.includes(status)) {
            return res.status(400).json({ error: "INVALID_ORDER_STATUS", message: "Choose a supported order status." })
        }
        const order = await CodOrder.findOneAndUpdate(
            { orderNumber: req.params.orderNumber },
            { $set: { status } },
            { new: true, runValidators: true }
        )
        if (!order) return res.status(404).json({ error: "ORDER_NOT_FOUND", message: "Order not found." })
        res.json({ order: toCodOrderResponse(order) })
    } catch (error) {
        next(error)
    }
})

app.get("/admin/products", requireAdmin, async (req, res, next) => {
    try {
        const products = await Product.find().sort({ name: 1 }).lean()
        res.json(products.map(toPublicProduct))
    } catch (error) {
        next(error)
    }
})

app.get("/admin/catalog/categories", requireAdmin, async (req, res, next) => {
    try {
        const categories = await Product.distinct("categories")
        res.json({ categories: categories.sort((left, right) => left.localeCompare(right)) })
    } catch (error) {
        next(error)
    }
})

app.post("/admin/products", requireFrontendOrigin, requireAdmin, async (req, res, next) => {
    try {
        const normalized = normalizeProductInput(req.body)
        if (normalized.error) return res.status(400).json({ error: "INVALID_PRODUCT", message: normalized.error })
        const product = await Product.create(normalized.value)
        res.status(201).json({ product: toPublicProduct(product.toObject()) })
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({ error: "PRODUCT_ALREADY_EXISTS", message: "A product with this ID or slug already exists." })
        }
        next(error)
    }
})

app.put("/admin/products/:id", requireFrontendOrigin, requireAdmin, async (req, res, next) => {
    try {
        const existing = await Product.findOne({ id: req.params.id })
        if (!existing) return res.status(404).json({ error: "PRODUCT_NOT_FOUND", message: "Product not found." })
        const normalized = normalizeProductInput({ ...req.body, active: req.body?.active !== false }, existing.id)
        if (normalized.error) return res.status(400).json({ error: "INVALID_PRODUCT", message: normalized.error })
        const product = await Product.findOneAndUpdate(
            { id: existing.id },
            { $set: normalized.value },
            { new: true, runValidators: true }
        )
        res.json({ product: toPublicProduct(product.toObject()) })
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({ error: "PRODUCT_ALREADY_EXISTS", message: "A product with this slug already exists." })
        }
        next(error)
    }
})

app.patch("/admin/products/:id/status", requireFrontendOrigin, requireAdmin, async (req, res, next) => {
    try {
        if (typeof req.body?.active !== "boolean") {
            return res.status(400).json({ error: "INVALID_PRODUCT_STATUS", message: "Product status must be active or inactive." })
        }
        const product = await Product.findOneAndUpdate(
            { id: req.params.id },
            { $set: { active: req.body.active } },
            { new: true }
        )
        if (!product) return res.status(404).json({ error: "PRODUCT_NOT_FOUND", message: "Product not found." })
        res.json({ product: toPublicProduct(product.toObject()) })
    } catch (error) {
        next(error)
    }
})

app.get("/admin/coupons", requireAdmin, async (req, res, next) => {
    try {
        const subscriptions = await NewsletterSubscription.find({ couponCode: { $exists: true } })
            .select("email status couponCode couponEmailStatus redeemedOrderNumber redeemedAt confirmedAt createdAt")
            .sort({ createdAt: -1 })
            .limit(500)
            .lean()
        res.json({ coupons: subscriptions })
    } catch (error) {
        next(error)
    }
})
function getSmtpConfig() {
    const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM } = process.env

    const host = (SMTP_HOST || "").trim()
    const user = (SMTP_USER || "").trim()
    const pass = (SMTP_PASS || "").trim()
    const configuredFrom = (SMTP_FROM || "").trim()
    const port = Number(SMTP_PORT)

    if (!host || !user || !pass) return null
    if (!Number.isInteger(port) || port < 1 || port > 65535) return null

    const from = configuredFrom && /<.*@.*\..+>/.test(configuredFrom) || /.+@.+\..+/.test(configuredFrom)
        ? configuredFrom
        : user

    return { host, port, user, pass, from }
}

function getResendClient() {
    const apiKey = (process.env.RESEND_API_KEY || "").trim()

    if (!apiKey) return null

    return new Resend(apiKey)
}

function getResendFrom() {
    return (process.env.RESEND_FROM || "onboarding@resend.dev").trim()
}

function isProductionEmailMode() {
    return process.env.NODE_ENV === "production"
}

function escapeHtml(value) {
    return String(value || "").replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[character])
}

async function sendEmail({ to, subject, text, html, smtpFrom }) {
    /*
     * LIVE / RENDER
     * Use Resend HTTP API.
     */
    if (isProductionEmailMode()) {
        const resend = getResendClient()

        if (!resend) {
            return {
                sent: false,
                reason: "not_configured"
            }
        }

        try {
            const result = await resend.emails.send({
                from: getResendFrom(),
                to,
                subject,
                text,
                html
            })

            if (result?.error) {
                console.error(
                    "Resend email failed:",
                    result.error.message || result.error
                )

                return {
                    sent: false,
                    reason: "failed"
                }
            }

            return {
                sent: true
            }
        } catch (error) {
            console.error(
                "Resend email failed:",
                error?.message || error?.name || "RESEND_ERROR"
            )

            return {
                sent: false,
                reason: "failed"
            }
        }
    }

    /*
     * LOCAL DEVELOPMENT
     * Keep existing Gmail SMTP / Nodemailer.
     */
    const config = getSmtpConfig()

    if (!config) {
        return {
            sent: false,
            reason: "not_configured"
        }
    }

    const transporter = nodemailer.createTransport({
        host: config.host,
        port: config.port,
        secure: process.env.SMTP_SECURE === "true" || config.port === 465,
        auth: {
            user: config.user,
            pass: config.pass
        },
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 15000
    })

    try {
        await transporter.sendMail({
            from: smtpFrom || config.from,
            to,
            subject,
            text,
            html
        })

        return {
            sent: true
        }
    } catch (error) {
        console.error(
            "SMTP email failed:",
            error?.code || error?.name || "SMTP_ERROR"
        )

        return {
            sent: false,
            reason: "failed"
        }
    } finally {
        transporter.close()
    }
}

async function sendCodOrderConfirmation(order) {
    const items = order.items.map(item =>
        `${item.name} × ${item.quantity} — ${(item.unitAmount * item.quantity / 100).toFixed(2)} EUR`
    )

    const text = [
        `Order ${order.orderNumber} confirmed`,
        "",
        `Hello ${order.customer.name},`,
        "Your order has been received. Please pay the courier in cash when it is delivered.",
        "",
        "Items:",
        ...items,
        "",
        `Total due on delivery: ${(order.total / 100).toFixed(2)} EUR`
    ].join("\n")

    const html = `<div style="font-family:Arial,sans-serif;color:#292929;line-height:1.6"><h1>Order received</h1><p>Hello ${escapeHtml(order.customer.name)},</p><p>Your order has been received. Please pay the courier in cash when it is delivered.</p><p><strong>Order:</strong> ${escapeHtml(order.orderNumber)}<br><strong>Total due on delivery:</strong> ${(order.total / 100).toFixed(2)} EUR</p><h2>Items</h2><ul>${order.items.map(item => `<li>${escapeHtml(item.name)} × ${item.quantity} — ${(item.unitAmount * item.quantity / 100).toFixed(2)} EUR</li>`).join("")}</ul></div>`

    const emailResult = await sendEmail({
        to: order.customer.email,
        subject: `Order ${order.orderNumber} confirmed — cash on delivery`,
        text,
        html
    })

    if (emailResult.sent) {
        return CodOrder.findByIdAndUpdate(
            order._id,
            {
                $set: {
                    receiptEmailStatus: "sent",
                    receiptEmailSentAt: new Date()
                }
            },
            { new: true }
        )
    }

    return CodOrder.findByIdAndUpdate(
        order._id,
        {
            $set: {
                receiptEmailStatus: emailResult.reason
            }
        },
        { new: true }
    )
}

async function sendNewsletterEmail({ to, subject, text, html }) {
    return sendEmail({
        to,
        subject,
        text,
        html
    })
}
function getSmtpConfig() {
    const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM } = process.env
    const host = (SMTP_HOST || "").trim()
    const user = (SMTP_USER || "").trim()
    const pass = (SMTP_PASS || "").trim()
    const configuredFrom = (SMTP_FROM || "").trim()
    const port = Number(SMTP_PORT)

    if (!host || !user || !pass) return null
    if (!Number.isInteger(port) || port < 1 || port > 65535) return null

    const from = configuredFrom && /<.*@.*\..+>/.test(configuredFrom) || /.+@.+\..+/.test(configuredFrom)
        ? configuredFrom
        : user

    return { host, port, user, pass, from }
}

function escapeHtml(value) {
    return String(value || "").replace(/[&<>"']/g, character => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[character])
}

async function sendCodOrderConfirmation(order) {
    const config = getSmtpConfig()
    if (!config) {
        return CodOrder.findByIdAndUpdate(
            order._id,
            { $set: { receiptEmailStatus: "not_configured" } },
            { new: true }
        )
    }

    const transporter = nodemailer.createTransport({
        host: config.host,
        port: config.port,
        secure: process.env.SMTP_SECURE === "true" || config.port === 465,
        auth: { user: config.user, pass: config.pass },
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 15000
    })
    const items = order.items.map(item =>
        `${item.name} × ${item.quantity} — ${(item.unitAmount * item.quantity / 100).toFixed(2)} EUR`)
    const text = [
        `Order ${order.orderNumber} confirmed`,
        "",
        `Hello ${order.customer.name},`,
        "Your order has been received. Please pay the courier in cash when it is delivered.",
        "",
        "Items:",
        ...items,
        "",
        `Total due on delivery: ${(order.total / 100).toFixed(2)} EUR`
    ].join("\n")
    const html = `<div style="font-family:Arial,sans-serif;color:#292929;line-height:1.6"><h1>Order received</h1><p>Hello ${escapeHtml(order.customer.name)},</p><p>Your order has been received. Please pay the courier in cash when it is delivered.</p><p><strong>Order:</strong> ${escapeHtml(order.orderNumber)}<br><strong>Total due on delivery:</strong> ${(order.total / 100).toFixed(2)} EUR</p><h2>Items</h2><ul>${order.items.map(item => `<li>${escapeHtml(item.name)} × ${item.quantity} — ${(item.unitAmount * item.quantity / 100).toFixed(2)} EUR</li>`).join("")}</ul></div>`

    try {
        await transporter.sendMail({
            from: config.from,
            to: order.customer.email,
            subject: `Order ${order.orderNumber} confirmed — cash on delivery`,
            text,
            html
        })
        return CodOrder.findByIdAndUpdate(
            order._id,
            { $set: { receiptEmailStatus: "sent", receiptEmailSentAt: new Date() } },
            { new: true }
        )
    } catch (error) {
        console.error("COD order confirmation email failed:", error.code || error.name || "SMTP_ERROR")
        return CodOrder.findByIdAndUpdate(
            order._id,
            { $set: { receiptEmailStatus: "failed" } },
            { new: true }
        )
    } finally {
        transporter.close()
    }
}

async function sendNewsletterEmail({ to, subject, text, html }) {
    const config = getSmtpConfig()
    if (!config) return { sent: false, reason: "not_configured" }

    const transporter = nodemailer.createTransport({
        host: config.host,
        port: config.port,
        secure: process.env.SMTP_SECURE === "true" || config.port === 465,
        auth: { user: config.user, pass: config.pass },
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 15000
    })
    try {
        await transporter.sendMail({ from: config.from, to, subject, text, html })
        return { sent: true }
    } catch (error) {
        console.error("Newsletter email failed:", error.code || error.name || "SMTP_ERROR")
        return { sent: false, reason: "failed" }
    } finally {
        transporter.close()
    }
}

function toTestPaymentResponse(record) {
    return {
        id: `TEST-${record.stripeSessionId.slice(-8).toUpperCase()}`,
        createdAt: record.createdAt,
        status: "Test payment",
        testOnly: true,
        total: record.amountTotal / 100,
        currency: "EUR",
        email: record.email,
        customer: record.customer,
        delivery: record.delivery,
        items: record.items.map(item => ({
            id: item.productId,
            name: item.name,
            image: item.image,
            unitAmount: item.unitAmount,
            price: item.unitAmount / 100,
            quantity: item.quantity
        })),
        receiptEmailStatus: record.receiptEmailStatus
    }
}

async function sendTestPaymentReceipt(record) {
    const config = getSmtpConfig()
    if (!config) {
        await TestPayment.updateOne(
            { _id: record._id, receiptEmailStatus: "pending" },
            { $set: { receiptEmailStatus: "not_configured" } }
        )
        return TestPayment.findById(record._id)
    }

    const claimed = await TestPayment.findOneAndUpdate(
        { _id: record._id, receiptEmailStatus: { $in: ["pending", "not_configured"] } },
        { $set: { receiptEmailStatus: "sending", receiptEmailAttemptedAt: new Date() } },
        { new: true }
    )
    if (!claimed) return TestPayment.findById(record._id)

    const transporter = nodemailer.createTransport({
        host: config.host,
        port: config.port,
        secure: process.env.SMTP_SECURE === "true" || config.port === 465,
        auth: { user: config.user, pass: config.pass },
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 15000
    })
    const greeting = escapeHtml(record.customer?.name || "there")
    const lines = record.items.map(item => `${item.name} × ${item.quantity} — ${(item.unitAmount * item.quantity / 100).toFixed(2)} EUR`)
    const deliveryLines = [
        record.delivery?.name,
        record.delivery?.line1,
        record.delivery?.line2,
        [record.delivery?.city, record.delivery?.region, record.delivery?.postalCode].filter(Boolean).join(" "),
        record.delivery?.country
    ].filter(Boolean)
    const text = [
        "TEST PAYMENT CONFIRMATION — NO REAL CHARGE",
        "",
        `Hello ${record.customer?.name || "there"},`,
        "",
        "Stripe verified a payment in test mode. No real charge was made, no real order was placed, and nothing will be shipped.",
        "",
        `Test reference: TEST-${record.stripeSessionId.slice(-8).toUpperCase()}`,
        `Test amount: ${(record.amountTotal / 100).toFixed(2)} EUR`,
        "",
        "Items:",
        ...lines,
        "",
        "Delivery information entered for this test:",
        ...deliveryLines
    ].join("\n")
    const html = `<div style="font-family:Arial,sans-serif;color:#292929;line-height:1.6"><p style="display:inline-block;padding:6px 10px;background:#f3e5cc;color:#705532;font-weight:bold">TEST PAYMENT · NO REAL CHARGE</p><h1>Test payment confirmed</h1><p>Hello ${greeting},</p><p>Stripe verified a payment in test mode. No real charge was made, no real order was placed, and nothing will be shipped.</p><p><strong>Test reference:</strong> TEST-${escapeHtml(record.stripeSessionId.slice(-8).toUpperCase())}<br><strong>Test amount:</strong> ${(record.amountTotal / 100).toFixed(2)} EUR</p><h2>Items</h2><ul>${record.items.map(item => `<li>${escapeHtml(item.name)} × ${item.quantity} — ${(item.unitAmount * item.quantity / 100).toFixed(2)} EUR</li>`).join("")}</ul><h2>Delivery information entered for this test</h2><p>${deliveryLines.map(escapeHtml).join("<br>") || "No delivery details were supplied."}</p></div>`

    try {
        await transporter.sendMail({
            from: config.from,
            to: record.email,
            subject: "TEST PAYMENT — no real charge or order",
            text,
            html
        })
        return TestPayment.findOneAndUpdate(
            { _id: record._id, receiptEmailStatus: "sending" },
            { $set: { receiptEmailStatus: "sent", receiptEmailSentAt: new Date() } },
            { new: true }
        )
    } catch (error) {
        console.error("Test payment receipt email failed:", error.code || error.name || "SMTP_ERROR")
        return TestPayment.findOneAndUpdate(
            { _id: record._id, receiptEmailStatus: "sending" },
            { $set: { receiptEmailStatus: "failed" } },
            { new: true }
        )
    } finally {
        transporter.close()
    }
}

app.post('/checkout/quote', async (req, res, next) => {
    try {
        const resolved = await resolveCartItems(req.body?.items)
        if (resolved.error) {
            return res.status(resolved.error.status).json({ error: resolved.error.code, message: resolved.error.message })
        }
        res.json({ currency: "eur", items: resolved.items, amountTotal: resolved.amountTotal })
    } catch (error) {
        next(error)
    }
})

app.post("/checkout/coupon/validate", requireFrontendOrigin, requireAccount, async (req, res, next) => {
    try {
        const resolved = await resolveCartItems(req.body?.items)
        if (resolved.error) {
            return res.status(resolved.error.status).json({ error: resolved.error.code, message: resolved.error.message })
        }
        const coupon = await getEligibleCoupon(req.account, req.body?.couponCode, resolved.amountTotal)
        if (coupon.error) {
            return res.status(coupon.error.status).json({ error: coupon.error.code, message: coupon.error.message })
        }
        res.json({
            currency: "EUR",
            couponCode: coupon.code,
            subtotal: resolved.amountTotal,
            discountAmount: coupon.discountAmount,
            total: coupon.total
        })
    } catch (error) {
        next(error)
    }
})

app.post("/checkout/cod", requireFrontendOrigin, requireAccount, async (req, res, next) => {
    try {
        const resolved = await resolveCartItems(req.body?.items)
        if (resolved.error) {
            return res.status(resolved.error.status).json({ error: resolved.error.code, message: resolved.error.message })
        }

        const checkoutRequestId = typeof req.body?.checkoutRequestId === "string" ? req.body.checkoutRequestId : ""
        const delivery = req.body?.delivery
        const contactPhone = typeof req.body?.phone === "string" ? req.body.phone.trim() : ""
        const requiredAddressFields = ["firstName", "lastName", "address", "city", "region", "postalCode"]
        if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(checkoutRequestId) ||
            !delivery || delivery.country !== "US" ||
            !requiredAddressFields.every(key => typeof delivery[key] === "string" &&
                delivery[key].trim().length > 0 && delivery[key].trim().length <= 200) ||
            !/^[+\d][\d\s().-]{6,19}$/.test(contactPhone)) {
            return res.status(400).json({
                error: "INVALID_COD_DETAILS",
                message: "Enter a valid phone number and complete US delivery address for cash on delivery."
            })
        }

        const previousOrder = await CodOrder.findOne({
            userId: req.account._id,
            checkoutRequestId
        })
        if (previousOrder) return res.status(200).json({ order: toCodOrderResponse(previousOrder) })

        const orderNumber = `COD-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`
        const couponCode = typeof req.body?.couponCode === "string" ? req.body.couponCode.trim().toUpperCase() : ""
        let couponClaim
        let discountAmount = 0
        if (couponCode) {
            couponClaim = await getEligibleCoupon(req.account, couponCode, resolved.amountTotal)
            if (couponClaim.error) {
                const concurrentOrder = await CodOrder.findOne({ userId: req.account._id, checkoutRequestId })
                if (concurrentOrder) return res.status(200).json({ order: toCodOrderResponse(concurrentOrder) })
                return res.status(couponClaim.error.status).json({
                    error: couponClaim.error.code,
                    message: couponClaim.error.message
                })
            }
            discountAmount = couponClaim.discountAmount
            const reserved = await NewsletterSubscription.findOneAndUpdate(
                {
                    _id: couponClaim.subscription._id,
                    email: req.account.email,
                    status: "confirmed",
                    redeemedAt: null
                },
                { $set: { redeemedBy: req.account._id, redeemedOrderNumber: orderNumber, redeemedAt: new Date() } },
                { new: true }
            )
            if (!reserved) {
                return res.status(409).json({ error: "COUPON_ALREADY_USED", message: "This coupon has already been used." })
            }
        }

        let order
        try {
            order = await CodOrder.create({
                orderNumber,
                userId: req.account._id,
                checkoutRequestId,
                status: "pending",
                paymentMethod: "cod",
                subtotal: resolved.amountTotal,
                discountAmount,
                couponCode,
                total: resolved.amountTotal - discountAmount,
                currency: "eur",
                customer: {
                    name: req.account.name,
                    email: req.account.email,
                    phone: contactPhone
                },
                notes: typeof req.body?.notes === "string" ? req.body.notes.trim().slice(0, 1000) : "",
                delivery: {
                    firstName: delivery.firstName.trim(),
                    lastName: delivery.lastName.trim(),
                    address: delivery.address.trim(),
                    apartment: typeof delivery.apartment === "string" ? delivery.apartment.trim().slice(0, 200) : "",
                    city: delivery.city.trim(),
                    region: delivery.region.trim(),
                    postalCode: delivery.postalCode.trim(),
                    country: "US"
                },
                items: resolved.items.map(item => ({
                    productId: item.id,
                    name: item.name,
                    image: item.image,
                    unitAmount: item.unitAmount,
                    quantity: item.quantity
                }))
            })
        } catch (error) {
            if (error.code === 11000) {
                order = await CodOrder.findOne({ userId: req.account._id, checkoutRequestId })
                if (order) return res.status(200).json({ order: toCodOrderResponse(order) })
            }
            if (couponClaim) {
                await NewsletterSubscription.updateOne(
                    { _id: couponClaim.subscription._id, redeemedOrderNumber: orderNumber },
                    { $set: { redeemedBy: null, redeemedOrderNumber: "" }, $unset: { redeemedAt: 1 } }
                )
            }
            throw error
        }
        try {
            order = await sendCodOrderConfirmation(order) || order
        } catch (error) {
            console.error("COD order confirmation email status could not be saved:", error.code || error.name || "EMAIL_STATUS_SAVE_ERROR")
        }

        res.status(201).json({ order: toCodOrderResponse(order) })
    } catch (error) {
        next(error)
    }
})

app.post('/checkout/session', async (req, res, next) => {
    const stripe = getStripeTestClient(res)
    if (!stripe) return

    const { items, contact, delivery } = req.body || {}
    let resolved
    try {
        resolved = await resolveCartItems(items)
    } catch (error) {
        return next(error)
    }
    if (resolved.error) {
        return res.status(resolved.error.status).json({ error: resolved.error.code, message: resolved.error.message })
    }
    if (!contact || typeof contact.email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email)) {
        return res.status(400).json({ error: "INVALID_EMAIL", message: "Enter a valid email address." })
    }
    if (!delivery || delivery.country !== "US" ||
        !["firstName", "lastName", "address", "city", "region", "postalCode"].every(key =>
            typeof delivery[key] === "string" && delivery[key].trim().length > 0)) {
        return res.status(400).json({ error: "INVALID_DELIVERY_ADDRESS", message: "A complete US delivery address is required for this test checkout." })
    }

    const lineItems = resolved.items.map(item => ({
            quantity: item.quantity,
            price_data: {
                currency: "eur",
                unit_amount: item.unitAmount,
                product_data: { name: item.name, metadata: { catalog_product_id: item.id } }
            }
        }))

    try {
        const frontendUrl = (process.env.CLIENT_URL || "http://localhost:5173").replace(/\/$/, "")
        const session = await stripe.checkout.sessions.create({
            mode: "payment",
            line_items: lineItems,
            customer_email: contact.email.trim(),
            billing_address_collection: "required",
            shipping_address_collection: { allowed_countries: ["US"] },
            phone_number_collection: { enabled: true },
            success_url: `${frontendUrl}/checkout?payment=success&session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${frontendUrl}/checkout?payment=cancelled`,
            metadata: { checkout_environment: "test", currency: "EUR" }
        })
        res.json({ url: session.url })
    } catch (error) {
        console.error("Unable to create Stripe test checkout session:", error.message)
        res.status(502).json({
            error: "CHECKOUT_SESSION_FAILED",
            message: "Secure checkout could not be started. Your bag has not been changed."
        })
    }
})

app.get('/checkout/session/:sessionId', async (req, res) => {
    const stripe = getStripeTestClient(res)
    if (!stripe) return
    if (!/^cs_test_[A-Za-z0-9]+$/.test(req.params.sessionId)) {
        return res.status(400).json({ error: "INVALID_CHECKOUT_SESSION", message: "The checkout session is invalid." })
    }

    try {
        const session = await stripe.checkout.sessions.retrieve(req.params.sessionId)
        if (session.metadata?.checkout_environment !== "test" || session.currency !== "eur") {
            return res.status(404).json({ error: "CHECKOUT_SESSION_NOT_FOUND", message: "The test checkout session could not be verified." })
        }
        if (session.status !== "complete" || session.payment_status !== "paid") {
            return res.json({
                status: session.status,
                paymentStatus: session.payment_status,
                amountTotal: session.amount_total,
                currency: session.currency
            })
        }
        const email = session.customer_details?.email || session.customer_email
        if (!email) {
            return res.status(502).json({
                error: "CHECKOUT_EMAIL_MISSING",
                message: "Stripe confirmed the test payment, but its receipt email could not be verified. Retry verification or contact support."
            })
        }
        const lineItems = await stripe.checkout.sessions.listLineItems(session.id, {
            limit: 100,
            expand: ["data.price.product"]
        })
        const catalogProducts = await Product.find({ active: true }).lean()
        const catalogById = new Map(catalogProducts.map(product => [String(product.id), product]))
        const items = lineItems.data.map(line => {
            const productId = line.price?.product?.metadata?.catalog_product_id
            const catalogProduct = catalogById.get(String(productId))
            if (!catalogProduct || !Number.isInteger(line.price?.unit_amount) || !Number.isInteger(line.quantity)) {
                throw new Error("Verified Stripe line item could not be matched to the server catalog.")
            }
            return {
                productId: String(catalogProduct.id),
                name: catalogProduct.name,
                image: catalogProduct.image,
                unitAmount: line.price.unit_amount,
                quantity: line.quantity
            }
        })
        if (!items.length || !Number.isInteger(session.amount_total)) {
            throw new Error("Verified Stripe session did not contain a valid item total.")
        }
        const customerDetails = session.customer_details || {}
        const address = session.shipping_details?.address || customerDetails.address || {}
        const delivery = {
            name: session.shipping_details?.name || customerDetails.name || "",
            line1: address.line1 || "",
            line2: address.line2 || "",
            city: address.city || "",
            region: address.state || "",
            postalCode: address.postal_code || "",
            country: address.country || ""
        }
        let testPayment
        try {
            testPayment = await TestPayment.findOneAndUpdate(
                { stripeSessionId: session.id },
                {
                    $setOnInsert: {
                        stripeSessionId: session.id,
                        testOnly: true,
                        status: "test_paid",
                        amountTotal: session.amount_total,
                        currency: "eur",
                        email: email.trim().toLowerCase(),
                        customer: { name: customerDetails.name || "", phone: customerDetails.phone || "" },
                        delivery,
                        items,
                        receiptEmailStatus: "pending"
                    }
                },
                { upsert: true, new: true, setDefaultsOnInsert: true }
            )
        } catch (error) {
            if (error.code !== 11000) throw error
            testPayment = await TestPayment.findOne({ stripeSessionId: session.id })
        }
        if (!testPayment) throw new Error("Verified test payment could not be loaded after persistence.")
        testPayment = await sendTestPaymentReceipt(testPayment)
        if (!testPayment) throw new Error("Test payment record could not be loaded after receipt handling.")
        res.json({
            status: session.status,
            paymentStatus: session.payment_status,
            amountTotal: session.amount_total,
            currency: session.currency,
            testPayment: toTestPaymentResponse(testPayment)
        })
    } catch (error) {
        console.error("Unable to finalize verified Stripe test checkout:", error.code || error.name || "CHECKOUT_FINALIZE_ERROR")
        res.status(502).json({
            error: "CHECKOUT_TEST_PAYMENT_FINALIZE_FAILED",
            message: "Stripe may have confirmed your test payment, but we could not save its test record. Retry verification before leaving this page."
        })
    }
})

app.post('/checkout/session/:sessionId/receipt', async (req, res) => {
    const stripe = getStripeTestClient(res)
    if (!stripe) return
    if (!/^cs_test_[A-Za-z0-9]+$/.test(req.params.sessionId)) {
        return res.status(400).json({ error: "INVALID_CHECKOUT_SESSION", message: "The checkout session is invalid." })
    }

    try {
        const session = await stripe.checkout.sessions.retrieve(req.params.sessionId)
        if (session.metadata?.checkout_environment !== "test" || session.currency !== "eur" ||
            session.status !== "complete" || session.payment_status !== "paid") {
            return res.status(404).json({ error: "PAID_TEST_PAYMENT_NOT_FOUND", message: "A completed Stripe test payment could not be verified." })
        }
        let record = await TestPayment.findOne({ stripeSessionId: session.id })
        if (!record) {
            return res.status(404).json({ error: "TEST_PAYMENT_NOT_FOUND", message: "The test payment record was not found." })
        }
        if (record.receiptEmailStatus === "sent" || record.receiptEmailStatus === "sending") {
            return res.json({ receiptEmailStatus: record.receiptEmailStatus })
        }
        if (!["failed", "not_configured"].includes(record.receiptEmailStatus)) {
            return res.status(409).json({ error: "RECEIPT_NOT_RETRYABLE", message: "The receipt is already being processed." })
        }
        record = await TestPayment.findOneAndUpdate(
            { _id: record._id, receiptEmailStatus: record.receiptEmailStatus },
            { $set: { receiptEmailStatus: "pending" } },
            { new: true }
        )
        if (!record) return res.status(409).json({ error: "RECEIPT_NOT_RETRYABLE", message: "The receipt is already being processed." })
        record = await sendTestPaymentReceipt(record)
        res.json({ receiptEmailStatus: record.receiptEmailStatus })
    } catch (error) {
        console.error("Unable to retry Stripe test receipt:", error.code || error.name || "TEST_RECEIPT_RETRY_ERROR")
        res.status(502).json({
            error: "TEST_RECEIPT_RETRY_FAILED",
            message: "The receipt could not be sent. The test payment remains saved."
        })
    }
})

app.use((error, req, res, next) => {
    console.error("Unhandled request error:", error.code || error.name || "REQUEST_ERROR")
    res.status(500).json({ error: "SERVER_ERROR", message: "The request could not be completed." })
})

async function startServer() {
    try {
        await databaseReady
        await seedCatalogIfEmpty()
        app.listen(port, () => {
            console.log(`Furniture backend listening on port ${port}`)
        })
    } catch (error) {
        console.error("Backend startup failed:", error.code || error.name || "STARTUP_ERROR")
        process.exit(1)
    }
}

startServer()