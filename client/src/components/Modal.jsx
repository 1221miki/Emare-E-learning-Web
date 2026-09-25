import { useEffect, useRef } from 'react';

/**
 * Reusable Modal Component
 * Renders a centered overlay dialog with backdrop blur.
 * Closes on backdrop click or Escape key.
 *
 * @param {boolean} isOpen - Controls modal visibility
 * @param {function} onClose - Called when modal should close
 * @param {string} title - Modal header title
 * @param {React.ReactNode} children - Modal body content
 * @param {string} maxWidth - Maximum width of the modal (default: 480px)
 * @param {boolean} scrollable - When true, the modal is capped to the viewport
 *   and the body scrolls vertically while the header stays fixed (default: false)
 * @param {string} maxHeight - Optional max height override when scrollable
 *   (default: calc(100vh - 80px))
 * @param {string} backdrop - Backdrop style: 'default' (dark + blur, default) or
 *   'clear' (light overlay, no blur, keeps the underlying page clearly visible)
 */
export default function Modal({ isOpen, onClose, title, children, maxWidth = '480px', scrollable = false, maxHeight, backdrop = 'default' }) {
    const modalRef = useRef(null);
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';

    // Close on Escape key press
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && isOpen) onClose();
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    // Prevent body scroll when modal is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => { document.body.style.overflow = ''; };
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div style={backdrop === 'clear' ? styles.backdropClear : styles.backdrop} onClick={onClose}>
            <div
                ref={modalRef}
                style={{
                    ...styles.modal,
                    background: isDark ? '#111a2e' : '#ffffff',
                    borderColor: isDark ? '#24304d' : '#e2e8f0',
                    boxShadow: isDark ? '0 30px 80px rgba(2, 6, 23, 0.62)' : '0 25px 60px rgba(15,23,42,0.15)',
                    maxWidth,
                    ...(scrollable
                        ? { maxHeight: maxHeight || 'calc(100vh - 80px)', display: 'flex', flexDirection: 'column' }
                        : {})
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div style={{ ...styles.header, ...(scrollable ? { flexShrink: 0 } : {}) }}>
                    <h3 style={{ ...styles.title, color: isDark ? '#e2e8f0' : '#0f172a' }}>{title}</h3>
                    <button onClick={onClose} style={{ ...styles.closeBtn, background: isDark ? '#1b2538' : '#f1f5f9', borderColor: isDark ? '#314159' : '#e2e8f0', color: isDark ? '#dbe2f0' : '#64748b' }}></button>
                </div>

                {/* Body */}
                <div
                    style={{
                        ...styles.body,
                        ...(scrollable ? { overflowY: 'auto', flex: 1, minHeight: 0 } : {})
                    }}
                >
                    {children}
                </div>
            </div>
        </div>
    );
}

const styles = {
    backdrop: {
        position: 'fixed',
        inset: 0,
        background: 'rgba(2, 6, 23, 0.72)',
        backdropFilter: 'blur(5px)',
        WebkitBackdropFilter: 'blur(5px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '20px'
    },
    backdropClear: {
        position: 'fixed',
        inset: 0,
        background: 'rgba(2, 6, 23, 0.24)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '20px'
    },
    modal: {
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '20px',
        width: '100%',
        boxShadow: '0 25px 60px rgba(15,23,42,0.15)',
        animation: 'modalIn 0.2s ease-out',
        overflow: 'hidden'
    },
    header: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '20px 24px 16px',
        borderBottom: '1px solid rgba(148, 163, 184, 0.22)',
        background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.01), rgba(15, 23, 42, 0.0))'
    },
    title: {
        color: '#0f172a',
        fontSize: '18px',
        fontWeight: '700',
        margin: 0
    },
    closeBtn: {
        background: '#f1f5f9',
        border: '1px solid #e2e8f0',
        color: '#64748b',
        borderRadius: '8px',
        width: '32px',
        height: '32px',
        cursor: 'pointer',
        fontSize: '14px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
    },
    body: {
        padding: '20px 24px 24px'
    }
};
