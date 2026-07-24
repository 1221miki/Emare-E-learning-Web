import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { courseService, categoryService, wishlistService } from '../../services/api';
import { useNavigate, useLocation } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import GuestModal from '../../components/GuestModal';

function useQuery() {
    return new URLSearchParams(useLocation().search);
}

const SORT_OPTIONS = [
    { value: 'newest', label: '🆕 Newest First' },
    { value: 'popular', label: '🔥 Most Popular' },
    { value: 'rating', label: '⭐ Highest Rated' },
    { value: 'price_low', label: '💰 Price: Low → High' },
    { value: 'price_high', label: '💎 Price: High → Low' },
    { value: 'duration_short', label: '⚡ Shortest First' },
    { value: 'duration_long', label: '📚 Longest First' }
];

const EMOJI_MAP = { 'Web Coding': '🌐', 'Creative Media': '🎨', 'Robotics Hardware': '🤖', 'Network Engineering': '🔌', 'Mobile Development': '📱', 'Data Science': '📊', 'Cyber Security': '🛡️', 'Cloud Computing': '☁️', 'Artificial Intelligence': '🧠', 'Business & Marketing': '💼' };
const EMOJIS = ['🎓', '💻', '📊', '🔬', '🎨', '🚀', '🧠', '⚙️', '📱', '🌐'];

