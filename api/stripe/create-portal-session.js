const { getSupabaseAdminClient, verifyAccessToken } = require('../_lib/supabase-admin');
const { getStripeClient } = require('../_lib/stripe');

function env(name, fallback = '') {
    return String(process.env[name] || fallback || '').trim();
}

function toSiteUrl() {
    return env('PUBLIC_SITE_URL', env('VITE_PUBLIC_SITE_URL', 'http://localhost:5173')).replace(/\/+$/, '');
}

module.exports = async function createPortalSession(req, res) {
    if (req.method !== 'POST') {
        res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
        return;
    }

    try {
        const { user } = await verifyAccessToken(req);
        const supabase = getSupabaseAdminClient();
        const stripe = getStripeClient();

        const billingRes = await supabase
            .from('billing')
            .select('stripe_customer_id')
            .eq('user_id', user.id)
            .maybeSingle();
        if (billingRes.error && billingRes.error.code !== 'PGRST116') {
            throw billingRes.error;
        }

        const customerId = String(billingRes.data?.stripe_customer_id || '').trim();
        if (!customerId) {
            res.status(400).json({ error: 'NO_BILLING_CUSTOMER' });
            return;
        }

        const session = await stripe.billingPortal.sessions.create({
            customer: customerId,
            return_url: `${toSiteUrl()}/index.html`
        });

        res.status(200).json({
            url: session.url
        });
    } catch (error) {
        const status = Number(error?.statusCode || 500);
        res.status(status).json({
            error: error?.message || 'PORTAL_SESSION_FAILED'
        });
    }
};

