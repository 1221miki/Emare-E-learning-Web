import { Link } from 'react-router-dom';
import {
    Mail,
    MapPin,
    Phone,
} from 'lucide-react';
import { FaFacebookF, FaTiktok, FaTelegramPlane, FaInstagram, FaLinkedinIn } from 'react-icons/fa';
import { useTheme } from '../../context/ThemeContext';

export default function EventFooter() {
    const year = new Date().getFullYear();
    const { theme } = useTheme();
    const isDark = theme === 'dark';

    return (
        <footer className={`relative z-10 mt-24 border-t transition-colors duration-200 ${
            isDark
                ? 'border-white/10 bg-[#0B0C10]/85 text-white'
                : 'border-slate-200 bg-white/95 text-slate-900 shadow-sm'
        }`}>
            <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.4fr_1fr]">
                <div>
                    <Link to="/" className="flex items-center gap-2.5">
                        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-green-500 to-green-600 text-lg font-black text-black">E</span>
                        <span className={`text-[15px] font-extrabold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                            Emare <span className="text-green-600 dark:text-green-500">E-Learning</span>
                        </span>
                    </Link>
                    <p className={`mt-4 max-w-xs text-sm leading-relaxed ${isDark ? 'text-[#9CA3AF]' : 'text-slate-600'}`}>
                        Ethiopia's Leading Digital Skills School.
                    </p>
                    <div className={`mt-5 space-y-2.5 text-sm ${isDark ? 'text-[#9CA3AF]' : 'text-slate-600'}`}>
                        <li className="flex items-center gap-2"><Mail className="h-4 w-4 text-green-600 dark:text-green-500" /> info@emareicthub.com</li>
                        <li className="flex items-center gap-2"><Phone className="h-4 w-4 text-green-600 dark:text-green-500" /> +251 914 362 720 / +251 905 050 698</li>
                        <li className="flex items-center gap-2"><MapPin className="h-4 w-4 text-green-600 dark:text-green-500" /> Debre Berhan, Ethiopia</li>
                    </div>
                </div>

                <div>
                    <h4 className={`mb-4 text-xs font-extrabold uppercase tracking-[0.2em] ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        Socials
                    </h4>
                    <ul className={`space-y-2.5 text-sm ${isDark ? 'text-[#9CA3AF]' : 'text-slate-600'}`}>
                        <li><a href="https://www.facebook.com/people/%E1%8A%A5%E1%88%9B%E1%88%AC-%E1%8B%A8%E1%88%B5%E1%88%8D%E1%8C%A0%E1%8A%93-%E1%88%9B%E1%8B%95%E1%8A%A8%E1%88%8D-Emare-ICT-Hub/61575108773808/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 transition hover:text-green-600 dark:hover:text-green-500"><FaFacebookF className="h-4 w-4" /> Facebook</a></li>
                        <li><a href="https://www.tiktok.com/@emareicthub" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 transition hover:text-green-600 dark:hover:text-green-500"><FaTiktok className="h-4 w-4" /> TikTok</a></li>
                        <li><a href="https://t.me/emareicthub" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 transition hover:text-green-600 dark:hover:text-green-500"><FaTelegramPlane className="h-4 w-4" /> Telegram</a></li>
                        <li><a href="https://www.instagram.com/emare_ict_hub?igsh=emllYWtybmlucGh0" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 transition hover:text-green-600 dark:hover:text-green-500"><FaInstagram className="h-4 w-4" /> Instagram</a></li>
                        <li><a href="https://www.linkedin.com/company/emareicthub" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 transition hover:text-green-600 dark:hover:text-green-500"><FaLinkedinIn className="h-4 w-4" /> LinkedIn</a></li>
                    </ul>
                </div>
            </div>

            <div className={`mx-auto max-w-7xl border-t px-4 py-6 text-center text-xs ${
                isDark ? 'border-white/10 text-[#9CA3AF]' : 'border-slate-200 text-slate-500'
            }`}>
                © {year} Emare E-Learning System. All rights reserved.
            </div>
        </footer>
    );
}
