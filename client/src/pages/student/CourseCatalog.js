import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { courseService, categoryService } from '../../services/api';
import { useNavigate } from 'react-router-dom';

export default function CourseCatalog() {
    const { isAuthenticated } = useAuth();
    const { colors } = useTheme();
    const navigate = useNavigate();
    
    const [courses, setCourses] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    
    const [filterCategory, setFilterCategory] = useState('All');
    const [filterLevel, setFilterLevel] = useState('All');
    const [filterLanguage, setFilterLanguage] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        Promise.all([courseService.getAll(), categoryService.getAll()])
            .then(([resCourses, resCats]) => {
                setCourses(resCourses.data.data);
                setCategories([{ name: 'All' }, ...resCats.data.data]);
            })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    const filtered = courses.filter(c => {
        const matchCat = filterCategory === 'All' || c.technicalCategory === filterCategory;
        const matchLevel = filterLevel === 'All' || c.level === filterLevel;
        const matchLang = filterLanguage === 'All' || c.language === filterLanguage;
        const matchSearch = c.courseTitle.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            c.descriptionText.toLowerCase().includes(searchQuery.toLowerCase());
        return matchCat && matchLevel && matchLang && matchSearch;
    });

    return (
        <div style={{ minHeight: '100vh', background: colors.bg, fontFamily: "'Segoe UI', sans-serif" }}>
            {/* Top Navigation */}
            <nav style={{ background: colors.bgCard, borderBottom: `1px solid ${colors.border}`, padding: '0 40px', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', color: '#fff', fontSize: '18px' }}>E</div>
                    <span style={{ color: colors.text, fontWeight: '700', fontSize: '16px' }}>Emare ELMS</span>
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                    {isAuthenticated ? (
                        <button onClick={() => navigate(-1)} style={{ background: 'transparent', border: `1px solid ${colors.border}`, color: colors.textMuted, borderRadius: '8px', padding: '8px 16px', cursor: 'pointer', fontSize: '13px' }}>← Back to Dashboard</button>
                    ) : (
                        <>
                            <button onClick={() => navigate('/login')} style={{ background: 'transparent', border: `1px solid ${colors.border}`, color: colors.textMuted, borderRadius: '8px', padding: '8px 16px', cursor: 'pointer', fontSize: '13px' }}>Sign In</button>
                            <button onClick={() => navigate('/register')} style={{ background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', border: 'none', color: '#fff', borderRadius: '8px', padding: '8px 16px', cursor: 'pointer', fontSize: '13px', fontWeight: '700' }}>Register</button>
                        </>
                    )}
                </div>
            </nav>

            <div style={{ maxWidth: '1440px', margin: '0 auto', padding: '40px', display: 'flex', gap: '40px' }}>
                {/* Left Sidebar Filters */}
                <aside style={{ width: '280px', flexShrink: 0 }}>
                    <div style={{ background: colors.bgCard, border: `1px solid ${colors.border}`, borderRadius: '16px', padding: '24px', position: 'sticky', top: '100px' }}>
                        <h3 style={{ color: colors.text, fontSize: '18px', fontWeight: '800', marginBottom: '20px' }}>Filters</h3>
                        
                        <input 
                            type="text" 
                            placeholder="Search courses..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            style={{ width: '100%', background: colors.bgInput, border: `1px solid ${colors.border}`, color: colors.text, padding: '10px 12px', borderRadius: '8px', marginBottom: '24px', outline: 'none' }}
                        />

                        <div style={{ marginBottom: '24px' }}>
                            <h4 style={{ color: colors.textMuted, fontSize: '12px', textTransform: 'uppercase', marginBottom: '12px', fontWeight: '700' }}>Category</h4>
                            {categories.map(cat => (
                                <div key={cat.name} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                                    <input type="radio" id={`cat-${cat.name}`} name="category" checked={filterCategory === (cat.name || 'All')} onChange={() => setFilterCategory(cat.name || 'All')} style={{ accentColor: colors.primary }} />
                                    <label htmlFor={`cat-${cat.name}`} style={{ color: colors.text, fontSize: '14px', cursor: 'pointer' }}>{cat.name || 'All'}</label>
                                </div>
                            ))}
                        </div>

                        <div style={{ marginBottom: '24px' }}>
                            <h4 style={{ color: colors.textMuted, fontSize: '12px', textTransform: 'uppercase', marginBottom: '12px', fontWeight: '700' }}>Level</h4>
                            {['All', 'Beginner', 'Intermediate', 'Advanced'].map(lvl => (
                                <div key={lvl} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                                    <input type="radio" id={`lvl-${lvl}`} name="level" checked={filterLevel === lvl} onChange={() => setFilterLevel(lvl)} style={{ accentColor: colors.primary }} />
                                    <label htmlFor={`lvl-${lvl}`} style={{ color: colors.text, fontSize: '14px', cursor: 'pointer' }}>{lvl}</label>
                                </div>
                            ))}
                        </div>

                        <div>
                            <h4 style={{ color: colors.textMuted, fontSize: '12px', textTransform: 'uppercase', marginBottom: '12px', fontWeight: '700' }}>Language</h4>
                            {['All', 'English', 'Amharic', 'Afaan Oromo'].map(lang => (
                                <div key={lang} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                                    <input type="radio" id={`lang-${lang}`} name="language" checked={filterLanguage === lang} onChange={() => setFilterLanguage(lang)} style={{ accentColor: colors.primary }} />
                                    <label htmlFor={`lang-${lang}`} style={{ color: colors.text, fontSize: '14px', cursor: 'pointer' }}>{lang}</label>
                                </div>
                            ))}
                        </div>
                    </div>
                </aside>

                {/* Main Content */}
                <main style={{ flex: 1 }}>
                    <div style={{ marginBottom: '40px' }}>
                        <h1 style={{ color: colors.text, fontSize: '36px', fontWeight: '900', margin: '0 0 12px' }}>Explore Catalog</h1>
                        <p style={{ color: colors.textMuted, fontSize: '16px' }}>Showing {filtered.length} courses</p>
                    </div>

                    {loading ? (
                        <p style={{ color: colors.textMuted }}>Loading courses...</p>
                    ) : filtered.length === 0 ? (
                        <div style={{ padding: '40px', background: colors.bgCard, borderRadius: '16px', border: `1px solid ${colors.border}`, textAlign: 'center', color: colors.textMuted }}>
                            No courses match your criteria.
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '24px' }}>
                            {filtered.map(course => (
                                <div key={course._id} onClick={() => navigate(`/courses/${course._id}`)} style={{ background: colors.bgCard, borderRadius: '16px', border: `1px solid ${colors.border}`, overflow: 'hidden', cursor: 'pointer', transition: 'transform 0.2s', display: 'flex', flexDirection: 'column' }}>
                                    <div style={{ height: '140px', background: course.thumbnailUrl ? `url(${course.thumbnailUrl}) center/cover` : 'linear-gradient(135deg, #3b82f633, #8b5cf611)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        {!course.thumbnailUrl && <span style={{ fontSize: '40px' }}>📚</span>}
                                    </div>
                                    <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', flex: 1 }}>
                                        <span style={{ color: colors.primary, fontSize: '11px', fontWeight: '800', display: 'inline-block', marginBottom: '8px', textTransform: 'uppercase' }}>
                                            {course.technicalCategory}
                                        </span>
                                        <h3 style={{ color: colors.text, fontSize: '16px', fontWeight: '700', margin: '0 0 8px', lineHeight: '1.4' }}>{course.courseTitle}</h3>
                                        
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '16px' }}>
                                            <span style={{ color: '#fbbf24', fontSize: '14px' }}>★</span>
                                            <span style={{ color: colors.text, fontSize: '13px', fontWeight: '600' }}>{course.averageRating || '0.0'}</span>
                                            <span style={{ color: colors.textMuted, fontSize: '12px' }}>({course.totalReviews || 0})</span>
                                        </div>

                                        <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
                                            <span style={{ background: colors.bg, padding: '4px 8px', borderRadius: '4px', fontSize: '11px', color: colors.textMuted }}>{course.level || 'Beginner'}</span>
                                            <span style={{ background: colors.bg, padding: '4px 8px', borderRadius: '4px', fontSize: '11px', color: colors.textMuted }}>{course.estimatedDurationHours}h</span>
                                            <span style={{ background: colors.bg, padding: '4px 8px', borderRadius: '4px', fontSize: '11px', color: colors.textMuted }}>{course.language || 'English'}</span>
                                        </div>
                                        
                                        <div style={{ marginTop: 'auto', borderTop: `1px solid ${colors.border}`, paddingTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span style={{ color: colors.text, fontWeight: '800', fontSize: '18px' }}>
                                                {course.price === 0 ? 'Free' : `$${course.price}`}
                                            </span>
                                            <span style={{ color: colors.primary, fontSize: '13px', fontWeight: '700' }}>View Details →</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
}
