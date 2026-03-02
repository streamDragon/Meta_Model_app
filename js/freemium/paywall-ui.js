function createElement(tag, className) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    return el;
}

function escapeHtml(value) {
    return String(value == null ? '' : value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

export function createPaywallUi(actions = {}) {
    let overlay = null;
    let toastRoot = null;

    function emitModalState(isOpen) {
        try {
            window.dispatchEvent(new CustomEvent('freemium:modal-state', {
                detail: { open: Boolean(isOpen) }
            }));
        } catch (_error) {}
    }

    function ensureOverlay() {
        if (overlay && document.body.contains(overlay)) return overlay;
        overlay = createElement('div', 'freemium-overlay hidden');
        overlay.innerHTML = '<div class="freemium-modal" role="dialog" aria-modal="true"></div>';
        overlay.addEventListener('click', (event) => {
            if (event.target === overlay) closeModal();
        });
        document.body.appendChild(overlay);
        return overlay;
    }

    function ensureToastRoot() {
        if (toastRoot && document.body.contains(toastRoot)) return toastRoot;
        toastRoot = createElement('div', 'freemium-toast-root');
        document.body.appendChild(toastRoot);
        return toastRoot;
    }

    function closeModal() {
        if (!overlay) return;
        overlay.classList.add('hidden');
        const modal = overlay.querySelector('.freemium-modal');
        if (modal) modal.innerHTML = '';
        document.body.classList.remove('freemium-modal-open');
        emitModalState(false);
    }

    function renderModal(html, bindHandlers) {
        const root = ensureOverlay();
        const modal = root.querySelector('.freemium-modal');
        if (!modal) return;
        modal.innerHTML = html;
        root.classList.remove('hidden');
        document.body.classList.add('freemium-modal-open');
        emitModalState(true);
        if (typeof bindHandlers === 'function') {
            bindHandlers(modal);
        }
    }

    function showToast(text, tone = 'info', durationMs = 3200) {
        const root = ensureToastRoot();
        const toast = createElement('div', `freemium-toast freemium-toast--${tone}`);
        toast.textContent = text;
        root.appendChild(toast);
        setTimeout(() => {
            toast.classList.add('is-hiding');
            setTimeout(() => toast.remove(), 280);
        }, Math.max(900, Number(durationMs) || 3200));
    }

    async function runEmailUpgrade(modal) {
        const emailInput = modal.querySelector('[data-freemium-email]');
        const passwordInput = modal.querySelector('[data-freemium-password]');
        const status = modal.querySelector('[data-freemium-auth-status]');
        const email = String(emailInput?.value || '').trim();
        const password = String(passwordInput?.value || '');

        if (!email || !password) {
            if (status) status.textContent = 'יש למלא אימייל וסיסמה.';
            return;
        }

        if (status) status.textContent = 'מבצע חיבור...';
        try {
            await actions.onEmailUpgrade?.(email, password);
            closeModal();
            showToast('החשבון שודרג לחינם וההתקדמות נשמרה ✅', 'success');
        } catch (error) {
            const code = String(error?.code || '');
            if (code === 'IDENTITY_ALREADY_EXISTS') {
                if (status) {
                    status.innerHTML = 'החשבון הזה כבר קיים. <button type="button" class="freemium-link-btn" data-freemium-switch-existing>להתחבר אליו במקום?</button>';
                }
                const switchBtn = modal.querySelector('[data-freemium-switch-existing]');
                switchBtn?.addEventListener('click', async () => {
                    try {
                        await actions.onSwitchToExisting?.();
                    } catch (_switchError) {
                        if (status) status.textContent = 'לא הצלחנו לעבור לחשבון הקיים כרגע.';
                    }
                });
                return;
            }
            if (status) status.textContent = 'לא הצלחנו להשלים את החיבור כרגע.';
        }
    }

    function openGuestAuthModal() {
        renderModal(`
            <button class="freemium-modal-close" type="button" data-freemium-close>✕</button>
            <h3>התחברות בחינם</h3>
            <p class="freemium-modal-sub">אהבת? התחבר בחינם וקבל עוד משפטים היום + שמירת התקדמות</p>
            <label class="freemium-field">
                אימייל
                <input type="email" data-freemium-email placeholder="name@example.com" dir="ltr" />
            </label>
            <label class="freemium-field">
                סיסמה
                <input type="password" data-freemium-password placeholder="••••••••" dir="ltr" />
            </label>
            <div class="freemium-modal-actions">
                <button type="button" class="freemium-btn freemium-btn-primary" data-freemium-email-upgrade>התחבר בחינם</button>
                <button type="button" class="freemium-btn freemium-btn-secondary" data-freemium-google-link>התחבר עם Google</button>
            </div>
            <p class="freemium-auth-status" data-freemium-auth-status></p>
        `, (modal) => {
            modal.querySelector('[data-freemium-close]')?.addEventListener('click', closeModal);
            modal.querySelector('[data-freemium-email-upgrade]')?.addEventListener('click', () => runEmailUpgrade(modal));
            modal.querySelector('[data-freemium-google-link]')?.addEventListener('click', async () => {
                const status = modal.querySelector('[data-freemium-auth-status]');
                if (status) status.textContent = 'מעביר ל-Google...';
                try {
                    await actions.onGoogleLink?.();
                } catch (error) {
                    const code = String(error?.code || '');
                    if (code === 'IDENTITY_ALREADY_EXISTS') {
                        if (status) {
                            status.innerHTML = 'החשבון הזה כבר קיים. <button type="button" class="freemium-link-btn" data-freemium-switch-existing>להתחבר אליו במקום?</button>';
                        }
                        const switchBtn = modal.querySelector('[data-freemium-switch-existing]');
                        switchBtn?.addEventListener('click', async () => {
                            try {
                                await actions.onSwitchToExisting?.();
                            } catch (_switchError) {
                                if (status) status.textContent = 'לא הצלחנו לעבור לחשבון הקיים כרגע.';
                            }
                        });
                    } else if (status) {
                        status.textContent = 'לא הצלחנו להתחבר ל-Google כרגע.';
                    }
                }
            });
        });
    }

    function openGuestQuotaEndedModal() {
        renderModal(`
            <button class="freemium-modal-close" type="button" data-freemium-close>✕</button>
            <h3>כל הכבוד — סיימת את הסט היומי 🎯</h3>
            <p class="freemium-modal-sub">התחברות חינם מוסיפה לך עוד משפטים היום ושומרת התקדמות.</p>
            <div class="freemium-modal-actions">
                <button type="button" class="freemium-btn freemium-btn-primary" data-freemium-open-auth>התחבר בחינם</button>
                <button type="button" class="freemium-btn freemium-btn-secondary" data-freemium-close-later>אמשיך מחר</button>
            </div>
        `, (modal) => {
            modal.querySelector('[data-freemium-close]')?.addEventListener('click', closeModal);
            modal.querySelector('[data-freemium-close-later]')?.addEventListener('click', closeModal);
            modal.querySelector('[data-freemium-open-auth]')?.addEventListener('click', openGuestAuthModal);
        });
    }

    function bindCheckoutAction(modal, selector, plan) {
        modal.querySelector(selector)?.addEventListener('click', async () => {
            const status = modal.querySelector('[data-freemium-auth-status]');
            if (status) status.textContent = 'פותח תשלום...';
            try {
                await actions.onCheckoutPlan?.(plan);
            } catch (_error) {
                if (status) status.textContent = 'לא הצלחנו לפתוח את תהליך התשלום כרגע.';
            }
        });
    }

    function openFreeQuotaEndedModal() {
        renderModal(`
            <button class="freemium-modal-close" type="button" data-freemium-close>✕</button>
            <h3>פתחת 80 משפטים. רוצה את כל הספרייה?</h3>
            <ul class="freemium-bullets">
                <li>כל המשפטים</li>
                <li>כל המודולים החדשים</li>
                <li>ללא פרסומות</li>
            </ul>
            <div class="freemium-modal-actions">
                <button type="button" class="freemium-btn freemium-btn-primary" data-freemium-plan-monthly>מנוי חודשי</button>
                <button type="button" class="freemium-btn freemium-btn-secondary" data-freemium-plan-yearly>מנוי שנתי (חסכון)</button>
            </div>
            <p class="freemium-auth-status" data-freemium-auth-status></p>
        `, (modal) => {
            modal.querySelector('[data-freemium-close]')?.addEventListener('click', closeModal);
            bindCheckoutAction(modal, '[data-freemium-plan-monthly]', 'monthly');
            bindCheckoutAction(modal, '[data-freemium-plan-yearly]', 'yearly');
        });
    }

    function openLockedPreviewModal(items = []) {
        const listHtml = (items || []).slice(0, 3).map((item) => (
            `<li class="freemium-locked-item"><span class="freemium-lock">🔒</span>${escapeHtml(item)}</li>`
        )).join('');

        renderModal(`
            <button class="freemium-modal-close" type="button" data-freemium-close>✕</button>
            <h3>טעימה מתוכן פרו</h3>
            <p class="freemium-modal-sub">עוד קצת ומקבלים גישה מלאה.</p>
            <ul class="freemium-bullets">${listHtml}</ul>
            <div class="freemium-modal-actions">
                <button type="button" class="freemium-btn freemium-btn-primary" data-freemium-plan-monthly>מנוי חודשי</button>
                <button type="button" class="freemium-btn freemium-btn-secondary" data-freemium-close-later>סגור</button>
            </div>
            <p class="freemium-auth-status" data-freemium-auth-status></p>
        `, (modal) => {
            modal.querySelector('[data-freemium-close]')?.addEventListener('click', closeModal);
            modal.querySelector('[data-freemium-close-later]')?.addEventListener('click', closeModal);
            bindCheckoutAction(modal, '[data-freemium-plan-monthly]', 'monthly');
        });
    }

    return {
        closeModal,
        showToast,
        openGuestAuthModal,
        openGuestQuotaEndedModal,
        openFreeQuotaEndedModal,
        openLockedPreviewModal,
        showProWelcomeToast() {
            showToast('ברוך הבא לפרו — הכל פתוח ✅', 'success', 4200);
        }
    };
}
