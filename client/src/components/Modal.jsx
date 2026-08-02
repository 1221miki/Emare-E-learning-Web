import React, { useEffect, useRef } from 'react';

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
 */
export default function Modal({ isOpen, onClose, title, children, maxWidth = '480px' }) {
    const modalRef = useRef(null);

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
        <div style={styles.backdrop} onClick={onClose}>
            <div
                ref={modalRef}
                style={{ ...styles.modal, maxWidth }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div style={styles.header}>
                    <h3 style={styles.title}>{title}</h3>
                    <button onClick={onClose} style={styles.closeBtn}>✕</button>
                </div>

                {/* Body */}
                <div style={styles.body}>
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
        background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '20px'
    },
    modal: {
        background: '#1e293b',
        border: '1px solid #334155',
        borderRadius: '20px',
        width: '100%',
        boxShadow: '0 25px 60px rgba(0,0,0,0.5)',
        animation: 'modalIn 0.2s ease-out'
    },
    header: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '20px 24px 0',
    },
    title: {
        color: '#f1f5f9',
        fontSize: '18px',
        fontWeight: '700',
        margin: 0
    },
    closeBtn: {
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid #334155',
        color: '#94a3b8',
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
