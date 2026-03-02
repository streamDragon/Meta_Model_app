const { getSupabaseAdminClient } = require('../_lib/supabase-admin');
const { getStripeClient } = require('../_lib/stripe');

function env(name) {
    return String(process.env[name] || '').trim();
}

async function readRawBody(req) {
    if (Buffer.isBuffer(req.body)) return req.body;
    if (typeof req.body === 'string') return Buffer.from(req.body);
    if (req.body && typeof req.body === 'object') return Buffer.from(JSON.stringify(req.body));

    return await new Promise((resolve, reject) => {
        const chunks = [];
        req.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
        req.on('end', () => resolve(Buffer.concat(chunks)));
        req.on('error', reject);
    });
}

function isProStatus(status) {
    return status === 'active' || status === 'trialing';
}

function toIsoFromUnix(unixValue) {
    if (!Number.isFinite(Number(unixValue))) return null;
    return new Date(Number(unixValue) * 1000).toISOString();
}

async function markEventProcessed(supabase, eventId) {
    const upsert = await supabase
        .from('stripe_events')
        .upsert({
            event_id: eventId,
            processed_at: new Date().toISOString()
        }, { onConflict: 'event_id', ignoreDuplicates: true })
        .select('event_id');

    if (upsert.error) throw upsert.error;
    return Array.isArray(upsert.data) && upsert.data.length > 0;
}

async function findUserIdByCustomer(stripe, supabase, customerId) {
    if (!customerId) return '';

    const billingRes = await supabase
        .from('billing')
        .select('user_id')
        .eq('stripe_customer_id', customerId)
        .maybeSingle();
    if (!billingRes.error && billingRes.data?.user_id) {
        return String(billingRes.data.user_id);
    }

    try {
        const customer = await stripe.customers.retrieve(customerId);
        if (customer && !customer.deleted) {
            const fromMeta = String(customer.metadata?.user_id || '').trim();
            if (fromMeta) return fromMeta;
        }
    } catch (_error) {}
    return '';
}

async function applyBillingSnapshot({ supabase, userId, customerId, status, priceId, currentPeriodEnd }) {
    const nowIso = new Date().toISOString();
    const upsertBilling = await supabase
        .from('billing')
        .upsert({
            user_id: userId,
            stripe_customer_id: customerId || null,
            subscription_status: status || 'free',
            current_period_end: currentPeriodEnd || null,
            price_id: priceId || null,
            updated_at: nowIso
        }, { onConflict: 'user_id' });
    if (upsertBilling.error) throw upsertBilling.error;

    const pro = isProStatus(status);
    const upsertProfile = await supabase
        .from('profiles')
        .upsert({
            id: userId,
            role: pro ? 'pro' : 'free',
            ads_enabled: !pro
        }, { onConflict: 'id' });
    if (upsertProfile.error) throw upsertProfile.error;
}

async function handleSubscriptionEvent({ stripe, supabase, subscription }) {
    if (!subscription) return;
    const customerId = String(subscription.customer || '').trim();
    const userId = await findUserIdByCustomer(stripe, supabase, customerId);
    if (!userId) return;

    const status = String(subscription.status || 'free');
    const priceId = String(subscription.items?.data?.[0]?.price?.id || '').trim() || null;
    const currentPeriodEnd = toIsoFromUnix(subscription.current_period_end);
    await applyBillingSnapshot({
        supabase,
        userId,
        customerId,
        status,
        priceId,
        currentPeriodEnd
    });
}

async function handleCheckoutCompleted({ stripe, supabase, session }) {
    if (!session || session.mode !== 'subscription') return;
    const customerId = String(session.customer || '').trim();
    const userIdFromRef = String(session.client_reference_id || '').trim();
    const userId = userIdFromRef || await findUserIdByCustomer(stripe, supabase, customerId);
    if (!userId) return;

    const subscriptionId = String(session.subscription || '').trim();
    if (!subscriptionId) return;
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    await handleSubscriptionEvent({ stripe, supabase, subscription });
}

module.exports = async function stripeWebhook(req, res) {
    if (req.method !== 'POST') {
        res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
        return;
    }

    try {
        const secret = env('STRIPE_WEBHOOK_SECRET');
        if (!secret) {
            res.status(500).json({ error: 'STRIPE_WEBHOOK_SECRET_MISSING' });
            return;
        }
        const stripe = getStripeClient();
        const supabase = getSupabaseAdminClient();
        const rawBody = await readRawBody(req);
        const signature = String(req.headers['stripe-signature'] || '');
        const event = stripe.webhooks.constructEvent(rawBody, signature, secret);

        const firstTime = await markEventProcessed(supabase, event.id);
        if (!firstTime) {
            res.status(200).json({ ok: true, duplicate: true });
            return;
        }

        if (
            event.type === 'customer.subscription.created' ||
            event.type === 'customer.subscription.updated' ||
            event.type === 'customer.subscription.deleted'
        ) {
            await handleSubscriptionEvent({
                stripe,
                supabase,
                subscription: event.data.object
            });
        } else if (event.type === 'checkout.session.completed') {
            await handleCheckoutCompleted({
                stripe,
                supabase,
                session: event.data.object
            });
        }

        res.status(200).json({ ok: true });
    } catch (error) {
        res.status(400).json({
            error: error?.message || 'WEBHOOK_FAILED'
        });
    }
};

