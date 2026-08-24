import React from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import SiteFooter from '../components/SiteFooter';
import { useTheme } from '../context/ThemeContext';

export default function AboutPage() {
    const { colors, theme } = useTheme();

    const galleryImages = {
        one: 'https://res.cloudinary.com/afthor2f/image/upload/v1787426018/1.jpg',
        two: 'https://res.cloudinary.com/afthor2f/image/upload/v1787426029/2.jpg',
        three: 'https://res.cloudinary.com/afthor2f/image/upload/v1787426042/3.jpg',
        four: 'https://res.cloudinary.com/afthor2f/image/upload/v1787426053/4.jpg',
        five: 'https://res.cloudinary.com/afthor2f/image/upload/v1787426062/5.jpg',
        six: 'https://res.cloudinary.com/afthor2f/image/upload/v1787426074/6.jpg'
    };

    const s = {
        page: { minHeight: '100vh', fontFamily: "'Outfit', 'Inter', sans-serif" },
        wrapper: { maxWidth: '1200px', margin: '0 auto', padding: '100px 5%' },
        hero: { display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: '40px', alignItems: 'center' },
        left: { display: 'flex', flexDirection: 'column', gap: '28px' },
        badge: { display: 'inline-block', padding: '8px 22px', background: 'rgba(34,197,94,0.12)', color: '#4ade80', borderRadius: '999px', fontWeight: '700', fontSize: '13px', letterSpacing: '0.12em', textTransform: 'uppercase', border: '1px solid rgba(34,197,94,0.24)' },
        title: { fontSize: '54px', fontWeight: '900', lineHeight: '1.03', margin: '0', color: colors.text, maxWidth: '700px' },
        description: { fontSize: '17px', lineHeight: '1.9', color: colors.textMuted, maxWidth: '760px' },
        card: { background: 'transparent', border: 'none', borderRadius: '28px', padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px', minHeight: '420px' },
        cardLogo: { width: '100%', maxWidth: '560px', objectFit: 'contain', mixBlendMode: theme === 'dark' ? 'screen' : 'multiply' },
        cardTitle: { fontSize: '28px', fontWeight: '900', margin: '0', color: colors.text },
        cardSubtitle: { fontSize: '13px', fontWeight: '700', letterSpacing: '0.2em', textTransform: 'uppercase', color: colors.primary, margin: '0' },
        cardUrl: { fontSize: '13px', color: colors.textMuted, letterSpacing: '0.12em', marginTop: '6px' },
        footer: { padding: '24px 0 40px', textAlign: 'center', color: colors.textMuted, fontSize: '13px' },
        fLink: { color: colors.textMuted, textDecoration: 'none' },
        mobileStack: { display: 'grid', gap: '32px' }
    };

    return (
        <div style={{ ...s.page, background: colors.bg, color: colors.text }}>
            <Navbar />
            <div style={s.wrapper}>
                <div style={s.hero}>
                    <div style={s.left}>
                        <span style={s.badge}>About Us</span>
                        <h1 style={s.title}>Digital Innovation and System Development Center</h1>
                        <p style={s.description}>
                            Emare ICT Hub is designed to become a leading platform for digital skills development, technology entrepreneurship, and innovation in Debre Birhan City. This center offers a comprehensive ecosystem for tech growth, providing accessible digital tools, training, mentorship, and collaboration opportunities to local tech professionals, startups, and businesses.
                        </p>
                        <p style={s.description}>
                            Crucially, Emare ICT Hub also features its own high-skilled development team, focused on creating and delivering cutting-edge systems and solutions. This internal capacity allows us to drive innovation from within and support the wider community. With the growing importance of technology in driving economic development, the Emare ICT Hub will be a vital player in fostering a tech-savvy community, empowering young innovators, and creating job opportunities through digital literacy.
                        </p>
                    </div>

                    <div style={s.card}>
                        <img src="/images/Real Emare ICT Hub logo.png" alt="Emare ICT Hub" style={s.cardLogo} />
                    </div>
                </div>

                {/* ── Bento Grid Photo Gallery ─────────────────── */}
                <section className="mt-12 w-full">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

                        {/* Top Left — Hero Card */}
                        <div className="rounded-3xl overflow-hidden group">
                            <img
                                src={galleryImages.one}
                                alt="Emare ICT Hub team"
                                loading="lazy"
                                className="w-full h-[380px] object-cover transition-transform duration-500 group-hover:scale-105"
                            />
                        </div>

                        {/* Top Center — 2x2 Sub-Grid */}
                        <div className="grid grid-cols-2 gap-4 h-[380px]">
                            {[galleryImages.two, galleryImages.three, galleryImages.four, galleryImages.five].map((src, i) => (
                                <div key={i} className="rounded-2xl overflow-hidden group">
                                    <img
                                        src={src}
                                        alt={`Gallery photo ${i + 2}`}
                                        loading="lazy"
                                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                    />
                                </div>
                            ))}
                        </div>

                        {/* Top Right — Tall Portrait Card (spans both rows) */}
                        <div className="relative rounded-3xl overflow-hidden group lg:row-span-2 lg:col-start-3 lg:row-start-1">
                            <img
                                src={galleryImages.six}
                                alt="PD session portrait"
                                loading="lazy"
                                className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                            />
                            {/* Overlay label */}
                            <span className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-sm text-white text-xs font-bold tracking-[0.18em] uppercase px-4 py-2 rounded-full border border-white/20">
                                PD Session
                            </span>
                        </div>

                        {/* Bottom Row — Two Wide Banners */}
                        <div className="rounded-3xl overflow-hidden group lg:col-start-1 lg:row-start-2">
                            <img
                                src={galleryImages.one}
                                alt="Team wide banner"
                                loading="lazy"
                                className="w-full h-[220px] object-cover transition-transform duration-500 group-hover:scale-105"
                            />
                        </div>
                        <div className="rounded-3xl overflow-hidden group lg:col-start-2 lg:row-start-2">
                            <img
                                src={galleryImages.six}
                                alt="Portrait wide banner"
                                loading="lazy"
                                className="w-full h-[220px] object-cover transition-transform duration-500 group-hover:scale-105"
                            />
                        </div>

                    </div>
                </section>
            </div>
            <SiteFooter />
        </div>
    );
}