export default function CourseCatalog() {
    const { isAuthenticated } = useAuth();
    const { colors, theme } = useTheme();
    const navigate = useNavigate();
    const urlParams = useQuery();

    const [courses, setCourses] = useState([]);
    const [categories, setCategories] = useState([]);
    const [wishlistIds, setWishlistIds] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeSection, setActiveSection] = useState('all');

    // Filters
    const [filterCategory, setFilterCategory] = useState(urlParams.get('category') || 'All');
    const [filterLevel, setFilterLevel] = useState(urlParams.get('level') || 'All');
    const [filterLanguage, setFilterLanguage] = useState('All');
    const [filterPrice, setFilterPrice] = useState(urlParams.get('free') === 'true' ? 'Free' : 'All');
    const [filterRating, setFilterRating] = useState(0);
    const [filterDuration, setFilterDuration] = useState('All');
    const [filterInstructor, setFilterInstructor] = useState('All');
    const [filterCertificate, setFilterCertificate] = useState(false);
    const [searchQuery, setSearchQuery] = useState(urlParams.get('search') || '');
    const [sortBy, setSortBy] = useState('newest');
    const [viewMode, setViewMode] = useState('grid');
    const [guestModal, setGuestModal] = useState({ open: false, action: '' });

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [resCourses, resCats] = await Promise.all([courseService.getAll(), categoryService.getAll()]);
                setCourses(resCourses.data?.data || []);
                setCategories([{ name: 'All' }, ...(resCats.data?.data || [])]);
                if (isAuthenticated) {
                    try {
                        const wRes = await wishlistService.getMyWishlist();
                        setWishlistIds((wRes.data?.data || []).map(w => w.courseRef?._id || w.courseRef || w._id));
                    } catch (e) { /* optional */ }
                }
            } catch (e) { console.error(e); }
            finally { setLoading(false); }
        };
        fetchData();
    }, [isAuthenticated]);

    const instructors = useMemo(() => {
        return ['All', ...new Set(courses.map(c => c.creatorRef?.fullName).filter(Boolean))];
    }, [courses]);

    const sectionCourses = useMemo(() => {
        if (activeSection === 'featured') return courses.filter(c => c.isFeatured || (c.averageRating || 0) >= 4.5);
        if (activeSection === 'trending') return [...courses].sort((a, b) => (b.totalEnrollments || 0) - (a.totalEnrollments || 0)).slice(0, 24);
        if (activeSection === 'newest') return [...courses].sort((a, b) => new Date(b.creationTimestamp || b.createdAt || 0) - new Date(a.creationTimestamp || a.createdAt || 0)).slice(0, 24);
        if (activeSection === 'certificates') return courses.filter(c => c.hasCertificate !== false);
        return courses;
    }, [courses, activeSection]);

    const filtered = useMemo(() => sectionCourses
        .filter(c => {
            if (filterCategory !== 'All' && c.technicalCategory !== filterCategory) return false;
            if (filterLevel !== 'All' && c.level !== filterLevel) return false;
            if (filterLanguage !== 'All' && c.language !== filterLanguage) return false;
            if (filterPrice === 'Free' && c.price !== 0) return false;
            if (filterPrice === 'Paid' && (c.price || 0) === 0) return false;
            if (filterRating > 0 && (c.averageRating || 0) < filterRating) return false;
            if (filterDuration === '<5' && (c.estimatedDurationHours || 0) >= 5) return false;
            if (filterDuration === '5-20' && ((c.estimatedDurationHours || 0) < 5 || (c.estimatedDurationHours || 0) > 20)) return false;
            if (filterDuration === '>20' && (c.estimatedDurationHours || 0) <= 20) return false;
            if (filterInstructor !== 'All' && c.creatorRef?.fullName !== filterInstructor) return false;
            if (filterCertificate && c.hasCertificate === false) return false;
            if (searchQuery) {
                const q = searchQuery.toLowerCase();
                if (!(c.courseTitle?.toLowerCase().includes(q) || c.descriptionText?.toLowerCase().includes(q) || c.creatorRef?.fullName?.toLowerCase().includes(q) || c.technicalCategory?.toLowerCase().includes(q))) return false;
            }
            return true;
        })
        .sort((a, b) => {
            if (sortBy === 'rating') return (b.averageRating || 0) - (a.averageRating || 0);
            if (sortBy === 'popular') return (b.totalEnrollments || 0) - (a.totalEnrollments || 0);
            if (sortBy === 'price_low') return (a.price || 0) - (b.price || 0);
            if (sortBy === 'price_high') return (b.price || 0) - (a.price || 0);
            if (sortBy === 'duration_short') return (a.estimatedDurationHours || 0) - (b.estimatedDurationHours || 0);
            if (sortBy === 'duration_long') return (b.estimatedDurationHours || 0) - (a.estimatedDurationHours || 0);
            return new Date(b.creationTimestamp || b.createdAt || 0) - new Date(a.creationTimestamp || a.createdAt || 0);
        }), [sectionCourses, filterCategory, filterLevel, filterLanguage, filterPrice, filterRating, filterDuration, filterInstructor, filterCertificate, searchQuery, sortBy]);

    const clearFilters = () => { setFilterCategory('All'); setFilterLevel('All'); setFilterLanguage('All'); setFilterPrice('All'); setFilterRating(0); setFilterDuration('All'); setFilterInstructor('All'); setFilterCertificate(false); setSearchQuery(''); setSortBy('newest'); };
    const hasActiveFilters = filterCategory !== 'All' || filterLevel !== 'All' || filterLanguage !== 'All' || filterPrice !== 'All' || filterRating > 0 || filterDuration !== 'All' || filterInstructor !== 'All' || filterCertificate || searchQuery;

    const toggleWishlist = async (e, courseId) => {
        e.stopPropagation();
        if (!isAuthenticated) { setGuestModal({ open: true, action: 'save this course to your wishlist' }); return; }
        try {
            await wishlistService.toggle(courseId);
            setWishlistIds(prev => prev.includes(courseId) ? prev.filter(id => id !== courseId) : [...prev, courseId]);
        } catch (e) { console.error(e); }
    };

    const getEmoji = (c) => EMOJI_MAP[c.technicalCategory] || EMOJIS[(c._id?.charCodeAt(0) || 0) % EMOJIS.length] || '🎓';

    const renderStars = (r) => {
        const arr = [];
        for (let i = 1; i <= 5; i++) arr.push(<span key={i} style={{ color: i <= Math.round(r) ? '#fbbf24' : `${colors.border}`, fontSize: '11px' }}>★</span>);
        return arr;
    };

    const s = {
        page: { minHeight: '100vh', background: colors.bg, fontFamily: "'Outfit','Inter',sans-serif" },
        hero: { background: theme === 'dark' ? 'linear-gradient(135deg,#0f172a 0%,#1e293b 50%,#0f172a 100%)' : `linear-gradient(135deg,${colors.primary}06,${colors.accent}06)`, padding: '52px 5% 36px', borderBottom: `1px solid ${colors.border}`, position: 'relative', overflow: 'hidden' },
        heroDeco: { position: 'absolute', top: '-40%', right: '-8%', width: '420px', height: '420px', borderRadius: '50%', background: `radial-gradient(circle,${colors.primary}08,transparent 70%)`, pointerEvents: 'none' },
        heroTitle: { fontSize: '42px', fontWeight: '900', color: colors.text, margin: '0 0 6px', letterSpacing: '-0.8px', lineHeight: 1.1 },
        heroSub: { color: colors.textMuted, fontSize: '15px', margin: '0 0 24px', lineHeight: 1.6 },
        heroStats: { display: 'flex', gap: '28px', marginBottom: '24px', flexWrap: 'wrap' },
        statNum: { fontSize: '26px', fontWeight: '800', color: colors.primary, display: 'block' },
        statLabel: { fontSize: '11px', color: colors.textMuted, fontWeight: '600' },
        searchWrap: { display: 'flex', maxWidth: '620px', background: colors.bgCard, borderRadius: '14px', border: `1px solid ${colors.border}`, overflow: 'hidden', boxShadow: '0 6px 24px rgba(0,0,0,0.08)' },
        searchInput: { flex: 1, background: 'transparent', border: 'none', color: colors.text, padding: '13px 4px', fontSize: '14px', outline: 'none' },
        sectionTabs: { display: 'flex', gap: 0, background: colors.bgCard, borderBottom: `1px solid ${colors.border}`, padding: '0 5%', overflowX: 'auto' },
        layout: { display: 'flex', gap: '24px', maxWidth: '1440px', margin: '0 auto', padding: '24px 20px' },
        sidebar: { width: '256px', flexShrink: 0 },
        filterCard: { background: colors.bgCard, border: `1px solid ${colors.border}`, borderRadius: '16px', padding: '20px', position: 'sticky', top: '80px' },
        fGroup: { marginBottom: '16px', paddingBottom: '16px', borderBottom: `1px solid ${colors.border}` },
        fLabel: { fontSize: '10px', fontWeight: '800', color: colors.textMuted, textTransform: 'uppercase', display: 'block', marginBottom: '8px', letterSpacing: '0.6px' },
        sel: { width: '100%', background: colors.bgInput, border: `1px solid ${colors.border}`, color: colors.text, padding: '8px 10px', borderRadius: '8px', fontSize: '12px', outline: 'none', cursor: 'pointer' },
        main: { flex: 1, minWidth: 0 },
        grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(262px,1fr))', gap: '18px' },
        list: { display: 'flex', flexDirection: 'column', gap: '14px' },
        card: { background: colors.bgCard, borderRadius: '14px', border: `1px solid ${colors.border}`, overflow: 'hidden', cursor: 'pointer', transition: 'all 0.22s ease', display: 'flex', flexDirection: 'column', position: 'relative' },
        cardList: { background: colors.bgCard, borderRadius: '14px', border: `1px solid ${colors.border}`, overflow: 'hidden', cursor: 'pointer', transition: 'all 0.22s ease', display: 'flex', flexDirection: 'row' },
        thumb: { height: '150px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '44px', flexShrink: 0, position: 'relative' },
        thumbList: { width: '190px', height: '140px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '36px', flexShrink: 0 },
        body: { padding: '14px 16px', display: 'flex', flexDirection: 'column', flex: 1 },
        badge: { display: 'inline-block', padding: '2px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', background: `${colors.primary}15`, color: colors.primary },
        freeB: { display: 'inline-block', padding: '2px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: '700', background: '#10b98115', color: '#10b981', marginLeft: '5px' },
        newB: { display: 'inline-block', padding: '2px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: '700', background: '#f59e0b15', color: '#f59e0b', marginLeft: '5px' },
        cTitle: { fontSize: '14px', fontWeight: '700', color: colors.text, margin: '6px 0 2px', lineHeight: 1.35 },
        cInstr: { color: colors.textMuted, fontSize: '11px', margin: '0 0 6px' },
        cMeta: { display: 'flex', gap: '5px', fontSize: '11px', color: colors.textMuted, flexWrap: 'wrap', marginBottom: '8px', alignItems: 'center' },
        cFoot: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '10px', borderTop: `1px solid ${colors.border}`, marginTop: 'auto' },
        price: { fontSize: '16px', fontWeight: '800', color: colors.text },
        enrollBtn: { background: `linear-gradient(135deg,${colors.primary},${colors.accent})`, color: '#fff', border: 'none', padding: '7px 14px', borderRadius: '8px', fontWeight: '700', cursor: 'pointer', fontSize: '11px', transition: 'opacity 0.2s' },
        wishBtn: { position: 'absolute', top: '8px', right: '8px', background: 'rgba(0,0,0,0.45)', border: 'none', borderRadius: '8px', padding: '4px 7px', cursor: 'pointer', fontSize: '13px', backdropFilter: 'blur(4px)', transition: 'transform 0.15s' },
        emptyBox: { textAlign: 'center', padding: '72px 32px', background: colors.bgCard, borderRadius: '16px', border: `1px solid ${colors.border}` },
        filterTag: { display: 'inline-flex', alignItems: 'center', gap: '5px', background: `${colors.primary}10`, border: `1px solid ${colors.primary}25`, color: colors.primary, padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '600' },
        guestBanner: { background: `linear-gradient(135deg,${colors.primary}08,${colors.accent}06)`, border: `1px solid ${colors.primary}18`, borderRadius: '12px', padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', gap: '12px' },
    };

    const radioCircle = (active) => ({ width: '14px', height: '14px', borderRadius: '50%', border: `2px solid ${active ? colors.primary : colors.border}`, background: active ? colors.primary : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.15s' });
    const radioLabel = (active) => ({ color: active ? colors.text : colors.textMuted, fontSize: '12px', fontWeight: active ? '600' : '400', cursor: 'pointer' });
    const tabStyle = (active) => ({ padding: '12px 18px', border: 'none', background: 'none', cursor: 'pointer', fontWeight: '700', fontSize: '12px', whiteSpace: 'nowrap', color: active ? colors.primary : colors.textMuted, borderBottom: active ? `3px solid ${colors.primary}` : '3px solid transparent', transition: 'all 0.2s' });
    const priceBtnStyle = (active) => ({ flex: 1, padding: '5px 4px', borderRadius: '7px', border: `1px solid ${active ? colors.primary : colors.border}`, background: active ? `${colors.primary}12` : 'transparent', color: active ? colors.primary : colors.textMuted, fontWeight: '700', cursor: 'pointer', fontSize: '11px' });

    const CourseCard = ({ course, isList }) => {
        const inWish = wishlistIds.includes(course._id);
        const isNew = course.creationTimestamp && (Date.now() - new Date(course.creationTimestamp).getTime()) < 30 * 24 * 3600 * 1000;
        const bg = course.thumbnailUrl ? `url(${course.thumbnailUrl}) center/cover no-repeat` : `linear-gradient(135deg,${colors.primary}18,${colors.accent}12)`;
        return (
            <div
                style={isList ? s.cardList : s.card}
                onClick={() => navigate(`/courses/${course._id}`)}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 14px 36px rgba(0,0,0,0.12)'; e.currentTarget.style.borderColor = `${colors.primary}35`; }}
                onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; e.currentTarget.style.borderColor = colors.border; }}
            >
                <div style={{ ...(isList ? s.thumbList : s.thumb), background: bg, position: 'relative' }}>
                    {!course.thumbnailUrl && <span>{getEmoji(course)}</span>}
                    {!isList && <button style={{ ...s.wishBtn, color: inWish ? '#ef4444' : '#fff' }} onClick={e => toggleWishlist(e, course._id)}>{inWish ? '❤️' : '🤍'}</button>}
                    {course.previewVideoUrl && !isList && (
                        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.15)', opacity: 0, transition: 'opacity 0.2s' }}
                            onMouseEnter={e => e.currentTarget.style.opacity = 1} onMouseLeave={e => e.currentTarget.style.opacity = 0}>
                            <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(255,255,255,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>▶</div>
                        </div>
                    )}
                </div>
                <div style={s.body}>
                    <div style={{ marginBottom: '4px' }}>
                        <span style={s.badge}>{course.technicalCategory || 'Tech'}</span>
                        {course.price === 0 && <span style={s.freeB}>FREE</span>}
                        {isNew && <span style={s.newB}>NEW</span>}
                    </div>
                    <h3 style={s.cTitle}>{course.courseTitle}</h3>
                    <p style={s.cInstr}>By {course.creatorRef?.fullName || 'EMARE Instructor'}</p>
                    <div style={s.cMeta}>
                        <span style={{ color: '#fbbf24', fontWeight: '700' }}>{(course.averageRating || 4.8).toFixed(1)}</span>
                        <span style={{ display: 'flex' }}>{renderStars(course.averageRating || 4.8)}</span>
                        <span style={{ opacity: 0.3 }}>·</span>
                        <span>{course.totalEnrollments || 0} students</span>
                    </div>
                    <div style={{ display: 'flex', gap: '10px', fontSize: '10px', color: colors.textMuted, marginBottom: '6px', flexWrap: 'wrap' }}>
                        <span>📚 {course.level || 'Beginner'}</span>
                        <span>⏱ {course.estimatedDurationHours || 5}h</span>
                        <span>🗣 {course.language || 'English'}</span>
                        {course.hasCertificate !== false && <span style={{ color: colors.success, fontWeight: '600' }}>🏆 Cert</span>}
                    </div>
                    {isList && course.descriptionText && <p style={{ color: colors.textMuted, fontSize: '11px', margin: '0 0 6px', lineHeight: 1.4 }}>{course.descriptionText.substring(0, 130)}...</p>}
                    <div style={s.cFoot}>
                        <span style={s.price}>{course.price === 0 ? '🆓 Free' : `${course.price?.toLocaleString()} ETB`}</span>
                        <button style={s.enrollBtn} onClick={e => { e.stopPropagation(); if (!isAuthenticated) setGuestModal({ open: true, action: `enroll in "${course.courseTitle}"` }); else navigate(`/courses/${course._id}`); }}>
                            {isAuthenticated ? 'View →' : '🔐 Login'}
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div style={s.page}>
            <Navbar />
            {/* Hero */}
            <div style={s.hero}>
                <div style={s.heroDeco} />
                <h1 style={s.heroTitle}>📚 Course Catalog</h1>
                <p style={s.heroSub}>Discover world-class tech courses curated for African learners. Learn at your pace, earn certificates.</p>
                <div style={s.heroStats}>
                    <div><span style={s.statNum}>{courses.length}+</span><span style={s.statLabel}>Total Courses</span></div>
                    <div><span style={s.statNum}>{categories.length - 1}+</span><span style={s.statLabel}>Categories</span></div>
                    <div><span style={s.statNum}>{courses.filter(c => c.price === 0).length}</span><span style={s.statLabel}>Free Courses</span></div>
                    <div><span style={s.statNum}>⭐ 4.8</span><span style={s.statLabel}>Avg Rating</span></div>
                </div>
                <div style={s.searchWrap}>
                    <span style={{ padding: '13px 14px', fontSize: '16px', color: colors.textMuted }}>🔍</span>
                    <input type="text" placeholder="Search courses, topics, instructors..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} style={s.searchInput} id="catalog-search" />
                    {searchQuery && <button style={{ background: 'none', border: 'none', color: colors.textMuted, cursor: 'pointer', padding: '0 12px', fontSize: '16px' }} onClick={() => setSearchQuery('')}>✕</button>}
                    <button style={{ background: `linear-gradient(135deg,${colors.primary},${colors.accent})`, color: '#fff', border: 'none', padding: '13px 24px', fontWeight: '800', cursor: 'pointer', fontSize: '13px' }}>Search</button>
                </div>
            </div>

            {/* Section Tabs */}
            <div style={s.sectionTabs}>
                {[{ key: 'all', label: '🗂 All Courses' }, { key: 'featured', label: '⭐ Featured' }, { key: 'trending', label: '🔥 Trending' }, { key: 'newest', label: '🆕 Newest' }, { key: 'certificates', label: '🏆 With Certificate' }].map(t => (
                    <button key={t.key} style={tabStyle(activeSection === t.key)} onClick={() => setActiveSection(t.key)}>{t.label}</button>
                ))}
            </div>

            <div style={s.layout}>
                {/* Sidebar */}
                <aside style={s.sidebar}>
                    <div style={s.filterCard}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
                            <h3 style={{ fontSize: '14px', fontWeight: '800', color: colors.text, margin: 0 }}>⚙️ Filters</h3>
                            {hasActiveFilters && <button style={{ background: 'none', border: 'none', color: colors.primary, cursor: 'pointer', fontSize: '11px', fontWeight: '700' }} onClick={clearFilters}>Clear All</button>}
                        </div>

                        {/* Price */}
                        <div style={s.fGroup}>
                            <span style={s.fLabel}>Price</span>
                            <div style={{ display: 'flex', gap: '5px' }}>
                                {['All', 'Free', 'Paid'].map(p => <button key={p} style={priceBtnStyle(filterPrice === p)} onClick={() => setFilterPrice(p)}>{p}</button>)}
                            </div>
                        </div>

                        {/* Rating */}
                        <div style={s.fGroup}>
                            <span style={s.fLabel}>Minimum Rating</span>
                            {[4.5, 4.0, 3.5, 0].map(r => (
                                <div key={r} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 0', cursor: 'pointer' }} onClick={() => setFilterRating(r)}>
                                    <div style={radioCircle(filterRating === r)}>{filterRating === r && <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#fff' }} />}</div>
                                    <span style={radioLabel(filterRating === r)}>{r === 0 ? 'Any rating' : <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>{renderStars(r)} {r}+</span>}</span>
                                </div>
                            ))}
                        </div>

                        {/* Difficulty */}
                        <div style={s.fGroup}>
                            <span style={s.fLabel}>Difficulty Level</span>
                            {['All', 'Beginner', 'Intermediate', 'Advanced'].map(lvl => (
                                <div key={lvl} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 0', cursor: 'pointer' }} onClick={() => setFilterLevel(lvl)}>
                                    <div style={radioCircle(filterLevel === lvl)}>{filterLevel === lvl && <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#fff' }} />}</div>
                                    <span style={radioLabel(filterLevel === lvl)}>{lvl}</span>
                                </div>
                            ))}
                        </div>

                        {/* Duration */}
                        <div style={s.fGroup}>
                            <span style={s.fLabel}>Course Duration</span>
                            {[{ v: 'All', l: 'Any Length' }, { v: '<5', l: '< 5 hours' }, { v: '5-20', l: '5 – 20 hours' }, { v: '>20', l: '> 20 hours' }].map(d => (
                                <div key={d.v} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 0', cursor: 'pointer' }} onClick={() => setFilterDuration(d.v)}>
                                    <div style={radioCircle(filterDuration === d.v)}>{filterDuration === d.v && <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#fff' }} />}</div>
                                    <span style={radioLabel(filterDuration === d.v)}>{d.l}</span>
                                </div>
                            ))}
                        </div>

                        {/* Language */}
                        <div style={s.fGroup}>
                            <span style={s.fLabel}>Language</span>
                            <select value={filterLanguage} onChange={e => setFilterLanguage(e.target.value)} style={s.sel}>
                                {['All', 'English', 'Amharic', 'Afaan Oromo'].map(l => <option key={l}>{l}</option>)}
                            </select>
                        </div>

                        {/* Instructor */}
                        <div style={s.fGroup}>
                            <span style={s.fLabel}>Instructor</span>
                            <select value={filterInstructor} onChange={e => setFilterInstructor(e.target.value)} style={s.sel}>
                                {instructors.map((n, i) => <option key={i} value={n}>{n}</option>)}
                            </select>
                        </div>

                        {/* Category */}
                        <div style={s.fGroup}>
                            <span style={s.fLabel}>Category</span>
                            <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} style={s.sel}>
                                {categories.map((c, i) => <option key={i} value={c.name}>{c.name}</option>)}
                            </select>
                        </div>

                        {/* Certificate */}
                        <div style={{ marginBottom: 0 }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', padding: '6px 0' }}>
                                <input type="checkbox" checked={filterCertificate} onChange={e => setFilterCertificate(e.target.checked)} style={{ width: '15px', height: '15px', accentColor: colors.primary }} />
                                <span style={{ color: colors.text, fontSize: '12px', fontWeight: '600' }}>🏆 Certificate Only</span>
                            </label>
                        </div>
                    </div>

                    {!isAuthenticated && (
                        <div style={{ background: `linear-gradient(135deg,${colors.primary}10,${colors.accent}08)`, border: `1px solid ${colors.primary}20`, borderRadius: '14px', padding: '18px', marginTop: '14px', textAlign: 'center' }}>
                            <div style={{ fontSize: '32px', marginBottom: '8px' }}>🎓</div>
                            <h4 style={{ color: colors.text, fontSize: '13px', fontWeight: '800', margin: '0 0 5px' }}>Ready to Learn?</h4>
                            <p style={{ color: colors.textMuted, fontSize: '11px', margin: '0 0 12px', lineHeight: 1.5 }}>Join EMARE for expert-led courses, certificates, and community.</p>
                            <button style={{ background: `linear-gradient(135deg,${colors.primary},${colors.accent})`, color: '#fff', border: 'none', borderRadius: '10px', padding: '9px 14px', fontWeight: '800', cursor: 'pointer', width: '100%', fontSize: '12px' }} onClick={() => navigate('/register')}>Register Free 🚀</button>
                        </div>
                    )}
                </aside>

                {/* Main */}
                <main style={s.main}>
                    {!isAuthenticated && (
                        <div style={s.guestBanner}>
                            <div>
                                <span style={{ fontWeight: '700', color: colors.text, fontSize: '13px' }}>👋 Browsing as Guest</span>
                                <p style={{ color: colors.textMuted, fontSize: '11px', margin: '2px 0 0' }}>Login or register to enroll, track progress, and earn certificates.</p>
                            </div>
                            <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                                <button style={{ background: `linear-gradient(135deg,${colors.primary},${colors.accent})`, color: '#fff', border: 'none', borderRadius: '8px', padding: '7px 14px', fontWeight: '700', cursor: 'pointer', fontSize: '12px' }} onClick={() => navigate('/register')}>Register</button>
                                <button style={{ background: colors.bgCard, border: `1px solid ${colors.border}`, color: colors.text, borderRadius: '8px', padding: '7px 14px', fontWeight: '600', cursor: 'pointer', fontSize: '12px' }} onClick={() => navigate('/login')}>Login</button>
                            </div>
                        </div>
                    )}

                    {/* Active filter tags */}
                    {hasActiveFilters && (
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '14px' }}>
                            {filterCategory !== 'All' && <span style={s.filterTag}>{filterCategory} <span style={{ cursor: 'pointer' }} onClick={() => setFilterCategory('All')}>✕</span></span>}
                            {filterLevel !== 'All' && <span style={s.filterTag}>{filterLevel} <span style={{ cursor: 'pointer' }} onClick={() => setFilterLevel('All')}>✕</span></span>}
                            {filterLanguage !== 'All' && <span style={s.filterTag}>{filterLanguage} <span style={{ cursor: 'pointer' }} onClick={() => setFilterLanguage('All')}>✕</span></span>}
                            {filterPrice !== 'All' && <span style={s.filterTag}>{filterPrice} <span style={{ cursor: 'pointer' }} onClick={() => setFilterPrice('All')}>✕</span></span>}
                            {filterRating > 0 && <span style={s.filterTag}>⭐ {filterRating}+ <span style={{ cursor: 'pointer' }} onClick={() => setFilterRating(0)}>✕</span></span>}
                            {filterDuration !== 'All' && <span style={s.filterTag}>⏱ {filterDuration}h <span style={{ cursor: 'pointer' }} onClick={() => setFilterDuration('All')}>✕</span></span>}
                            {filterInstructor !== 'All' && <span style={s.filterTag}>👤 {filterInstructor} <span style={{ cursor: 'pointer' }} onClick={() => setFilterInstructor('All')}>✕</span></span>}
                            {filterCertificate && <span style={s.filterTag}>🏆 Cert <span style={{ cursor: 'pointer' }} onClick={() => setFilterCertificate(false)}>✕</span></span>}
                            {searchQuery && <span style={s.filterTag}>"{searchQuery}" <span style={{ cursor: 'pointer' }} onClick={() => setSearchQuery('')}>✕</span></span>}
                        </div>
                    )}

                    {/* Top bar */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '10px' }}>
                        <span style={{ color: colors.textMuted, fontSize: '13px' }}>
                            {loading ? 'Loading...' : `${filtered.length} course${filtered.length !== 1 ? 's' : ''} found`}
                            {activeSection !== 'all' && <span style={{ color: colors.primary, fontWeight: '700', marginLeft: '6px' }}>• {activeSection.charAt(0).toUpperCase() + activeSection.slice(1)}</span>}
                        </span>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={{ background: colors.bgCard, border: `1px solid ${colors.border}`, color: colors.text, padding: '7px 10px', borderRadius: '8px', fontSize: '12px', cursor: 'pointer', outline: 'none' }}>
                                {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                            </select>
                            <div style={{ display: 'flex', background: colors.bgCard, border: `1px solid ${colors.border}`, borderRadius: '8px', overflow: 'hidden' }}>
                                <button onClick={() => setViewMode('grid')} style={{ padding: '7px 10px', border: 'none', cursor: 'pointer', fontSize: '14px', background: viewMode === 'grid' ? colors.primary : 'transparent', color: viewMode === 'grid' ? '#fff' : colors.textMuted }}>⊞</button>
                                <button onClick={() => setViewMode('list')} style={{ padding: '7px 10px', border: 'none', cursor: 'pointer', fontSize: '14px', background: viewMode === 'list' ? colors.primary : 'transparent', color: viewMode === 'list' ? '#fff' : colors.textMuted }}>☰</button>
                            </div>
                        </div>
                    </div>

                    {/* Course Grid */}
                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '72px', color: colors.textMuted }}>
                            <div style={{ fontSize: '44px', marginBottom: '14px' }}>⏳</div><p>Loading courses...</p>
                        </div>
                    ) : filtered.length === 0 ? (
                        <div style={s.emptyBox}>
                            <div style={{ fontSize: '52px', marginBottom: '14px' }}>🔍</div>
                            <h3 style={{ color: colors.text, margin: '0 0 8px', fontSize: '18px', fontWeight: '800' }}>No courses found</h3>
                            <p style={{ color: colors.textMuted, marginBottom: '20px' }}>Try adjusting your filters or search query</p>
                            <button style={{ background: `linear-gradient(135deg,${colors.primary},${colors.accent})`, color: '#fff', border: 'none', borderRadius: '10px', padding: '10px 22px', fontWeight: '700', cursor: 'pointer', fontSize: '13px' }} onClick={clearFilters}>Clear All Filters</button>
                        </div>
                    ) : (
                        <div style={viewMode === 'grid' ? s.grid : s.list}>
                            {filtered.map(c => <CourseCard key={c._id} course={c} isList={viewMode === 'list'} />)}
                        </div>
                    )}
                </main>
            </div>

            <GuestModal isOpen={guestModal.open} onClose={() => setGuestModal({ open: false, action: '' })} action={guestModal.action} />
        </div>
    );
}
