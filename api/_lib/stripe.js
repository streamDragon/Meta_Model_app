const Stripe = require('stripe');

let stripeClient = null;

function env(name) {
    return String(process.env[name] || '').trim();
}

function getStripeClient() {
    const key = env('STRIPE_SECRET_KEY');
    if (!key) throw new Error('STRIPE_SECRET_KEY_MISSING');
    if (stripeClient) return stripeClient;
    stripeClient = new Stripe(key, {
        apiVersion: '2024-06-20'
    });
    return stripeClient;
}

module.exports = {
    getStripeClient
};

