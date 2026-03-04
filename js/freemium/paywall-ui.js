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
    let modalBusy = false;

    function setModalBusy(modal, busy) {
        modalBusy = Boolean(busy);
        if (!modal) return;
        modal.classList.toggle('is-busy', modalBusy);
        modal.querySelectorAll('.freemium-btn, .freemium-link-btn, input').forEach((el) => {
            if (el.hasAttribute('data-freemium-close')) return;
            el.disabled = modalBusy;
        });
    }

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
        modalBusy = false;
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

    function dismissToastLater(toast, durationMs = 3200) {
        setTimeout(() => {
            toast.classList.add('is-hiding');
            setTimeout(() => toast.remove(), 280);
        }, Math.max(900, Number(durationMs) || 3200));
    }

    function showToast(text, tone = 'info', durationMs = 3200) {
        const root = ensureToastRoot();
        const toast = createElement('div', `freemium-toast freemium-toast--${tone}`);
        toast.textContent = text;
        root.appendChild(toast);
        dismissToastLater(toast, durationMs);
    }

    function showRetryToast(text, onRetry, tone = 'warn', durationMs = 5200) {
        const root = ensureToastRoot();
        const toast = createElement('div', `freemium-toast freemium-toast--${tone} freemium-toast--action`);
        const message = createElement('span', 'freemium-toast__text');
        const retryBtn = createElement('button', 'freemium-toast__retry');

        message.textContent = text;
        retryBtn.type = 'button';
        retryBtn.textContent = 'Retry';
        retryBtn.addEventListener('click', async () => {
            retryBtn.disabled = true;
            try {
                await onRetry?.();
                toast.remove();
            } catch (_error) {
                retryBtn.disabled = false;
            }
        });

        toast.appendChild(message);
        toast.appendChild(retryBtn);
        root.appendChild(toast);
        dismissToastLater(toast, durationMs);
    }

    function mapGoogleSignInError(error) {
        const code = String(error?.code || '').trim().toUpperCase();
        if (code === 'GOOGLE_PROVIDER_DISABLED') return 'Google לא פעיל כרגע במערכת. נסו התחברות באימייל.';
        if (code === 'INVALID_REDIRECT_URL' || code === 'PUBLIC_SITE_URL_INVALID') {
            return 'כתובת החזרה של Google לא תקינה כרגע. נסו שוב עוד רגע.';
        }
        return 'התחברות עם Google נכשלה כרגע.';
    }

    async function runEmailUpgrade(modal) {
        if (modalBusy) return;
        const emailInput = modal.querySelector('[data-freemium-email]');
        const status = modal.querySelector('[data-freemium-auth-status]');
        const email = String(emailInput?.value || '').trim();

        if (!email) {
            if (status) status.textContent = 'יש למלא אימייל.';
            return;
        }

        if (status) status.textContent = 'שולח קישור אימות...';
        setModalBusy(modal, true);
        try {
            await actions.onEmailUpgrade?.(email);
            closeModal();
            showToast('נשלח קישור התחברות למייל ✅', 'success');
        } catch (error) {
            if (status) status.textContent = String(error?.message || 'לא הצלחנו לשלוח קישור אימות כרגע.');
            setModalBusy(modal, false);
        }
    }

    function openGuestAuthModal() {
        renderModal(`
            <button class="freemium-modal-close" type="button" data-freemium-close>✕</button>
            <h3>התחברות בחינם</h3>
            <p class="freemium-modal-sub">התחבר עם Google כדי לשמור התקדמות ולקבל חבילה חינמית של 60 משפטים.</p>
            <div class="freemium-modal-actions">
                <button type="button" class="freemium-btn freemium-btn-primary" data-freemium-google-link>התחבר עם Google</button>
                <button type="button" class="freemium-btn freemium-btn-secondary" data-freemium-close-later>לא עכשיו</button>
            </div>
            <p class="freemium-auth-note">התחברות עם Google מפעילה שמירת התקדמות ומעבר לחבילת משתמש רשום.</p>
            <p class="freemium-auth-status" data-freemium-auth-status></p>
        `, (modal) => {
            const runGoogleSignIn = async () => {
                if (modalBusy) return;
                const status = modal.querySelector('[data-freemium-auth-status]');
                if (status) status.textContent = 'מעביר ל-Google...';
                setModalBusy(modal, true);
                try {
                    await actions.onGoogleSignIn?.();
                } catch (error) {
                    const message = mapGoogleSignInError(error);
                    if (status) status.textContent = message;
                    setModalBusy(modal, false);
                    showRetryToast(`${message} לחצו Retry כדי לנסות שוב.`, async () => {
                        await runGoogleSignIn();
                    }, 'warn');
                }
            };

            modal.querySelector('[data-freemium-close]')?.addEventListener('click', closeModal);
            modal.querySelector('[data-freemium-close-later]')?.addEventListener('click', closeModal);
            modal.querySelector('[data-freemium-google-link]')?.addEventListener('click', runGoogleSignIn);
        });
    }

    function openGuestQuotaEndedModal() {
        renderModal(`
            <button class="freemium-modal-close" type="button" data-freemium-close>✕</button>
            <h3>הגעת ל־10 משפטים חינם</h3>
            <p class="freemium-modal-sub">כדי להמשיך צריך התחברות עם Google — כדי לשמור התקדמות ולהמשיך לתרגל.</p>
            <div class="freemium-modal-actions">
                <button type="button" class="freemium-btn freemium-btn-primary" data-freemium-open-google>התחבר עם Google</button>
                <button type="button" class="freemium-btn freemium-btn-secondary" data-freemium-close-later>לא עכשיו</button>
            </div>
            <p class="freemium-auth-status" data-freemium-auth-status></p>
        `, (modal) => {
            const runGoogleSignIn = async () => {
                if (modalBusy) return;
                const status = modal.querySelector('[data-freemium-auth-status]');
                if (status) status.textContent = 'מעביר ל-Google...';
                setModalBusy(modal, true);
                try {
                    await actions.onGoogleSignIn?.();
                } catch (error) {
                    const message = mapGoogleSignInError(error);
                    if (status) status.textContent = message;
                    setModalBusy(modal, false);
                    showRetryToast(`${message} לחצו Retry כדי לנסות שוב.`, async () => {
                        await runGoogleSignIn();
                    }, 'warn');
                }
            };

            modal.querySelector('[data-freemium-close]')?.addEventListener('click', closeModal);
            modal.querySelector('[data-freemium-close-later]')?.addEventListener('click', closeModal);
            modal.querySelector('[data-freemium-open-google]')?.addEventListener('click', runGoogleSignIn);
        });
    }

    function bindCheckoutAction(modal, selector, plan) {
        modal.querySelector(selector)?.addEventListener('click', async () => {
            if (modalBusy) return;
            const status = modal.querySelector('[data-freemium-auth-status]');
            if (status) status.textContent = 'פותח תשלום...';
            setModalBusy(modal, true);
            try {
                await actions.onCheckoutPlan?.(plan);
            } catch (_error) {
                if (status) status.textContent = 'לא הצלחנו לפתוח את תהליך התשלום כרגע.';
                setModalBusy(modal, false);
            }
        });
    }

    function openFreeQuotaEndedModal() {
        renderModal(`
            <button class="freemium-modal-close" type="button" data-freemium-close>✕</button>
            <h3>נגמרה החבילה החינמית (60 משפטים)</h3>
            <p class="freemium-modal-sub">כדי להמשיך לתרגל — צריך לשדרג.</p>
            <div class="freemium-modal-actions">
                <button type="button" class="freemium-btn freemium-btn-primary" data-freemium-upgrade-soon>שדרוג (בקרוב/לתשלום)</button>
                <button type="button" class="freemium-btn freemium-btn-secondary" data-freemium-close-later>חזרה</button>
            </div>
            <p class="freemium-auth-status" data-freemium-auth-status></p>
        `, (modal) => {
            modal.querySelector('[data-freemium-upgrade-soon]')?.addEventListener('click', () => {
                const status = modal.querySelector('[data-freemium-auth-status]');
                if (status) status.textContent = 'אפשרות שדרוג בתשלום תיפתח בקרוב.';
                showToast('אפשרות שדרוג בתשלום תיפתח בקרוב.', 'info');
            });
            modal.querySelector('[data-freemium-close]')?.addEventListener('click', closeModal);
            modal.querySelector('[data-freemium-close-later]')?.addEventListener('click', closeModal);
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
