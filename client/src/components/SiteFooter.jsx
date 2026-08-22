import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Phone, Mail, Clock } from 'lucide-react';
import { FaFacebookF, FaTiktok, FaTelegramPlane, FaInstagram, FaLinkedinIn } from 'react-icons/fa';
import { useTheme } from '../context/ThemeContext';

/**
 * Shared site footer block: contact info bar (white), Google map embed,
 * and the main Emare ICT Hub footer. Used on the homepage, About page
 * and Emare Developers page.
 */
export default function SiteFooter() {
    const { colors } = useTheme();

    const s = {
        mapWrap: { width: '100%', lineHeight: 0 },
        map: { display: 'block', width: '100%', height: '380px', border: '0' },
        footer: { padding: '80px 5% 0', borderTop: `1px solid ${colors.border}`, background: colors.bgCard },
        footerGrid: { display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', gap: '40px', maxWidth: '1400px', margin: '0 auto', paddingBottom: '40px' },
        footerTitle: { color: colors.text, fontSize: '15px', fontWeight: '700', margin: '0 0 20px' },
        footerLink: { display: 'block', color: colors.textMuted, textDecoration: 'none', fontSize: '14px', marginBottom: '12px', transition: 'color 0.2s' },
        footerBottom: { borderTop: `1px solid ${colors.border}`, padding: '24px 0', textAlign: 'center', color: colors.textMuted, fontSize: '13px' },
        logoMark: { width: '32px', height: '32px', background: `linear-gradient(135deg, ${colors.primary}, ${colors.accent})`, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '8px', fontWeight: '900', fontSize: '18px' },
        socialBtn: { color: colors.textMuted, fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', borderRadius: '8px', border: '1px solid rgba(51,65,85,0.5)', textDecoration: 'none', transition: 'color 0.2s, border-color 0.2s' }
    };

    const scrollToHomeSection = (id) => (e) => {
        e.preventDefault();
        const el = document.getElementById(id);
        if (el) el.scrollIntoView({ behavior: 'smooth' });
        else window.location.href = `/#${id}`;
    };

    return (
        <>
            {/* ── Contact Info Bar ─────────────────────────── */}
            <section className="w-full bg-white border-t border-slate-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 py-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">

                    {/* Address */}
                    <div className="flex items-start gap-4">
                        <div className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center flex-shrink-0 text-emerald-500">
                            <MapPin size={20} aria-hidden="true" />
                        </div>
                        <div>
                            <h4 className="m-0 mb-2 text-[13px] font-extrabold uppercase tracking-[1.2px] text-emerald-600">Address</h4>
                            <p className="m-0 text-[15px] leading-relaxed font-medium text-slate-800 break-words">Debre Berhan</p>
                        </div>
                    </div>

                    {/* Call For Query */}
                    <div className="flex items-start gap-4">
                        <div className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center flex-shrink-0 text-emerald-500">
                            <Phone size={20} aria-hidden="true" />
                        </div>
                        <div>
                            <h4 className="m-0 mb-2 text-[13px] font-extrabold uppercase tracking-[1.2px] text-emerald-600">Call For Query</h4>
                            <a href="tel:+251914362720" className="block text-[15px] leading-relaxed font-medium text-slate-800 no-underline hover:text-emerald-600 transition-colors">+251 914 362 720</a>
                            <a href="tel:+251905050698" className="block text-[15px] leading-relaxed font-medium text-slate-800 no-underline hover:text-emerald-600 transition-colors">+251 905 050 698</a>
                        </div>
                    </div>

                    {/* Send Us Message */}
                    <div className="flex items-start gap-4">
                        <div className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center flex-shrink-0 text-emerald-500">
                            <Mail size={20} aria-hidden="true" />
                        </div>
                        <div>
                            <h4 className="m-0 mb-2 text-[13px] font-extrabold uppercase tracking-[1.2px] text-emerald-600">Send Us Message</h4>
                            <a href="mailto:info@emareicthub.com" className="block text-[15px] leading-relaxed font-medium text-slate-800 no-underline hover:text-emerald-600 transition-colors break-words">info@emareicthub.com</a>
                            <a href="mailto:emareicthub@gmail.com" className="block text-[15px] leading-relaxed font-medium text-slate-800 no-underline hover:text-emerald-600 transition-colors break-words">emareicthub@gmail.com</a>
                        </div>
                    </div>

                    {/* Opening Hours */}
                    <div className="flex items-start gap-4">
                        <div className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center flex-shrink-0 text-emerald-500">
                            <Clock size={20} aria-hidden="true" />
                        </div>
                        <div>
                            <h4 className="m-0 mb-2 text-[13px] font-extrabold uppercase tracking-[1.2px] text-emerald-600">Opening Hours</h4>
                            <p className="m-0 text-[15px] leading-relaxed font-medium text-slate-800">08:30 AM - 18:00 PM</p>
                        </div>
                    </div>

                </div>
            </section>

            {/* ── Map Embed ────────────────────────────────── */}
            <div style={s.mapWrap}>
                <iframe
                    src="https://maps.google.com/maps?q=Emare%20ICT%20Hub%2C%20Debre%20Berhan%2C%20Ethiopia&t=&z=14&ie=UTF8&iwloc=&output=embed"
                    style={s.map}
                    title="Emare ICT Hub, Debre Berhan, Ethiopia"
                    loading="lazy"
                    allowFullScreen
                    referrerPolicy="no-referrer-when-downgrade"
                />
            </div>

            {/* ── Footer ───────────────────────────────────── */}
            <footer style={s.footer}>
                <div style={s.footerGrid}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                            <div style={s.logoMark}>E</div>
                            <span style={{ color: colors.text, fontWeight: '800', fontSize: '18px' }}>Emare ICT Hub</span>
                        </div>
                        <p style={{ color: colors.textMuted, fontSize: '14px', lineHeight: 1.6, maxWidth: '280px' }}>
                            A Center for Digital Innovation and Technology Development
                        </p>
                        <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                            <a href="https://www.facebook.com/people/%E1%8A%A5%E1%88%9B%E1%88%AC-%E1%8B%A8%E1%88%B5%E1%88%8D%E1%8C%A0%E1%8A%93-%E1%88%9B%E1%8B%95%E1%8A%A8%E1%88%8D-Emare-ICT-Hub/61575108773808/" target="_blank" rel="noopener noreferrer" aria-label="Facebook" style={s.socialBtn}><FaFacebookF /></a>
                            <a href="https://www.tiktok.com/@emareicthub" target="_blank" rel="noopener noreferrer" aria-label="TikTok" style={s.socialBtn}><FaTiktok /></a>
                            <a href="https://t.me/emareicthub" target="_blank" rel="noopener noreferrer" aria-label="Telegram" style={s.socialBtn}><FaTelegramPlane /></a>
                            <a href="https://www.instagram.com/emare_ict_hub?igsh=emllYWtybmlucGh0" target="_blank" rel="noopener noreferrer" aria-label="Instagram" style={s.socialBtn}><FaInstagram /></a>
                            <a href="https://www.linkedin.com/company/emareicthub" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn" style={s.socialBtn}><FaLinkedinIn /></a>
                        </div>
                    </div>
                    <div>
                        <h4 style={s.footerTitle}>Quick Links</h4>
                        <Link to="/about" style={s.footerLink}>About</Link>
                        <Link to="/developers" style={s.footerLink}>Emare Developers</Link>
                        <Link to="/courses" style={s.footerLink}>Course Catalogs</Link>
                        <Link to="/events" style={s.footerLink}>Events</Link>
                        <a href="/#services" style={s.footerLink} onClick={scrollToHomeSection('services')}>Services</a>
                        <a href="/#contact" style={s.footerLink} onClick={scrollToHomeSection('contact')}>Contact</a>
                    </div>
                    <div>
                        <h4 style={s.footerTitle}>Categories</h4>
                        <Link to="/courses?category=Artificial Intelligence" style={s.footerLink}>Artificial Intelligence</Link>
                        <Link to="/courses?category=Business & Management" style={s.footerLink}>Business &amp; Management</Link>
                        <Link to="/courses?category=Cloud Computing" style={s.footerLink}>Cloud Computing</Link>
                        <Link to="/courses?category=Cybersecurity" style={s.footerLink}>Cybersecurity</Link>
                        <Link to="/courses?category=Data Science" style={s.footerLink}>Data Science</Link>
                        <Link to="/courses?category=Databases" style={s.footerLink}>Databases</Link>
                        <Link to="/courses?category=DevOps & CI/CD" style={s.footerLink}>DevOps &amp; CI/CD</Link>
                        <Link to="/courses?category=Graphic Design" style={s.footerLink}>Graphic Design</Link>
                    </div>
                    <div>
                        <h4 style={s.footerTitle}>Support</h4>
                        <Link to="/help" style={s.footerLink}>Help Center</Link>
                        <Link to="/contact" style={s.footerLink}>Contact Us</Link>
                        <Link to="/contact" style={s.footerLink}>Report Issue</Link>
                    </div>
                    <div>
                        <h4 style={s.footerTitle}>Legal</h4>
                        <Link to="/privacy" style={s.footerLink}>Privacy Policy</Link>
                        <Link to="/terms" style={s.footerLink}>Terms &amp; Conditions</Link>
                        <Link to="/cookies" style={s.footerLink}>Cookie Policy</Link>
                    </div>
                </div>
                <div style={s.footerBottom}>
                    <p>© {new Date().getFullYear()} Emare ICT Hub. All rights reserved.</p>
                </div>
            </footer>
        </>
    );
}
