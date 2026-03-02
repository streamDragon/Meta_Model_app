const { getSupabaseAdminClient, verifyAccessToken } = require('../_lib/supabase-admin');
const { getStripeClient } = require('../_lib/stripe');

function env(name, fallback = '') {
    return String(process.env[name] || fallback || '').trim();
}

function toSiteUrl() {
    return env('PUBLIC_SITE_URL', env('VITE_PUBLIC_SITE_URL', 'http://localhost:5173')).replace(/\/+$/, '');
}

async function parseJsonBody(req) {
    if (req.body && typeof req.body === 'object') return req.body;
    if (typeof req.body === 'string' && req.body.trim()) {
        try {
            return JSON.parse(req.body);
        } catch (_error) {
            return {};
        }
    }
    return await new Promise((resolve) => {
        let raw = '';
        req.on('data', (chunk) => {
            raw += String(chunk || '');
        });
        req.on('end', () => {
            if (!raw.trim()) return resolve({});
            try {
                resolve(JSON.parse(raw));
            } catch (_error) {
                resolve({});
            }
        });
    });
}

function selectPriceId(plan) {
    const normalized = String(plan || '').toLowerCase();
    if (normalized === 'yearly') return env('STRIPE_PRICE_YEARLY');
    return env('STRIPE_PRICE_MONTHLY');
}

module.exports = async function createCheckoutSession(req, res) {
    if (req.method !== 'POST') {
        res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
        return;
    }

    try {
        const { user } = await verifyAccessToken(req);
        const body = await parseJsonBody(req);
        const plan = String(body?.plan || 'monthly').toLowerCase();
        const priceId = selectPriceId(plan);
        if (!priceId) {
            res.status(500).json({ error: 'PRICE_ID_MISSING' });
            return;
        }

        const supabase = getSupabaseAdminClient();
        const stripe = getStripeClient();
        const nowIso = new Date().toISOString();

        const billingRes = await supabase
            .from('billing')
            .select('user_id,stripe_customer_id')
            .eq('user_id', user.id)
            .maybeSingle();
        if (billingRes.error && billingRes.error.code !== 'PGRST116') {
            throw billingRes.error;
        }

        let customerId = billingRes.data?.stripe_customer_id || '';
        if (!customerId) {
            const customer = await stripe.customers.create({
                email: user.email || undefined,
                metadata: { user_id: user.id }
            });
            customerId = customer.id;
        }

        const upsertBilling = await supabase
            .from('billing')
            .upsert({
                user_id: user.id,
                stripe_customer_id: customerId,
                subscription_status: 'free',
                updated_at: nowIso
            }, { onConflict: 'user_id' });
        if (upsertBilling.error) throw upsertBilling.error;

        const siteUrl = toSiteUrl();
        const successUrl = `${siteUrl}/index.html?stripe=success`;
        const cancelUrl = `${siteUrl}/index.html?stripe=cancel`;

        const session = await stripe.checkout.sessions.create({
            mode: 'subscription',
            customer: customerId,
            line_items: [{ price: priceId, quantity: 1 }],
            allow_promotion_codes: true,
            client_reference_id: user.id,
            success_url: successUrl,
            cancel_url: cancelUrl,
            metadata: {
                user_id: user.id,
                plan
            },
            subscription_data: {
                metadata: {
                    user_id: user.id,
                    plan
                }
            }
        });

        res.status(200).json({
            id: session.id,
            url: session.url
        });
    } catch (error) {
        const status = Number(error?.statusCode || 500);
        res.status(status).json({
            error: error?.message || 'CHECKOUT_SESSION_FAILED'
        });
    }
};

