import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { courseService, userService, categoryService } from '../services/api';
import Navbar from '../components/Navbar';
import { useTheme } from '../context/ThemeContext';

const LEVELS = ['All', 'Beginner', 'Intermediate', 'Advanced'];
const LANGUAGES = ['All', 'English', 'Amharic', 'Oromo'];
const SORT_OPTIONS = [
    { value: 'newest', label: '🆕 Newest First' },
    { value: 'popular', label: '🔥 Most Popular' },
    { value: 'rating', label: '⭐ Highest Rated' },
    { value: 'price_low', label: '💰 Price: Low → High' },
    { value: 'price_high', label: '💎 Price: High → Low' }
];

function useQuery() {
    return new URLSearchParams(useLocation().search);
}

export default function SearchPage() {
    const { colors, theme } = useTheme();
    const navigate = useNavigate();
    const query = useQuery();

    const [searchInput, setSearchInput] = useState(query.get('q') || '');
    const [courses, setCourses] = useState([]);
    const [instructors, setInstructors] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(false);

    const [activeTab, setActiveTab] = useState('courses');
    const [filterLevel, setFilterLevel] = useState('All');
    const [filterLanguage, setFilterLanguage] = useState('All');
    const [filterPrice, setFilterPrice] = useState('All'); // All, Free, Paid
    const [filterCategory, setFilterCategory] = useState(query.get('category') || 'All');
    const [sortBy, setSortBy] = useState('newest');

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const [courseRes, userRes, catRes] = await Promise.all([
                    courseService.getAll(),
                    userService.getAll({ limit: 100 }).catch(() => ({ data: { data: [] } })),
                    categoryService.getAll().catch(() => ({ data: { data: [] } }))
                ]);
                setCourses(courseRes.data?.data || []);
                const instructorList = (userRes.data?.data || []).filter(u => u.assignedRole === 'Instructor');
                setInstructors(instructorList);
                setCategories(catRes.data?.data || []);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const q = searchInput.trim().toLowerCase();

    const filteredCourses = courses
        .filter(c => {
            const matchSearch = !q ||
                c.courseTitle?.toLowerCase().includes(q) ||
                c.descriptionText?.toLowerCase().includes(q) ||
                c.technicalCategory?.toLowerCase().includes(q) ||
                c.creatorRef?.fullName?.toLowerCase().includes(q);
            const matchLevel = filterLevel === 'All' || c.level === filterLevel;
            const matchLang = filterLanguage === 'All' || c.language === filterLanguage;
            const matchCat = filterCategory === 'All' || c.technicalCategory === filterCategory;
            const matchPrice = filterPrice === 'All'
                ? true
                : filterPrice === 'Free' ? c.price === 0 : c.price > 0;
            return matchSearch && matchLevel && matchLang && matchCat && matchPrice;
        })
        .sort((a, b) => {
            if (sortBy === 'rating') return (b.averageRating || 0) - (a.averageRating || 0);
            if (sortBy === 'popular') return (b.totalEnrollments || 0) - (a.totalEnrollments || 0);
            if (sortBy === 'price_low') return (a.price || 0) - (b.price || 0);
            if (sortBy === 'price_high') return (b.price || 0) - (a.price || 0);
            return new Date(b.createdAt || 0) - new Date(a.createdAt || 0); // newest
        });

    const filteredInstructors = instructors.filter(u =>
        !q || u.fullName?.toLowerCase().includes(q) ||
        u.biography?.toLowerCase().includes(q) ||
        u.qualifications?.toLowerCase().includes(q)
    );

    const filteredCategories = categories.filter(c =>
        !q || c.name?.toLowerCase().includes(q)
    );

    const handleSearch = (e) => {
        e.preventDefault();
        navigate(`/search?q=${encodeURIComponent(searchInput)}`);
    };

    const s = {
        page: { minHeight: '100vh', background: colors.bg, fontFamily: "'Outfit','Inter',sans-serif" },
        hero: { background: `linear-gradient(135deg, ${colors.primary}12, ${colors.accent}12)`, padding: '60px 5% 40px', borderBottom: `1px solid ${colors.border}` },
        heroTitle: { fontSize: '36px', fontWeight: '900', color: colors.text, margin: '0 0 24px' },
        searchForm: { display: 'flex', maxWidth: '700px', background: colors.bgCard, borderRadius: '14px', border: `1px solid ${colors.border}`, overflow: 'hidden', boxShadow: '0 8px 24px rgba(0,0,0,0.08)' },
        searchInput: { flex: 1, background: 'transparent', border: 'none', color: colors.text, padding: '18px 24px', fontSize: '16px', outline: 'none' },
        searchBtn: { background: `linear-gradient(135deg, ${colors.primary}, ${colors.accent})`, color: '#fff', border: 'none', padding: '16px 32px', fontWeight: '700', cursor: 'pointer', fontSize: '15px' },

        layout: { display: 'flex', gap: '32px', maxWidth: '1300px', margin: '0 auto', padding: '40px 24px' },
        sidebar: { width: '260px', flexShrink: 0 },
        filterCard: { background: colors.bgCard, border: `1px solid ${colors.border}`, borderRadius: '16px', padding: '24px', position: 'sticky', top: '100px' },
        filterTitle: { fontSize: '16px', fontWeight: '800', color: colors.text, margin: '0 0 20px' },
        filterGroup: { marginBottom: '24px' },
        filterLabel: { fontSize: '12px', fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', margin: '0 0 10px', display: 'block' },
        select: { width: '100%', background: colors.bgInput, border: `1px solid ${colors.border}`, color: colors.text, padding: '9px 12px', borderRadius: '8px', fontSize: '13px', outline: 'none' },
        filterBtns: { display: 'flex', gap: '8px', flexWrap: 'wrap' },
        filterBtn: { padding: '6px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', border: '1px solid', transition: 'all 0.2s' },

        content: { flex: 1 },
        tabs: { display: 'flex', gap: '4px', background: colors.bgCard, border: `1px solid ${colors.border}`, borderRadius: '12px', padding: '4px', marginBottom: '28px', width: 'fit-content' },
        tab: { padding: '9px 20px', borderRadius: '9px', border: 'none', cursor: 'pointer', fontWeight: '600', fontSize: '14px', transition: 'all 0.2s' },
        resultsHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
        resultsCount: { color: colors.textMuted, fontSize: '14px' },
        sortSelect: { background: colors.bgCard, border: `1px solid ${colors.border}`, color: colors.text, padding: '8px 12px', borderRadius: '8px', fontSize: '13px', cursor: 'pointer', outline: 'none' },

        grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '20px' },
        courseCard: { background: colors.bgCard, border: `1px solid ${colors.border}`, borderRadius: '14px', overflow: 'hidden', cursor: 'pointer', transition: 'all 0.2s' },
        courseImg: { height: '150px', background: `linear-gradient(135deg, ${colors.primary}15, ${colors.accent}15)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '40px' },
        courseBody: { padding: '18px' },
        badge: { display: 'inline-block', padding: '2px 10px', borderRadius: '6px', fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', marginBottom: '8px' },
        courseTitle: { fontSize: '15px', fontWeight: '700', color: colors.text, margin: '0 0 6px', lineHeight: 1.4 },
        courseMeta: { display: 'flex', gap: '8px', fontSize: '12px', color: colors.textMuted, margin: '6px 0 12px', flexWrap: 'wrap' },
        courseFooter: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '12px', borderTop: `1px solid ${colors.border}` },
        coursePrice: { fontSize: '18px', fontWeight: '800', color: colors.text },
        enrollBtn: { background: `linear-gradient(135deg, ${colors.primary}, ${colors.accent})`, color: '#fff', border: 'none', padding: '7px 14px', borderRadius: '8px', fontWeight: '700', cursor: 'pointer', fontSize: '12px' },

        instrCard: { background: colors.bgCard, border: `1px solid ${colors.border}`, borderRadius: '14px', padding: '24px', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', gap: '16px', alignItems: 'center' },
        instrAvatar: { width: '56px', height: '56px', borderRadius: '50%', background: 'linear-gradient(135deg,#3b82f6,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '22px', fontWeight: '800', flexShrink: 0 },
        instrName: { fontSize: '16px', fontWeight: '700', color: colors.text, margin: '0 0 4px' },
        instrMeta: { fontSize: '13px', color: colors.textMuted },

        catCard: { background: colors.bgCard, border: `1px solid ${colors.border}`, borderRadius: '14px', padding: '24px', cursor: 'pointer', transition: 'all 0.2s', textAlign: 'center' },
        catGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '16px' },

        empty: { textAlign: 'center', padding: '80px 40px', color: colors.textMuted },
        clearBtn: { background: 'none', border: `1px solid ${colors.border}`, color: colors.text, borderRadius: '8px', padding: '8px 18px', cursor: 'pointer', fontWeight: '600', fontSize: '13px' }
    };

    const catColors = ['#3b82f6','#8b5cf6','#10b981','#f59e0b','#ec4899','#06b6d4'];

    return (
        <div style={s.page}>
            <Navbar />

            {/* Search Hero */}
            <div style={s.hero}>
                <h1 style={s.heroTitle}>🔍 Search the Platform</h1>
                <form style={s.searchForm} onSubmit={handleSearch}>
                    <input
                        autoFocus
                        type="text"
                        placeholder="Search courses, instructors, topics..."
                        value={searchInput}
                        onChange={e => setSearchInput(e.target.value)}
                        style={s.searchInput}
                    />
                    <button type="submit" style={s.searchBtn}>Search</button>
                </form>
                {q && <p style={{ color: colors.textMuted, marginTop: '12px', fontSize: '14px' }}>
                    Showing results for "<strong style={{ color: colors.text }}>{q}</strong>"
                </p>}
            </div>

            <div style={s.layout}>
                {/* Filters Sidebar */}
                <aside style={s.sidebar}>
                    <div style={s.filterCard}>
                        <h3 style={s.filterTitle}>⚙️ Filters</h3>

                        <div style={s.filterGroup}>
                            <span style={s.filterLabel}>Price</span>
                            <div style={s.filterBtns}>
                                {['All', 'Free', 'Paid'].map(p => (
                                    <button key={p}
                                        style={{ ...s.filterBtn, background: filterPrice === p ? colors.primary : 'transparent', color: filterPrice === p ? '#fff' : colors.textMuted, borderColor: filterPrice === p ? colors.primary : colors.border }}
                                        onClick={() => setFilterPrice(p)}>
                                        {p}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div style={s.filterGroup}>
                            <span style={s.filterLabel}>Level</span>
                            <div style={s.filterBtns}>
                                {LEVELS.map(l => (
                                    <button key={l}
                                        style={{ ...s.filterBtn, background: filterLevel === l ? colors.primary : 'transparent', color: filterLevel === l ? '#fff' : colors.textMuted, borderColor: filterLevel === l ? colors.primary : colors.border }}
                                        onClick={() => setFilterLevel(l)}>
                                        {l}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div style={s.filterGroup}>
                            <span style={s.filterLabel}>Language</span>
                            <select value={filterLanguage} onChange={e => setFilterLanguage(e.target.value)} style={s.select}>
                                {LANGUAGES.map(l => <option key={l}>{l}</option>)}
                            </select>
                        </div>

                        <div style={s.filterGroup}>
                            <span style={s.filterLabel}>Category</span>
                            <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} style={s.select}>
                                <option>All</option>
                                {categories.map((c, i) => <option key={i}>{c.name}</option>)}
                            </select>
                        </div>

                        {(filterLevel !== 'All' || filterLanguage !== 'All' || filterPrice !== 'All' || filterCategory !== 'All') && (
                            <button style={s.clearBtn} onClick={() => { setFilterLevel('All'); setFilterLanguage('All'); setFilterPrice('All'); setFilterCategory('All'); }}>
                                ✕ Clear All Filters
                            </button>
                        )}
                    </div>
                </aside>

                {/* Results */}
                <div style={s.content}>
                    {/* Tabs */}
                    <div style={s.tabs}>
                        {[
                            { key: 'courses', label: `📚 Courses (${filteredCourses.length})` },
                            { key: 'instructors', label: `👨‍🏫 Instructors (${filteredInstructors.length})` },
                            { key: 'categories', label: `🗂️ Categories (${filteredCategories.length})` }
                        ].map(t => (
                            <button key={t.key} style={{
                                ...s.tab,
                                background: activeTab === t.key ? `linear-gradient(135deg, ${colors.primary}, ${colors.accent})` : 'transparent',
                                color: activeTab === t.key ? '#fff' : colors.textMuted
                            }} onClick={() => setActiveTab(t.key)}>
                                {t.label}
                            </button>
                        ))}
                    </div>

                    {/* Sort + Count Header */}
                    {activeTab === 'courses' && (
                        <div style={s.resultsHeader}>
                            <span style={s.resultsCount}>{filteredCourses.length} course{filteredCourses.length !== 1 ? 's' : ''} found</span>
                            <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={s.sortSelect}>
                                {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                            </select>
                        </div>
                    )}

                    {loading ? (
                        <div style={s.empty}><div style={{ fontSize: '48px', marginBottom: '12px' }}>⏳</div>Searching...</div>
                    ) : (
                        <>
                            {/* Courses Tab */}
                            {activeTab === 'courses' && (
                                filteredCourses.length === 0 ? (
                                    <div style={s.empty}>
                                        <div style={{ fontSize: '48px', marginBottom: '12px' }}>🔍</div>
                                        <p style={{ marginBottom: '16px' }}>No courses match your search.</p>
                                        <button style={s.clearBtn} onClick={() => { setSearchInput(''); setFilterLevel('All'); setFilterLanguage('All'); setFilterPrice('All'); }}>Clear Search</button>
                                    </div>
                                ) : (
                                    <div style={s.grid}>
                                        {filteredCourses.map(c => (
                                            <div key={c._id} style={s.courseCard}
                                                onClick={() => navigate(`/courses/${c._id}`)}
                                                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 12px 30px rgba(0,0,0,0.12)'; }}
                                                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}>
                                                <div style={s.courseImg}>
                                                    {c.thumbnailUrl
                                                        ? <img src={c.thumbnailUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                        : '🎓'}
                                                </div>
                                                <div style={s.courseBody}>
                                                    <span style={{ ...s.badge, background: `${colors.primary}15`, color: colors.primary }}>{c.technicalCategory || 'Tech'}</span>
                                                    <h3 style={s.courseTitle}>{c.courseTitle}</h3>
                                                    <p style={{ color: colors.textMuted, fontSize: '13px', margin: '0 0 8px' }}>By {c.creatorRef?.fullName || 'Instructor'}</p>
                                                    <div style={s.courseMeta}>
                                                        <span>★ {c.averageRating || '4.8'}</span>
                                                        <span>· {c.level || 'Beginner'}</span>
                                                        <span>· {c.estimatedDurationHours || 5}h</span>
                                                        <span>· {c.language || 'English'}</span>
                                                    </div>
                                                    <div style={s.courseFooter}>
                                                        <span style={s.coursePrice}>{c.price === 0 ? '🆓 Free' : `${c.price} ETB`}</span>
                                                        <button style={s.enrollBtn} onClick={e => { e.stopPropagation(); navigate(`/courses/${c._id}`); }}>
                                                            View →
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )
                            )}

                            {/* Instructors Tab */}
                            {activeTab === 'instructors' && (
                                filteredInstructors.length === 0 ? (
                                    <div style={s.empty}>
                                        <div style={{ fontSize: '48px', marginBottom: '12px' }}>👤</div>
                                        <p>No instructors found matching your search.</p>
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                        {filteredInstructors.map(inst => (
                                            <div key={inst._id} style={s.instrCard}
                                                onClick={() => navigate(`/instructors/${inst._id}`)}
                                                onMouseEnter={e => { e.currentTarget.style.transform = 'translateX(4px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.1)'; }}
                                                onMouseLeave={e => { e.currentTarget.style.transform = 'translateX(0)'; e.currentTarget.style.boxShadow = 'none'; }}>
                                                <div style={s.instrAvatar}>
                                                    {inst.profilePhotoUrl
                                                        ? <img src={inst.profilePhotoUrl} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                                                        : inst.fullName?.[0]?.toUpperCase()}
                                                </div>
                                                <div style={{ flex: 1 }}>
                                                    <h3 style={s.instrName}>{inst.fullName}</h3>
                                                    <p style={s.instrMeta}>{inst.qualifications || 'Expert Instructor'}</p>
                                                </div>
                                                <span style={{ color: colors.primary, fontWeight: '700', fontSize: '13px' }}>View Profile →</span>
                                            </div>
                                        ))}
                                    </div>
                                )
                            )}

                            {/* Categories Tab */}
                            {activeTab === 'categories' && (
                                filteredCategories.length === 0 ? (
                                    <div style={s.empty}>
                                        <div style={{ fontSize: '48px', marginBottom: '12px' }}>🗂️</div>
                                        <p>No categories found.</p>
                                    </div>
                                ) : (
                                    <div style={s.catGrid}>
                                        {filteredCategories.map((cat, i) => (
                                            <div key={cat._id || i} style={{ ...s.catCard, borderColor: catColors[i % catColors.length] + '40', background: catColors[i % catColors.length] + (theme === 'dark' ? '10' : '08') }}
                                                onClick={() => navigate(`/categories`)}
                                                onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-4px)'}
                                                onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
                                                <div style={{ fontSize: '36px', marginBottom: '10px' }}>📚</div>
                                                <h3 style={{ color: colors.text, fontSize: '15px', fontWeight: '700', margin: '0 0 4px' }}>{cat.name}</h3>
                                                <p style={{ color: colors.textMuted, fontSize: '12px', margin: 0 }}>Browse courses →</p>
                                            </div>
                                        ))}
                                    </div>
                                )
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
