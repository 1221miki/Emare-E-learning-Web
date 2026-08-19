import { Link } from 'react-router-dom';
import {
    Instagram,
    Mail,
    MapPin,
    Phone,
    Youtube,
} from 'lucide-react';

export default function EventFooter() {
    const year = new Date().getFullYear();

    return (
        <footer className="relative z-10 mt-24 border-t border-white/5 bg-[#0B0C10]/70">
            <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
                <div>
                    <Link to="/" className="flex items-center gap-2.5">
                        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 text-lg font-black text-black">E</span>
                        <span className="text-[15px] font-extrabold text-white">Emare <span className="text-amber-400">E-Learning</span></span>
                    </Link>
                    <p className="mt-4 max-w-xs text-sm leading-relaxed text-[#9CA3AF]">
                        Ethiopia's Leading Digital Skills School.
                    </p>
                    <div className="mt-5 space-y-2.5 text-sm text-[#9CA3AF]">
                        <li className="flex items-center gap-2"><Mail className="h-4 w-4 text-amber-400" /> info@emarehub.com</li>
                        <li className="flex items-center gap-2"><Phone className="h-4 w-4 text-amber-400" /> +251 911 000 000</li>
                        <li className="flex items-center gap-2"><MapPin className="h-4 w-4 text-amber-400" /> Addis Ababa, Ethiopia</li>
                    </div>
                </div>

                <div>
                    <h4 className="mb-4 text-xs font-extrabold uppercase tracking-[0.2em] text-white">Learning</h4>
                    <ul className="space-y-2.5 text-sm text-[#9CA3AF]">
                        <li><Link to="/courses" className="transition hover:text-amber-400">Courses</Link></li>
                        <li><a href="#" className="transition hover:text-amber-400">E-Books</a></li>
                        <li><Link to="/events" className="transition hover:text-amber-400">Workshop Gallery</Link></li>
                        <li><a href="#" className="transition hover:text-amber-400">Results</a></li>
                    </ul>
                </div>

                <div>
                    <h4 className="mb-4 text-xs font-extrabold uppercase tracking-[0.2em] text-white">Company</h4>
                    <ul className="space-y-2.5 text-sm text-[#9CA3AF]">
                        <li><Link to="/about" className="transition hover:text-amber-400">About Us</Link></li>
                        <li><a href="#" className="transition hover:text-amber-400">Affiliate</a></li>
                        <li><a href="#" className="transition hover:text-amber-400">Testimonials</a></li>
                        <li><a href="#" className="transition hover:text-amber-400">FAQ</a></li>
                    </ul>
                </div>

                <div>
                    <h4 className="mb-4 text-xs font-extrabold uppercase tracking-[0.2em] text-white">Socials</h4>
                    <ul className="space-y-2.5 text-sm text-[#9CA3AF]">
                        <li><a href="#" className="inline-flex items-center gap-2 transition hover:text-amber-400"><Instagram className="h-4 w-4" /> Instagram</a></li>
                        <li><a href="#" className="inline-flex items-center gap-2 transition hover:text-amber-400"><Youtube className="h-4 w-4" /> YouTube</a></li>
                        <li><a href="#" className="transition hover:text-amber-400">Telegram</a></li>
                        <li><a href="#" className="transition hover:text-amber-400">TikTok</a></li>
                    </ul>
                </div>
            </div>

            <div className="mx-auto max-w-7xl border-t border-white/5 px-4 py-6 text-center text-xs text-[#9CA3AF]">
                © {year} Emare E-Learning System. All rights reserved.
            </div>

            <div className="select-none overflow-hidden pb-2 text-center">
                <span className="block bg-gradient-to-b from-white/[0.08] to-transparent bg-clip-text text-[16vw] font-black leading-[0.85] tracking-tight text-transparent sm:text-[11rem]">
                    EMARE E-LEARNING SYSTEM
                </span>
            </div>
        </footer>
    );
}
