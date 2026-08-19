import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Modal from './Modal';

function scrollableBody(container) {
    const divs = Array.from(container.querySelectorAll('div'));
    return divs.find((el) => getComputedStyle(el).overflowY === 'auto') || null;
}

describe('Modal scrollable mode', () => {
    it('caps the modal height to the viewport and scrolls the body while keeping the header fixed', () => {
        const { container } = render(
            <Modal isOpen onClose={() => {}} title="Create Event" scrollable>
                <p>Form content</p>
            </Modal>
        );

        const body = scrollableBody(container);
        expect(body).not.toBeNull();
        expect(body).toHaveStyle({ flex: '1 1 0%' });

        const modal = container.querySelector('[style*="100vh"]');
        expect(modal).not.toBeNull();
        expect(modal).toHaveStyle({ maxHeight: 'calc(100vh - 80px)' });

        const header = container.querySelector('[style*="flex-shrink"]');
        expect(header).not.toBeNull();
        expect(screen.getByRole('heading', { name: 'Create Event' })).toBeInTheDocument();
        expect(header.contains(body)).toBe(false);
    });

    it('renders the form inside the scrollable body so the submit button is reachable and submits normally', () => {
        const onSubmit = vi.fn();
        const { container } = render(
            <Modal isOpen onClose={() => {}} title="Create Event" scrollable>
                <form onSubmit={onSubmit}>
                    <input name="title" placeholder="Event title" />
                    <button type="submit">Create Event</button>
                </form>
            </Modal>
        );

        const body = scrollableBody(container);
        expect(body).not.toBeNull();

        const submit = screen.getByRole('button', { name: 'Create Event' });
        expect(body.contains(submit)).toBe(true);

        fireEvent.submit(screen.getByRole('form'));
        expect(onSubmit).toHaveBeenCalledTimes(1);
    });

    it('keeps the default non-scrollable behavior unchanged', () => {
        const { container } = render(
            <Modal isOpen onClose={() => {}} title="Default">
                <p>Short content</p>
            </Modal>
        );
        expect(scrollableBody(container)).toBeNull();
        expect(container.querySelector('[style*="100vh"]')).toBeNull();
    });
});