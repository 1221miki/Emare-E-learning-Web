import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { categoryService, courseService, userService } from '../services/api';
import Navbar from '../components/Navbar';
import { useTheme } from '../context/ThemeContext';
import { BookOpen, Wifi, Cpu, Shield, Globe, Smartphone, BarChart3, Palette, Briefcase, Cloud, Database, Terminal, ArrowRight } from 'lucide-react';
import { categoryMatchesCourse } from '../utils/categoryMatching';

const FALLBACK_CATEGORIES = [
    { _id: 'prog', name: 'Programming', color: '#3b82f6' },
    { _id: 'web', name: 'Web Development', color: '#06b6d4' },
    { _id: 'ai', name: 'Artificial Intelligence', color: '#10b981' },
    { _id: 'sec', name: 'Cybersecurity', color: '#f59e0b' },
    { _id: 'data', name: 'Data Science', color: '#14b8a6' },
    { _id: 'mob', name: 'Mobile Development', color: '#ec4899' },
    { _id: 'cloud', name: 'Cloud Computing', color: '#64748b' },
    { _id: 'devops', name: 'DevOps & CI/CD', color: '#6366f1' },
    { _id: 'design', name: 'Graphic Design', color: '#a855f7' },
    { _id: 'biz', name: 'Business & Management', color: '#84cc16' },
    { _id: 'db', name: 'Databases', color: '#f97316' },
    { _id: 'net', name: 'Networking', color: '#8b5cf6' }
];

const CATEGORY_META = {
    Programming: { icon: BookOpen, description: 'Code fundamentals, algorithms, and backend systems.' },
    'Web Development': { icon: Globe, description: 'Build responsive websites, apps, and interfaces.' },
    'Artificial Intelligence': { icon: Cpu, description: 'AI, machine learning, and intelligent systems.' },
    Cybersecurity: { icon: Shield, description: 'Protect systems with security tools and best practices.' },
    'Data Science': { icon: BarChart3, description: 'Data analysis, modeling, and insights.' },
    'Mobile Development': { icon: Smartphone, description: 'Create apps for Android and iOS devices.' },
    'Cloud Computing': { icon: Cloud, description: 'Manage cloud infrastructure and services.' },
    'DevOps & CI/CD': { icon: Terminal, description: 'Automate deployments, pipelines, and operations.' },
    'Graphic Design': { icon: Palette, description: 'Design digital visuals, branding, and UX.' },
    'Business & Management': { icon: Briefcase, description: 'Leadership, strategy, and business growth.' },
    Databases: { icon: Database, description: 'Design and optimize data storage systems.' },
    Networking: { icon: Wifi, description: 'Connect systems, troubleshoot networks, and scale infrastructure.' },
    'Web Coding': { icon: Globe, description: 'Build frontend and backend web experiences.' },
    Business: { icon: Briefcase, description: 'Leadership, strategy, and business growth.' }
};
const CAT_COLORS = ['#3b82f6','#8b5cf6','#10b981','#f59e0b','#06b6d4','#ec4899','#14b8a6','#a855f7','#84cc16','#64748b','#f97316','#6366f1'];

