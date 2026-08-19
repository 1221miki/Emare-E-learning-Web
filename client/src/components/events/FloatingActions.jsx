import { Phone } from 'lucide-react';
import { FaTelegramPlane, FaWhatsapp } from 'react-icons/fa';

export default function FloatingActions() {
    return (
        <div className="fixed bottom-5 right-5 z-40 flex flex-col items-end gap-3">
            <a href="tel:+251911000000" className="flex items-center gap-2 rounded-full bg-gradient-to-r from-amber-400 to-amber-600 px-4 py-2.5 text-xs font-extrabold text-black shadow-[0_0_20px_rgba(255,193,7,0.5)] transition hover:scale-105">
                <Phone className="h-4 w-4" /> Call Us
            </a>
            <a href="https://t.me/emarehub" target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-full bg-[#229ED9] px-4 py-2.5 text-xs font-extrabold text-white shadow-lg transition hover:scale-105">
                <FaTelegramPlane className="h-4 w-4" /> Telegram
            </a>
            <a href="https://wa.me/251911000000" target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-full bg-[#25D366] px-4 py-2.5 text-xs font-extrabold text-black shadow-lg transition hover:scale-105">
                <FaWhatsapp className="h-4 w-4" /> WhatsApp
            </a>
        </div>
    );
}
