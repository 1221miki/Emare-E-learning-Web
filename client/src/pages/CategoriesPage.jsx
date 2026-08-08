import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { categoryService, courseService } from '../services/api';
import Navbar from '../components/Navbar';
import EmareTeamSection from '../components/EmareTeamSection';
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
    const location = useLocation();

    const [categories, setCategories] = useState([]);
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedCat, setSelectedCat] = useState(null);
    const [searchCat, setSearchCat] = useState('');
    const [hoveredCategory, setHoveredCategory] = useState(null);

    useEffect(() => {
        Promise.all([categoryService.getAll(), courseService.getAll()])
            .then(([catRes, courseRes]) => {
                const cats = catRes.data?.data || [];
                setCategories(cats.length > 0 ? cats : FALLBACK_CATEGORIES);
                setCourses(courseRes.data?.data || []);
            })
            .catch(() => {
                setCategories(FALLBACK_CATEGORIES);
            })
            .finally(() => setLoading(false));
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
    const SelectedIcon = selectedCat?.icon;

    const s = {
        page: { minHeight: '100vh', background: colors.bg, fontFamily: "'Outfit','Inter',sans-serif" },
        hero: { background: `linear-gradient(135deg, ${colors.primary}15, ${colors.accent}15)`, padding: '80px 5% 60px', textAlign: 'center', borderBottom: `1px solid ${colors.border}` },
        heroTitle: { fontSize: '48px', fontWeight: '900', color: colors.text, margin: '0 0 16px', letterSpacing: '-1px' },
        heroSub: { color: colors.textMuted, fontSize: '18px', margin: '0 0 32px' },
        searchBar: { display: 'flex', maxWidth: '500px', margin: '0 auto', background: colors.bgCard, borderRadius: '12px', border: `1px solid ${colors.border}`, overflow: 'hidden' },
        searchInput: { flex: 1, background: 'transparent', border: 'none', color: colors.text, padding: '16px 20px', fontSize: '15px', outline: 'none' },
        container: { maxWidth: '1200px', margin: '0 auto', padding: '60px 24px' },
        sectionTitle: { fontSize: '28px', fontWeight: '800', color: colors.text, margin: '0 0 8px' },
        sectionSub: { color: colors.textMuted, fontSize: '15px', margin: '0 0 40px' },
        grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '20px', marginBottom: '60px' },
        catCard: { borderRadius: '16px', padding: '28px 24px', cursor: 'pointer', transition: 'all 0.25s', textDecoration: 'none', display: 'block', position: 'relative', overflow: 'hidden' },
        catIcon: { fontSize: '44px', marginBottom: '14px', display: 'block' },
        catName: { fontSize: '17px', fontWeight: '700', margin: '0 0 6px' },
        catCount: { fontSize: '13px', fontWeight: '500', opacity: 0.8 },
        badge: { position: 'absolute', top: '12px', right: '12px', background: 'rgba(255,255,255,0.2)', padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700' },
        detailPanel: { background: colors.bgCard, border: `1px solid ${colors.border}`, borderRadius: '20px', padding: '40px', marginTop: '8px' },
        detailTitle: { fontSize: '24px', fontWeight: '800', color: colors.text, margin: '0 0 8px' },
        detailSub: { color: colors.textMuted, fontSize: '14px', margin: '0 0 28px' },
        courseGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '16px' },
        courseCard: { background: colors.bg, border: `1px solid ${colors.border}`, borderRadius: '12px', overflow: 'hidden', cursor: 'pointer', transition: 'transform 0.2s' },
        courseCardImg: { height: '140px', background: `linear-gradient(135deg, ${colors.primary}15, ${colors.accent}15)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '36px' },
        courseCardBody: { padding: '16px' },
        courseCardTitle: { fontSize: '14px', fontWeight: '700', color: colors.text, margin: '0 0 6px', lineHeight: 1.4 },
        courseCardMeta: { fontSize: '12px', color: colors.textMuted, display: 'flex', gap: '8px', alignItems: 'center', margin: '6px 0' },
        courseCardPrice: { fontSize: '16px', fontWeight: '800', color: colors.text },
        catDesc: { fontSize: '13px', lineHeight: '1.6', color: colors.textMuted, margin: 0, minHeight: '42px' },
        emptyMsg: { color: colors.textMuted, textAlign: 'center', padding: '40px', fontSize: '15px' },
        statsRow: { display: 'flex', gap: '40px', justifyContent: 'center', margin: '0 0 60px' },
        statBox: { textAlign: 'center', background: colors.bgCard, border: `1px solid ${colors.border}`, borderRadius: '16px', padding: '28px 40px' },
        statVal: { display: 'block', fontSize: '36px', fontWeight: '900', color: colors.text },
        statLbl: { fontSize: '13px', color: colors.textMuted, fontWeight: '600', textTransform: 'uppercase' },
        closeBtn: { background: colors.bgInput, border: `1px solid ${colors.border}`, color: colors.textMuted, borderRadius: '8px', padding: '6px 14px', cursor: 'pointer', fontWeight: '600', fontSize: '13px', marginBottom: '24px' }
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
                        { val: '150+', lbl: 'Instructors' },
                        { val: '25k+', lbl: 'Students' }
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

                {loading ? (
                    <div style={s.emptyMsg}>Loading categories...</div>
                ) : (
                    <div style={s.grid}>
                        {displayCats.map((cat, i) => {
                            const count = coursesForCat(cat.name).length;
                            const hasCourses = count > 0;
                            const meta = CATEGORY_META[cat.name] || CATEGORY_META[cat.technicalCategory] || { icon: BookOpen, description: 'Explore this learning path and discover new courses.' };
                            const Icon = meta.icon;
                            const color = cat.color || CAT_COLORS[i % CAT_COLORS.length];
                            const isSelected = selectedCat?.name === cat.name;
                            return (
                                <div
                                    key={cat._id || i}
                                    style={{
                                        ...s.catCard,
                                        background: isSelected
                                            ? `linear-gradient(135deg, ${color}, ${color}cc)`
                                            : theme === 'dark' ? `${color}12` : `${color}10`,
                                        border: `2px solid ${isSelected ? color : color + '30'}`,
                                        color: isSelected ? '#fff' : colors.text,
                                        transform: isSelected ? 'scale(1.02)' : 'scale(1)',
                                        cursor: 'pointer'
                                    }}
                                    onClick={() => setSelectedCat(isSelected ? null : { ...cat, color, icon: meta.icon, count })}
                                    onMouseEnter={() => setHoveredCategory(cat._id || cat.name)}
                                    onMouseLeave={() => setHoveredCategory(null)}
                                >
                                    <div style={{ ...s.catIcon, color: isSelected ? '#fff' : color }}><Icon size={32} /></div>
                                    <div style={{ ...s.catName, color: isSelected ? '#fff' : colors.text }}>{cat.name}</div>
                                    <p style={{ ...s.catDesc, color: isSelected ? 'rgba(255,255,255,0.85)' : colors.textMuted }}>{meta.description}</p>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginTop: 14 }}>
                                        <span style={{ ...s.catCount, color: isSelected ? 'rgba(255,255,255,0.8)' : colors.textMuted }}>
                                            {hasCourses ? `${count} course${count === 1 ? '' : 's'}` : 'Coming soon'}
                                        </span>
                                        <span style={{ ...s.badge, background: isSelected ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.18)', color: isSelected ? '#fff' : color, display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 10px', fontSize: 12, fontWeight: 700, borderRadius: 999, textTransform: 'uppercase' }}>
                                            {hasCourses ? 'Browse' : 'Soon'}
                                            <ArrowRight size={12} style={{ transform: hoveredCategory === (cat._id || cat.name) ? 'translateX(4px)' : 'translateX(0)', transition: 'transform 0.2s ease' }} />
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Selected Category Detail Panel */}
                {selectedCat && (
                    <div style={s.detailPanel}>
                        <button style={s.closeBtn} onClick={() => setSelectedCat(null)}> Close</button>
                        <h2 style={s.detailTitle}>{SelectedIcon ? <SelectedIcon size={20} style={{ verticalAlign: 'middle', marginRight: '8px' }} /> : null}{selectedCat.name}</h2>
                        <p style={s.detailSub}>
                            {coursesForCat(selectedCat.name).length} courses available in this category
                            {' — '}
                            <button
                                style={{ background: 'none', border: 'none', color: selectedCat.color, cursor: 'pointer', fontWeight: '700', fontSize: '14px', padding: 0 }}
                                onClick={() => navigate(`/courses?category=${encodeURIComponent(selectedCat.name)}`)}
                            >
                                View all in catalog →
                            </button>
                        </p>
                        {coursesForCat(selectedCat.name).length === 0 ? (
                            <div style={s.emptyMsg}>
                                No courses yet in this category.{' '}
                                <button
                                    style={{ background: 'none', border: 'none', color: colors.primary, cursor: 'pointer', fontWeight: '600', padding: 0 }}
                                    onClick={() => navigate('/courses')}
                                >
                                    Browse all courses
                                </button>
                            </div>
                        ) : (
                            <div style={s.courseGrid}>
                                {coursesForCat(selectedCat.name).slice(0, 8).map(c => (
                                    <div
                                        key={c._id}
                                        style={s.courseCard}
                                        onClick={() => navigate(`/courses/${c._id}`)}
                                        onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-3px)'}
                                        onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                                    >
                                        <div style={s.courseCardImg}>
                                            {c.thumbnailUrl
                                                ? <img src={c.thumbnailUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                : '◈'}
                                        </div>
                                        <div style={s.courseCardBody}>
                                            <h4 style={s.courseCardTitle}>{c.courseTitle}</h4>
                                            <div style={s.courseCardMeta}>
                                                <span> {c.averageRating || '4.8'}</span>
                                                <span>·</span>
                                                <span>{c.level || 'Beginner'}</span>
                                                <span>·</span>
                                                <span>{c.estimatedDurationHours || 5}h</span>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <span style={s.courseCardPrice}>{c.price === 0 ? '🆓 Free' : `${c.price} ETB`}</span>
                                                <span style={{ fontSize: '11px', color: colors.textMuted }}>By {c.creatorRef?.fullName || 'Instructor'}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                        {coursesForCat(selectedCat.name).length > 8 && (
                            <div style={{ textAlign: 'center', marginTop: '24px' }}>
                                <button
                                    style={{ background: `linear-gradient(135deg, ${selectedCat.color}, ${selectedCat.color}aa)`, color: '#fff', border: 'none', borderRadius: '10px', padding: '12px 28px', fontWeight: '700', cursor: 'pointer', fontSize: '14px' }}
                                    onClick={() => navigate(`/courses?category=${encodeURIComponent(selectedCat.name)}`)}
                                >
                                    View All {coursesForCat(selectedCat.name).length} Courses →
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
            <EmareTeamSection />
        </div>
    );
}
