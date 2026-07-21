import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { courseService, categoryService } from '../../services/api';
import { useNavigate, useLocation } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import GuestModal from '../../components/GuestModal';

const SORT_OPTIONS = [
    { value: 'newest', label: '🆕 Newest' },
    { value: 'popular', label: '🔥 Popular' },
    { value: 'rating', label: '⭐ Highest Rated' },
    { value: 'price_low', label: '💰 Price ↑' },
    { value: 'price_high', label: '💎 Price ↓' }
];

function useQuery() {
    return new URLSearchParams(useLocation().search);
}

export default function CourseCatalog() {
    const { isAuthenticated } = useAuth();
    const { colors, theme } = useTheme();
    const navigate = useNavigate();
    const urlParams = useQuery();

    const [courses, setCourses] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);

    // Filters
    const [filterCategory, setFilterCategory] = useState(urlParams.get('category') || 'All');
    const [filterLevel, setFilterLevel] = useState(urlParams.get('level') || 'All');
    const [filterLanguage, setFilterLanguage] = useState('All');
    const [filterPrice, setFilterPrice] = useState(urlParams.get('free') === 'true' ? 'Free' : 'All');
    const [searchQuery, setSearchQuery] = useState(urlParams.get('search') || '');
    const [sortBy, setSortBy] = useState('newest');
    const [viewMode, setViewMode] = useState('grid'); // grid | list

    // Guest modal
    const [guestModal, setGuestModal] = useState({ open: false, action: '' });

    useEffect(() => {
        Promise.all([courseService.getAll(), categoryService.getAll()])
            .then(([resCourses, resCats]) => {
                setCourses(resCourses.data?.data || []);
                setCategories([{ name: 'All' }, ...(resCats.data?.data || [])]);
            })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    const filtered = courses
        .filter(c => {
            const matchCat = filterCategory === 'All' || c.technicalCategory === filterCategory;
            const matchLevel = filterLevel === 'All' || c.level === filterLevel;
            const matchLang = filterLanguage === 'All' || c.language === filterLanguage;
            const matchPrice = filterPrice === 'All' ? true
                : filterPrice === 'Free' ? c.price === 0 : c.price > 0;
            const q = searchQuery.toLowerCase();
            const matchSearch = !q ||
                c.courseTitle?.toLowerCase().includes(q) ||
                c.descriptionText?.toLowerCase().includes(q) ||
                c.creatorRef?.fullName?.toLowerCase().includes(q);
            return matchCat && matchLevel && matchLang && matchPrice && matchSearch;
        })
        .sort((a, b) => {
            if (sortBy === 'rating') return (b.averageRating || 0) - (a.averageRating || 0);
            if (sortBy === 'popular') return (b.totalEnrollments || 0) - (a.totalEnrollments || 0);
            if (sortBy === 'price_low') return (a.price || 0) - (b.price || 0);
            if (sortBy === 'price_high') return (b.price || 0) - (a.price || 0);
            return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
        });

    const handleEnrollClick = (e, course) => {
        e.stopPropagation();
        if (!isAuthenticated) {
            setGuestModal({ open: true, action: `enroll in "${course.courseTitle}"` });
        } else {
            navigate(`/courses/${course._id}`);
        }
    };

    const clearFilters = () => {
        setFilterCategory('All');
        setFilterLevel('All');
        setFilterLanguage('All');
        setFilterPrice('All');
        setSearchQuery('');
        setSortBy('newest');
    };

    const hasActiveFilters = filterCategory !== 'All' || filterLevel !== 'All' ||
        filterLanguage !== 'All' || filterPrice !== 'All' || searchQuery;

    const s = {
        page: { minHeight: '100vh', background: colors.bg, fontFamily: "'Outfit','Inter',sans-serif" },
        hero: { background: `linear-gradient(135deg, ${colors.primary}10, ${colors.accent}10)`, padding: '48px 5% 32px', borderBottom: `1px solid ${colors.border}` },
        heroTitle: { fontSize: '40px', fontWeight: '900', color: colors.text, margin: '0 0 8px', letterSpacing: '-0.5px' },
        heroSub: { color: colors.textMuted, fontSize: '16px', margin: '0 0 24px' },
        searchBar: { display: 'flex', maxWidth: '600px', background: colors.bgCard, borderRadius: '12px', border: `1px solid ${colors.border}`, overflow: 'hidden', boxShadow: '0 4px 15px rgba(0,0,0,0.06)' },
        searchInput: { flex: 1, background: 'transparent', border: 'none', color: colors.text, padding: '14px 18px', fontSize: '15px', outline: 'none' },
        searchBtn: { background: `linear-gradient(135deg, ${colors.primary}, ${colors.accent})`, color: '#fff', border: 'none', padding: '14px 24px', fontWeight: '700', cursor: 'pointer', fontSize: '14px' },

        layout: { display: 'flex', gap: '32px', maxWidth: '1400px', margin: '0 auto', padding: '32px 24px' },
        sidebar: { width: '260px', flexShrink: 0 },
        filterCard: { background: colors.bgCard, border: `1px solid ${colors.border}`, borderRadius: '16px', padding: '24px', position: 'sticky', top: '90px' },
        filterHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
        filterTitle: { fontSize: '16px', fontWeight: '800', color: colors.text, margin: 0 },
        clearBtn: { background: 'none', border: 'none', color: colors.primary, cursor: 'pointer', fontSize: '12px', fontWeight: '600' },
        filterGroup: { marginBottom: '20px', paddingBottom: '20px', borderBottom: `1px solid ${colors.border}` },
        filterLabel: { fontSize: '11px', fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', display: 'block', marginBottom: '10px', letterSpacing: '0.5px' },
        filterBtns: { display: 'flex', gap: '6px', flexWrap: 'wrap' },
        filterBtn: { padding: '5px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', border: '1px solid', transition: 'all 0.2s' },
        select: { width: '100%', background: colors.bgInput, border: `1px solid ${colors.border}`, color: colors.text, padding: '9px 12px', borderRadius: '8px', fontSize: '13px', outline: 'none', cursor: 'pointer' },
        radioRow: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', cursor: 'pointer' },
        radioLabel: { color: colors.text, fontSize: '13px', cursor: 'pointer' },

        main: { flex: 1 },
        topBar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' },
        resultsText: { color: colors.textMuted, fontSize: '14px' },
        topBarRight: { display: 'flex', gap: '10px', alignItems: 'center' },
        sortSelect: { background: colors.bgCard, border: `1px solid ${colors.border}`, color: colors.text, padding: '8px 12px', borderRadius: '8px', fontSize: '13px', cursor: 'pointer', outline: 'none' },
        viewToggle: { display: 'flex', background: colors.bgCard, border: `1px solid ${colors.border}`, borderRadius: '8px', overflow: 'hidden' },
        viewBtn: { padding: '7px 12px', border: 'none', cursor: 'pointer', fontSize: '16px', transition: 'background 0.2s' },

        grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '20px' },
        list: { display: 'flex', flexDirection: 'column', gap: '16px' },

        courseCard: { background: colors.bgCard, borderRadius: '14px', border: `1px solid ${colors.border}`, overflow: 'hidden', cursor: 'pointer', transition: 'all 0.25s' },
        courseCardList: { background: colors.bgCard, borderRadius: '14px', border: `1px solid ${colors.border}`, overflow: 'hidden', cursor: 'pointer', transition: 'all 0.25s', display: 'flex' },
        courseImg: { height: '150px', background: `linear-gradient(135deg, ${colors.primary}15, ${colors.accent}15)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '40px', flexShrink: 0 },
        courseImgList: { width: '180px', height: '140px', background: `linear-gradient(135deg, ${colors.primary}15, ${colors.accent}15)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '36px', flexShrink: 0 },
        courseBody: { padding: '18px', display: 'flex', flexDirection: 'column', flex: 1 },
        catBadge: { display: 'inline-block', padding: '2px 10px', borderRadius: '6px', fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', marginBottom: '8px', background: `${colors.primary}15`, color: colors.primary },
        freeBadge: { display: 'inline-block', padding: '2px 10px', borderRadius: '6px', fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', marginBottom: '8px', background: '#10b98115', color: '#10b981', marginLeft: '6px' },
        courseTitle: { fontSize: '15px', fontWeight: '700', color: colors.text, margin: '0 0 4px', lineHeight: 1.4 },
        courseInstr: { color: colors.textMuted, fontSize: '12px', margin: '0 0 10px' },
        courseMeta: { display: 'flex', gap: '8px', fontSize: '12px', color: colors.textMuted, flexWrap: 'wrap', marginBottom: '12px', alignItems: 'center' },
        courseFooter: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '12px', borderTop: `1px solid ${colors.border}`, marginTop: 'auto' },
        priceTag: { fontSize: '18px', fontWeight: '800', color: colors.text },
        enrollBtn: { background: `linear-gradient(135deg, ${colors.primary}, ${colors.accent})`, color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '8px', fontWeight: '700', cursor: 'pointer', fontSize: '12px', transition: 'opacity 0.2s' },
        guestBtn: { background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.3)', color: '#60a5fa', padding: '8px 16px', borderRadius: '8px', fontWeight: '700', cursor: 'pointer', fontSize: '12px' },

        activeFiltersBar: { display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' },
        filterTag: { display: 'flex', alignItems: 'center', gap: '6px', background: `${colors.primary}15`, border: `1px solid ${colors.primary}30`, color: colors.primary, padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '600' },
        filterTagX: { cursor: 'pointer', fontWeight: '900', fontSize: '14px' },

        emptyState: { textAlign: 'center', padding: '80px 40px', background: colors.bgCard, borderRadius: '16px', border: `1px solid ${colors.border}` },

        guestBanner: { background: `linear-gradient(135deg, ${colors.primary}15, ${colors.accent}15)`, border: `1px solid ${colors.primary}30`, borderRadius: '14px', padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }
    };

    return (
        <div style={s.page}>
            <Navbar />

            {/* Hero Banner */}
            <div style={s.hero}>
                <h1 style={s.heroTitle}>📚 Course Catalog</h1>
                <p style={s.heroSub}>Browse {courses.length}+ courses across {categories.length - 1} categories</p>
                <div style={s.searchBar}>
                    <span style={{ padding: '14px 14px 14px 18px', fontSize: '16px' }}>🔍</span>
                    <input
                        type="text"
                        placeholder="Search courses, topics, instructors..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        style={s.searchInput}
                    />
                    {searchQuery && (
                        <button style={{ background: 'none', border: 'none', color: colors.textMuted, cursor: 'pointer', padding: '0 12px', fontSize: '16px' }} onClick={() => setSearchQuery('')}>✕</button>
                    )}
                </div>
            </div>

            <div style={s.layout}>
                {/* ── Filter Sidebar ── */}
                <aside style={s.sidebar}>
                    <div style={s.filterCard}>
                        <div style={s.filterHeader}>
                            <h3 style={s.filterTitle}>⚙️ Filters</h3>
                            {hasActiveFilters && <button style={s.clearBtn} onClick={clearFilters}>Clear All</button>}
                        </div>

                        {/* Price Filter */}
                        <div style={s.filterGroup}>
                            <span style={s.filterLabel}>Price</span>
                            <div style={s.filterBtns}>
                                {['All', 'Free', 'Paid'].map(p => (
                                    <button key={p} style={{ ...s.filterBtn, background: filterPrice === p ? colors.primary : 'transparent', color: filterPrice === p ? '#fff' : colors.textMuted, borderColor: filterPrice === p ? colors.primary : colors.border }}
                                        onClick={() => setFilterPrice(p)}>{p}</button>
                                ))}
                            </div>
                        </div>

                        {/* Level Filter */}
                        <div style={s.filterGroup}>
                            <span style={s.filterLabel}>Skill Level</span>
                            {['All', 'Beginner', 'Intermediate', 'Advanced'].map(lvl => (
                                <div key={lvl} style={s.radioRow} onClick={() => setFilterLevel(lvl)}>
                                    <div style={{ width: '16px', height: '16px', borderRadius: '50%', border: `2px solid ${filterLevel === lvl ? colors.primary : colors.border}`, background: filterLevel === lvl ? colors.primary : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.2s' }}>
                                        {filterLevel === lvl && <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#fff' }} />}
                                    </div>
                                    <span style={{ ...s.radioLabel, fontWeight: filterLevel === lvl ? '600' : '400', color: filterLevel === lvl ? colors.text : colors.textMuted }}>{lvl}</span>
                                </div>
                            ))}
                        </div>

                        {/* Language Filter */}
                        <div style={s.filterGroup}>
                            <span style={s.filterLabel}>Language</span>
                            <select value={filterLanguage} onChange={e => setFilterLanguage(e.target.value)} style={s.select}>
                                {['All', 'English', 'Amharic', 'Oromo'].map(l => <option key={l}>{l}</option>)}
                            </select>
                        </div>

                        {/* Category Filter */}
                        <div style={{ ...s.filterGroup, borderBottom: 'none', marginBottom: 0, paddingBottom: 0 }}>
                            <span style={s.filterLabel}>Category</span>
                            <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} style={s.select}>
                                {categories.map((c, i) => <option key={i} value={c.name}>{c.name}</option>)}
                            </select>
                        </div>
                    </div>

                    {/* Guest CTA Panel */}
                    {!isAuthenticated && (
                        <div style={{ background: `linear-gradient(135deg, ${colors.primary}15, ${colors.accent}15)`, border: `1px solid ${colors.primary}30`, borderRadius: '16px', padding: '20px', marginTop: '16px', textAlign: 'center' }}>
                            <div style={{ fontSize: '32px', marginBottom: '8px' }}>🎓</div>
                            <h4 style={{ color: colors.text, fontSize: '14px', fontWeight: '700', margin: '0 0 6px' }}>Ready to Learn?</h4>
                            <p style={{ color: colors.textMuted, fontSize: '12px', margin: '0 0 12px', lineHeight: 1.5 }}>Create a free account to enroll, track progress & earn certificates.</p>
                            <button style={{ background: `linear-gradient(135deg, ${colors.primary}, ${colors.accent})`, color: '#fff', border: 'none', borderRadius: '8px', padding: '10px 16px', fontWeight: '700', cursor: 'pointer', width: '100%', fontSize: '13px' }}
                                onClick={() => navigate('/register')}>
                                Register Free 🚀
                            </button>
                        </div>
                    )}
                </aside>

                {/* ── Main Content ── */}
                <main style={s.main}>
                    {/* Guest Notice Banner */}
                    {!isAuthenticated && (
                        <div style={s.guestBanner}>
                            <div>
                                <span style={{ fontWeight: '700', color: colors.text, fontSize: '14px' }}>👋 Welcome, Guest!</span>
                                <p style={{ color: colors.textMuted, fontSize: '13px', margin: '4px 0 0' }}>You can browse all courses freely. Login to enroll, track progress, and earn certificates.</p>
                            </div>
                            <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                                <button style={{ background: `linear-gradient(135deg, ${colors.primary}, ${colors.accent})`, color: '#fff', border: 'none', borderRadius: '8px', padding: '9px 16px', fontWeight: '700', cursor: 'pointer', fontSize: '13px', whiteSpace: 'nowrap' }}
                                    onClick={() => navigate('/register')}>Register Free</button>
                                <button style={{ background: colors.bgCard, border: `1px solid ${colors.border}`, color: colors.text, borderRadius: '8px', padding: '9px 16px', fontWeight: '600', cursor: 'pointer', fontSize: '13px', whiteSpace: 'nowrap' }}
                                    onClick={() => navigate('/login')}>Login</button>
                            </div>
                        </div>
                    )}

                    {/* Active Filter Tags */}
                    {hasActiveFilters && (
                        <div style={s.activeFiltersBar}>
                            {filterCategory !== 'All' && <span style={s.filterTag}>{filterCategory} <span style={s.filterTagX} onClick={() => setFilterCategory('All')}>✕</span></span>}
                            {filterLevel !== 'All' && <span style={s.filterTag}>{filterLevel} <span style={s.filterTagX} onClick={() => setFilterLevel('All')}>✕</span></span>}
                            {filterLanguage !== 'All' && <span style={s.filterTag}>{filterLanguage} <span style={s.filterTagX} onClick={() => setFilterLanguage('All')}>✕</span></span>}
                            {filterPrice !== 'All' && <span style={s.filterTag}>{filterPrice} Only <span style={s.filterTagX} onClick={() => setFilterPrice('All')}>✕</span></span>}
                            {searchQuery && <span style={s.filterTag}>"{searchQuery}" <span style={s.filterTagX} onClick={() => setSearchQuery('')}>✕</span></span>}
                        </div>
                    )}

                    {/* Top Bar: Count + Sort + View Toggle */}
                    <div style={s.topBar}>
                        <span style={s.resultsText}>
                            {loading ? 'Loading...' : `${filtered.length} course${filtered.length !== 1 ? 's' : ''} found`}
                        </span>
                        <div style={s.topBarRight}>
                            <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={s.sortSelect}>
                                {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                            </select>
                            <div style={s.viewToggle}>
                                <button style={{ ...s.viewBtn, background: viewMode === 'grid' ? colors.primary : colors.bgCard, color: viewMode === 'grid' ? '#fff' : colors.textMuted }} onClick={() => setViewMode('grid')}>⊞</button>
                                <button style={{ ...s.viewBtn, background: viewMode === 'list' ? colors.primary : colors.bgCard, color: viewMode === 'list' ? '#fff' : colors.textMuted }} onClick={() => setViewMode('list')}>☰</button>
                            </div>
                        </div>
                    </div>

                    {/* Courses */}
                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '80px', color: colors.textMuted }}>
                            <div style={{ fontSize: '48px', marginBottom: '12px' }}>⏳</div>
                            Loading courses...
                        </div>
                    ) : filtered.length === 0 ? (
                        <div style={s.emptyState}>
                            <div style={{ fontSize: '48px', marginBottom: '12px' }}>🔍</div>
                            <h3 style={{ color: colors.text, margin: '0 0 8px' }}>No courses found</h3>
                            <p style={{ color: colors.textMuted, marginBottom: '20px' }}>Try adjusting your filters or search query</p>
                            <button style={{ background: `linear-gradient(135deg, ${colors.primary}, ${colors.accent})`, color: '#fff', border: 'none', borderRadius: '10px', padding: '12px 24px', fontWeight: '700', cursor: 'pointer' }} onClick={clearFilters}>
                                Clear All Filters
                            </button>
                        </div>
                    ) : (
                        <div style={viewMode === 'grid' ? s.grid : s.list}>
                            {filtered.map(course => (
                                <div
                                    key={course._id}
                                    style={viewMode === 'grid' ? s.courseCard : s.courseCardList}
                                    onClick={() => navigate(`/courses/${course._id}`)}
                                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 12px 30px rgba(0,0,0,0.12)'; }}
                                    onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
                                >
                                    {/* Thumbnail */}
                                    <div style={viewMode === 'grid' ? s.courseImg : s.courseImgList}>
                                        {course.thumbnailUrl
                                            ? <img src={course.thumbnailUrl} alt={course.courseTitle} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                            : '🎓'}
                                    </div>
                                    {/* Body */}
                                    <div style={s.courseBody}>
                                        <div>
                                            <span style={s.catBadge}>{course.technicalCategory || 'Tech'}</span>
                                            {course.price === 0 && <span style={s.freeBadge}>FREE</span>}
                                        </div>
                                        <h3 style={s.courseTitle}>{course.courseTitle}</h3>
                                        <p style={s.courseInstr}>By {course.creatorRef?.fullName || 'Emare Instructor'}</p>
                                        <div style={s.courseMeta}>
                                            <span style={{ color: '#fbbf24' }}>★</span>
                                            <span style={{ fontWeight: '600', color: colors.text }}>{course.averageRating || '4.8'}</span>
                                            <span>({course.totalReviews || 0})</span>
                                            <span>· {course.level || 'Beginner'}</span>
                                            <span>· {course.estimatedDurationHours || 5}h</span>
                                            <span>· {course.language || 'English'}</span>
                                        </div>
                                        <div style={s.courseFooter}>
                                            <span style={s.priceTag}>
                                                {course.price === 0 ? '🆓 Free' : `${course.price} ETB`}
                                            </span>
                                            <button
                                                style={isAuthenticated ? s.enrollBtn : s.guestBtn}
                                                onClick={e => handleEnrollClick(e, course)}
                                            >
                                                {isAuthenticated ? 'Enroll →' : '🔐 Login to Enroll'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </main>
            </div>

            {/* Guest Modal */}
            <GuestModal
                isOpen={guestModal.open}
                onClose={() => setGuestModal({ open: false, action: '' })}
                action={guestModal.action}
            />
        </div>
    );
}