export default function CategoriesPage() {
    const { colors, theme } = useTheme();
    const navigate = useNavigate();

    const [categories, setCategories] = useState(FALLBACK_CATEGORIES);
    const [courses, setCourses] = useState([]);
    const [searchCat, setSearchCat] = useState('');
    const [hoveredCategory, setHoveredCategory] = useState(null);
    const [platformStats, setPlatformStats] = useState(null); // real stats from DB

    useEffect(() => {
        Promise.all([categoryService.getAll(), courseService.getAll(), userService.getPublicStats()])
            .then(([catRes, courseRes, statsRes]) => {
                const cats = catRes.data?.data || [];
                setCategories(cats.length > 0 ? cats : FALLBACK_CATEGORIES);
                setCourses(courseRes.data?.data || []);
                setPlatformStats(statsRes.data?.data || null);
            })
            .catch(() => {
                setCategories(FALLBACK_CATEGORIES);
            });
    }, []);

    const filteredCats = categories.filter(c =>
        c.name.toLowerCase().includes(searchCat.toLowerCase())
    );

    const coursesForCat = (catName) =>
        courses.filter(c => {
            const isPublished = ['Published', 'Active'].includes(c.publicationState);
            return isPublished && categoryMatchesCourse(catName, c.technicalCategory);
        });

    const sortedCats = [...filteredCats].sort((a, b) => {
        const aCount = coursesForCat(a.name).length;
        const bCount = coursesForCat(b.name).length;
        if (aCount !== bCount) return bCount - aCount;
        return a.name.localeCompare(b.name);
    });

    const displayCats = searchCat ? sortedCats : sortedCats.slice(0, 8);

    const s = {
        page: { minHeight: '100vh', background: colors.bg, fontFamily: "'Outfit','Inter',sans-serif" },
        hero: { background: `linear-gradient(135deg, ${colors.primary}15, ${colors.accent}15)`, padding: '80px 5% 60px', textAlign: 'center', borderBottom: `1px solid ${colors.border}` },
        heroTitle: { fontSize: '48px', fontWeight: '900', color: colors.text, margin: '0 0 16px', letterSpacing: '-1px' },
        heroSub: { color: colors.textMuted, fontSize: '18px', margin: '0 0 32px' },
        searchBar: { display: 'flex', maxWidth: '500px', margin: '0 auto', background: colors.bgCard, borderRadius: '12px', border: `1px solid ${colors.border}`, overflow: 'hidden' },
        searchInput: { flex: 1, background: 'transparent', border: 'none', color: colors.text, padding: '16px 20px', fontSize: '15px', outline: 'none' },
        container: { maxWidth: '1200px', margin: '0 auto', padding: '60px 24px 80px' },
        sectionTitle: { fontSize: '28px', fontWeight: '800', color: colors.text, margin: '0 0 8px' },
        sectionSub: { color: colors.textMuted, fontSize: '15px', margin: '0 0 40px' },
        grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '20px', marginBottom: '60px' },
        catCard: { borderRadius: '16px', padding: '28px 24px', cursor: 'pointer', transition: 'all 0.25s', textDecoration: 'none', display: 'block', position: 'relative', overflow: 'hidden' },
        catIcon: { fontSize: '44px', marginBottom: '14px', display: 'block' },
        catName: { fontSize: '17px', fontWeight: '700', margin: '0 0 6px' },
        catCount: { fontSize: '13px', fontWeight: '500', opacity: 0.8 },
        badge: { position: 'absolute', top: '12px', right: '12px', background: 'rgba(255,255,255,0.2)', padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700' },
        catDesc: { fontSize: '13px', lineHeight: '1.6', color: colors.textMuted, margin: 0, minHeight: '42px' },
        emptyMsg: { color: colors.textMuted, textAlign: 'center', padding: '40px', fontSize: '15px' },
        statsRow: { display: 'flex', gap: '40px', justifyContent: 'center', margin: '0 0 60px' },
        statBox: { textAlign: 'center', background: colors.bgCard, border: `1px solid ${colors.border}`, borderRadius: '16px', padding: '28px 40px' },
        statVal: { display: 'block', fontSize: '36px', fontWeight: '900', color: colors.text },
        statLbl: { fontSize: '13px', color: colors.textMuted, fontWeight: '600', textTransform: 'uppercase' }
    };

    return (
        <div style={s.page}>
            <Navbar />

            {/* Hero */}
            <div style={s.hero}>
                <span style={{ display: 'inline-block', padding: '6px 18px', background: `${colors.primary}15`, color: colors.primary, borderRadius: '20px', fontWeight: '700', fontSize: '13px', marginBottom: '20px', border: `1px solid ${colors.primary}30` }}>
                    Browse by Topic
                </span>
                <h1 style={s.heroTitle}>Explore All Categories</h1>
                <p style={s.heroSub}>Find the perfect course in your area of interest</p>
                <div style={s.searchBar}>
                    <span style={{ padding: '16px 16px 16px 20px', fontSize: '18px' }}>⌕</span>
                    <input
                        type="text"
                        placeholder="Search categories..."
                        value={searchCat}
                        onChange={e => setSearchCat(e.target.value)}
                        style={s.searchInput}
                    />
                </div>
            </div>

            <div style={s.container}>
                {/* Summary Stats */}
                <div style={s.statsRow}>
                    {[
                        { val: categories.length, lbl: 'Categories' },
                        { val: `${courses.length}+`, lbl: 'Courses' },
                        { val: `${platformStats?.totalInstructors || 0}+`, lbl: 'Instructors' },
                        { val: `${platformStats?.totalStudents || 0}+`, lbl: 'Students' }
                    ].map((st, i) => (
                        <div key={i} style={s.statBox}>
                            <span style={s.statVal}>{st.val}</span>
                            <span style={s.statLbl}>{st.lbl}</span>
                        </div>
                    ))}
                </div>

                {/* Category Grid */}
                <h2 style={s.sectionTitle}>All Categories</h2>
                <p style={s.sectionSub}>Click on a category to explore its courses</p>

                <div style={s.grid}>
                    {displayCats.map((cat, i) => {
                            const count = coursesForCat(cat.name).length;
                            const hasCourses = count > 0;
                            const meta = CATEGORY_META[cat.name] || CATEGORY_META[cat.technicalCategory] || { icon: BookOpen, description: 'Explore this learning path and discover new courses.' };
                            const Icon = meta.icon;
                            const color = cat.color || CAT_COLORS[i % CAT_COLORS.length];
                            return (
                                <div
                                    key={cat._id || i}
                                    style={{
                                        ...s.catCard,
                                        background: theme === 'dark' ? `${color}12` : `${color}10`,
                                        border: `2px solid ${color}30`,
                                        color: colors.text,
                                        cursor: 'pointer'
                                    }}
                                    onClick={() => navigate(`/courses?category=${encodeURIComponent(cat.name)}`)}
                                    onMouseEnter={() => setHoveredCategory(cat._id || cat.name)}
                                    onMouseLeave={() => setHoveredCategory(null)}
                                >
                                    <div style={{ ...s.catIcon, color }}><Icon size={32} /></div>
                                    <div style={{ ...s.catName, color: colors.text }}>{cat.name}</div>
                                    <p style={{ ...s.catDesc, color: colors.textMuted }}>{meta.description}</p>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginTop: 14 }}>
                                        <span style={{ ...s.catCount, color: colors.textMuted }}>
                                            {hasCourses ? `${count} course${count === 1 ? '' : 's'}` : 'Coming soon'}
                                        </span>
                                        <span style={{ ...s.badge, color, display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 10px', fontSize: 12, fontWeight: 700, borderRadius: 999, textTransform: 'uppercase' }}>
                                            {hasCourses ? 'Browse' : 'Soon'}
                                            <ArrowRight size={12} style={{ transform: hoveredCategory === (cat._id || cat.name) ? 'translateX(4px)' : 'translateX(0)', transition: 'transform 0.2s ease' }} />
                                        </span>
                                    </div>
                                </div>
                            );
                    })}
                </div>
            </div>
        </div>
    );
}
