import { AlertTriangle, CheckCircle2, Clock, Loader2, Lock, Ticket } from 'lucide-react';

/**
 * Maps the server-computed registration state onto a badge + call to action.
 *
 * The backend is the only source of truth for this: `accessGranted` is true
 * solely when the registration is CONFIRMED and, for paid events, Chapa has
 * verified the payment. The UI never decides it locally.
 */
export const REGISTRATION_STATE = {
    NOT_REGISTERED: 'NOT_REGISTERED',
    PENDING_PAYMENT: 'PENDING_PAYMENT',
    PAID: 'PAID',
    FAILED: 'FAILED',
    EXPIRED: 'EXPIRED',
    CANCELLED: 'CANCELLED'
};

/** Derive one of REGISTRATION_STATE from the API's registration payload. */
export const resolveRegistrationState = (reg, event) => {
    if (!reg || !reg.registered) return REGISTRATION_STATE.NOT_REGISTERED;
    if (reg.accessGranted) return REGISTRATION_STATE.PAID;
    if (reg.registrationStatus === 'EXPIRED') return REGISTRATION_STATE.EXPIRED;
    if (reg.registrationStatus === 'CANCELLED') return REGISTRATION_STATE.CANCELLED;
    if (reg.paymentStatus === 'failed' || reg.paymentStatus === 'expired') return REGISTRATION_STATE.FAILED;
    if (reg.registrationStatus === 'PENDING_PAYMENT' || reg.registrationStatus === 'PAID') {
        return REGISTRATION_STATE.PENDING_PAYMENT;
    }
    if (reg.registrationStatus === 'WAITLISTED') return REGISTRATION_STATE.PENDING_PAYMENT;
    if (event?.requiresPayment) return REGISTRATION_STATE.NOT_REGISTERED;
    return REGISTRATION_STATE.NOT_REGISTERED;
};

const STYLES = {
    [REGISTRATION_STATE.NOT_REGISTERED]: {
        label: 'Registration Open',
        icon: Ticket,
        badge: 'border-green-500/40 bg-green-500/10 text-green-300',
        bar: 'border-green-500/30 bg-green-500/10 text-green-100'
    },
    [REGISTRATION_STATE.PENDING_PAYMENT]: {
        label: 'Awaiting Payment',
        icon: Clock,
        badge: 'border-amber-400/40 bg-amber-500/10 text-amber-300',
        bar: 'border-amber-400/40 bg-amber-500/10 text-amber-100'
    },
    [REGISTRATION_STATE.PAID]: {
        label: 'Paid — Access Granted',
        icon: CheckCircle2,
        badge: 'border-emerald-400/40 bg-emerald-500/15 text-emerald-300',
        bar: 'border-emerald-400/40 bg-emerald-500/15 text-emerald-100'
    },
    [REGISTRATION_STATE.FAILED]: {
        label: 'Payment Incomplete',
        icon: AlertTriangle,
        badge: 'border-red-400/40 bg-red-500/10 text-red-300',
        bar: 'border-red-400/40 bg-red-500/10 text-red-100'
    },
    [REGISTRATION_STATE.EXPIRED]: {
        label: 'Payment Expired',
        icon: AlertTriangle,
        badge: 'border-red-400/40 bg-red-500/10 text-red-300',
        bar: 'border-red-400/40 bg-red-500/10 text-red-100'
    },
    [REGISTRATION_STATE.CANCELLED]: {
        label: 'Cancelled',
        icon: Lock,
        badge: 'border-white/15 bg-white/5 text-gray-300',
        bar: 'border-white/10 bg-white/5 text-gray-200'
    }
};

export const registrationBadge = (state, requiresPayment = true) => {
    const style = STYLES[state] || STYLES[REGISTRATION_STATE.NOT_REGISTERED];
    // A free event is confirmed without any money changing hands, so calling it
    // "Paid" would be a lie.
    if (state === REGISTRATION_STATE.PAID && !requiresPayment) {
        return { ...style, label: 'Registered — Access Granted' };
    }
    return style;
};

/** Compact badge used on cards / listings. */
export function RegistrationBadge({ state, requiresPayment = true, className = '' }) {
    const { label, icon: Icon, badge } = registrationBadge(state, requiresPayment);
    return (
        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-widest ${badge} ${className}`}>
            <Icon className="h-3 w-3" />
            {label}
        </span>
    );
}

/** Full-width banner used on the event detail page. */
export function RegistrationStatusBar({ state, registration, requiresPayment = true, busy, onAction, actionLabel }) {
    const meta = registrationBadge(state, requiresPayment);
    const Icon = meta.icon;

    const defaults = {
        [REGISTRATION_STATE.NOT_REGISTERED]: {
            title: 'You have not registered yet',
            body: 'Register below to secure your seat. A valid account is required — you will be asked to log in first.'
        },
        [REGISTRATION_STATE.PENDING_PAYMENT]: {
            title: 'Awaiting payment',
            body: 'Your seat is reserved but access is locked until Chapa confirms the payment on the server.'
        },
        [REGISTRATION_STATE.PAID]: requiresPayment
            ? {
                title: 'Payment verified — access granted',
                body: 'You are on the guest list. Use the Join button to open the event room.'
            }
            : {
                title: 'Registration confirmed — access granted',
                body: 'This event is free, so your seat is confirmed. Use the Join button to open the event room.'
            },
        [REGISTRATION_STATE.FAILED]: {
            title: 'Payment not completed',
            body: 'Your payment was not confirmed, so access has not been granted. You can retry checkout.'
        },
        [REGISTRATION_STATE.EXPIRED]: {
            title: 'Payment window expired',
            body: 'The seat was released because payment did not arrive in time. Register again for a fresh checkout link.'
        },
        [REGISTRATION_STATE.CANCELLED]: {
            title: 'Registration cancelled',
            body: 'Your seat was released. Register again if you would still like to attend.'
        }
    };
    const copy = defaults[state] || defaults[REGISTRATION_STATE.NOT_REGISTERED];

    return (
        <div className={`flex flex-col gap-4 rounded-2xl border p-5 sm:flex-row sm:items-center sm:justify-between ${meta.bar}`}>
            <div className="flex items-start gap-3">
                {busy
                    ? <Loader2 className="mt-0.5 h-5 w-5 shrink-0 animate-spin text-green-400" />
                    : <Icon className="mt-0.5 h-5 w-5 shrink-0" />}
                <div>
                    <p className="text-sm font-extrabold text-white">{copy.title}</p>
                    <p className="mt-1 text-xs leading-relaxed text-[#9CA3AF]">{copy.body}</p>
                    {registration?.bookingRef && (
                        <p className="mt-2 text-[11px] text-gray-400">
                            Booking ref: <span className="font-mono font-bold text-green-300">{registration.bookingRef}</span>
                        </p>
                    )}
                    {registration?.lastVerificationError && state !== REGISTRATION_STATE.PAID && (
                        <p className="mt-2 text-[11px] text-red-300">{registration.lastVerificationError}</p>
                    )}
                </div>
            </div>
            {onAction && (
                <button
                    type="button"
                    onClick={onAction}
                    disabled={busy}
                    className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-green-500 to-green-600 px-5 py-2.5 text-xs font-extrabold uppercase tracking-wide text-black transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                >
                    {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    {actionLabel}
                </button>
            )}
        </div>
    );
}

export default RegistrationBadge;
