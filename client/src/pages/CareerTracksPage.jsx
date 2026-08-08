import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { courseService, categoryService } from '../services/api';
import Navbar from '../components/Navbar';
import EmareTeamSection from '../components/EmareTeamSection';
import { useTheme } from '../context/ThemeContext';

const TRACK_ICONS = {
    'Web Development': '◉',
    'Full Stack MERN': '▶',
    'UI/UX Design': '◆',
    'Data Science': '▥',
    'Artificial Intelligence': '⊡',
    'Cyber Security': '▣',
    'Mobile Development': '▢',
    'Programming Languages': '▧',
    'Cloud & DevOps': '◇️',
    'Database Engineering': '▤️',
    'Digital Marketing': '◈',
    'Graphic Design': '◆️',
    'Office Productivity': '▤',
    'Soft Skills': '⊞'
};

const TRACK_COLORS = {
    'Web Development': '#06b6d4',
    'Full Stack MERN': '#3b82f6',
    'UI/UX Design': '#ec4899',
    'Data Science': '#14b8a6',
    'Artificial Intelligence': '#8b5cf6',
    'Cyber Security': '#ef4444',
    'Mobile Development': '#a855f7',
    'Programming Languages': '#f59e0b',
    'Cloud & DevOps': '#64748b',
    'Database Engineering': '#f97316',
    'Digital Marketing': '#84cc16',
    'Graphic Design': '#d946ef',
    'Office Productivity': '#10b981',
    'Soft Skills': '#6366f1'
};

export default function CareerTracksPage() {
    const { colors, theme } = useTheme();
    const navigate = useNavigate();

    const [tracks, setTracks] = useState([]);
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedTrack, setSelectedTrack] = useState(null);

    useEffect(() => {
        Promise.all([categoryService.getAll(), courseService.getAll()])
            .then(([catRes, courseRes]) => {
                const fetchedTracks = catRes.data?.data || [];
                const fetchedCourses = courseRes.data?.data || [];
                
                // Sort tracks based on importance/user request
                const priorityOrder = ['Web Development', 'Full Stack MERN', 'UI/UX Design', 'Data Science', 'Artificial Intelligence', 'Cyber Security', 'Mobile Development', 'Cloud & DevOps'];
                fetchedTracks.sort((a, b) => {
                    const idxA = priorityOrder.indexOf(a.name);
                    const idxB = priorityOrder.indexOf(b.name);
                    if (idxA === -1 && idxB === -1) return a.name.localeCompare(b.name);
                    if (idxA === -1) return 1;
                    if (idxB === -1) return -1;
                    return idxA - idxB;
                });

                setTracks(fetchedTracks);
                setCourses(fetchedCourses);

                // Auto-select first track
                if (fetchedTracks.length > 0) {
                    setSelectedTrack(fetchedTracks[0]);
                }
            })
            .catch(err => console.error('Failed to load tracks:', err))
            .finally(() => setLoading(false));
    }, []);

    const coursesForTrack = (trackName) => {
        return courses.filter(c => c.technicalCategory === trackName || c.categoryRef?.name === trackName || c.technicalCategory?.includes('Coding') && trackName.includes('Web'));
    };

    const s = {
        page: { minHeight: '100vh', background: colors.bg, fontFamily: "'Outfit','Inter',sans-serif", display: 'flex', flexDirection: 'column' },
        hero: { 
            background: `linear-gradient(135deg, ${colors.primary}15, ${colors.accent}15)`, 
            padding: '80px 5% 60px', 
            textAlign: 'center', 
            borderBottom: `1px solid ${colors.border}` 
        },
        heroTitle: { fontSize: '48px', fontWeight: '900', color: colors.text, margin: '0 0 16px', letterSpacing: '-1px' },
        heroSub: { color: colors.textMuted, fontSize: '18px', margin: '0 auto 0', maxWidth: '600px', lineHeight: 1.6 },
        layout: { display: 'flex', flex: 1, maxWidth: '1400px', margin: '0 auto', width: '100%', padding: '40px 24px', gap: '40px', alignItems: 'flex-start' },
        
        // Sidebar styling
        sidebar: { width: '320px', flexShrink: 0, position: 'sticky', top: '100px', maxHeight: 'calc(100vh - 120px)', overflowY: 'auto', paddingRight: '10px' },
        trackItem: (isActive, color) => ({
            display: 'flex', alignItems: 'center', gap: '14px', padding: '16px 20px',
            borderRadius: '12px', cursor: 'pointer', transition: 'all 0.2s ease',
            background: isActive ? `linear-gradient(135deg, ${color}20, ${color}10)` : 'transparent',
            border: `1px solid ${isActive ? color + '50' : 'transparent'}`,
            marginBottom: '8px'
        }),
        trackIcon: (isActive, color) => ({
            fontSize: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: '44px', height: '44px', borderRadius: '10px',
            background: isActive ? color : colors.bgInput,
            color: isActive ? '#fff' : colors.text
        }),
        trackName: (isActive, color) => ({
            fontSize: '15px', fontWeight: isActive ? '800' : '600',
            color: isActive ? color : colors.text
        }),

        // Main content styling
        mainContent: { flex: 1 },
        trackHeader: { marginBottom: '40px' },
        trackTitle: { fontSize: '36px', fontWeight: '900', color: colors.text, margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: '16px' },
        trackDesc: { fontSize: '16px', color: colors.textMuted, lineHeight: 1.6 },
        
        courseGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px' },
        courseCard: { 
            background: colors.bgCard, borderRadius: '16px', overflow: 'hidden', 
            border: `1px solid ${colors.border}`, transition: 'transform 0.3s ease, box-shadow 0.3s ease',
            cursor: 'pointer', display: 'flex', flexDirection: 'column'
        },
        courseImg: { height: '180px', width: '100%', objectFit: 'cover', background: colors.bgInput },
        courseBody: { padding: '24px', display: 'flex', flexDirection: 'column', flex: 1 },
        courseCategory: (color) => ({
            fontSize: '12px', fontWeight: '800', color: color, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px'
        }),
        courseTitle: { fontSize: '18px', fontWeight: '800', color: colors.text, margin: '0 0 12px', lineHeight: 1.4 },
        courseMeta: { display: 'flex', gap: '16px', color: colors.textMuted, fontSize: '13px', fontWeight: '600', marginBottom: '20px' },
        courseFooter: { marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '16px', borderTop: `1px solid ${colors.border}50` },
        price: { fontSize: '18px', fontWeight: '900', color: colors.text },
        enrollBtn: (color) => ({
            background: color, color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '8px',
            fontSize: '14px', fontWeight: '700', cursor: 'pointer'
        })
    };

    if (loading) {
        return (
            <div style={s.page}>
                <Navbar />
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: colors.textMuted, fontSize: '18px', fontWeight: '600' }}>
                    Loading Career Tracks...
                </div>
            </div>
        );
    }

    const currentTrackColor = selectedTrack ? (TRACK_COLORS[selectedTrack.name] || colors.primary) : colors.primary;

    return (
        <div style={s.page}>
            <Navbar />

            <div style={s.hero}>
                <span style={{ display: 'inline-block', padding: '6px 18px', background: `${colors.primary}15`, color: colors.primary, borderRadius: '20px', fontWeight: '800', fontSize: '13px', marginBottom: '20px', border: `1px solid ${colors.primary}30`, textTransform: 'uppercase', letterSpacing: '1px' }}>
                    Emare ELMS Learning Paths
                </span>
                <h1 style={s.heroTitle}>Professional Career Tracks</h1>
                <p style={s.heroSub}>
                    Follow a structured learning path designed by industry experts to take you from beginner to job-ready professional.
                </p>
            </div>

            <div style={s.layout}>
                {/* Sidebar Navigation */}
                <div style={s.sidebar}>
                    <h3 style={{ fontSize: '13px', fontWeight: '800', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 16px 16px' }}>Select a Division</h3>
                    {tracks.map(track => {
                        const isActive = selectedTrack?._id === track._id;
                        const icon = TRACK_ICONS[track.name] || '▧';
                        const color = TRACK_COLORS[track.name] || colors.primary;
                        
                        return (
                            <div 
                                key={track._id} 
                                style={s.trackItem(isActive, color)}
                                onClick={() => setSelectedTrack(track)}
                                onMouseEnter={e => { if(!isActive) e.currentTarget.style.background = `${colors.bgInput}` }}
                                onMouseLeave={e => { if(!isActive) e.currentTarget.style.background = 'transparent' }}
                            >
                                <div style={s.trackIcon(isActive, color)}>{icon}</div>
                                <span style={s.trackName(isActive, color)}>{track.name}</span>
                            </div>
                        );
                    })}
                </div>

                {/* Main Content Area */}
                <div style={s.mainContent}>
                    {selectedTrack && (
                        <>
                            <div style={s.trackHeader}>
                                <h2 style={s.trackTitle}>
                                    <span style={{ fontSize: '42px' }}>{TRACK_ICONS[selectedTrack.name] || '▧'}</span>
                                    {selectedTrack.name}
                                </h2>
                                <p style={s.trackDesc}>{selectedTrack.description || 'Master the essential skills required for this career path through our comprehensive, project-based courses.'}</p>
                            </div>

                            <div style={s.courseGrid}>
                                {coursesForTrack(selectedTrack.name).map((course, idx) => (
                                    <div 
                                        key={course._id} 
                                        style={s.courseCard}
                                        onClick={() => navigate(`/courses/${course._id}`)}
                                        onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-6px)'}
                                        onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                                    >
                                        {course.thumbnailUrl ? (
                                            <img src={course.thumbnailUrl} alt={course.courseTitle} style={s.courseImg} />
                                        ) : (
                                            <div style={{ ...s.courseImg, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `linear-gradient(135deg, ${currentTrackColor}20, ${currentTrackColor}40)` }}>
                                                <span style={{ fontSize: '64px' }}>{TRACK_ICONS[selectedTrack.name] || '▧'}</span>
                                            </div>
                                        )}
                                        
                                        <div style={s.courseBody}>
                                            <span style={s.courseCategory(currentTrackColor)}>Step {idx + 1}</span>
                                            <h3 style={s.courseTitle}>{course.courseTitle}</h3>
                                            
                                            <div style={s.courseMeta}>
                                                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                     {course.averageRating || '4.8'}
                                                </span>
                                                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    ⏱️ {course.estimatedDurationHours || '10'}h
                                                </span>
                                                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    ↗ {course.level || 'Beginner'}
                                                </span>
                                            </div>

                                            <div style={s.courseFooter}>
                                                <span style={s.price}>
                                                    {course.price === 0 ? '🆓 Free' : `${course.price} ETB`}
                                                </span>
                                                <button style={s.enrollBtn(currentTrackColor)}>
                                                    View Details
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {coursesForTrack(selectedTrack.name).length === 0 && (
                                    <div style={{ gridColumn: '1 / -1', padding: '60px', textAlign: 'center', background: colors.bgCard, borderRadius: '16px', border: `1px dashed ${colors.border}` }}>
                                        <span style={{ fontSize: '48px', display: 'block', marginBottom: '16px' }}>▣</span>
                                        <h3 style={{ fontSize: '20px', color: colors.text, margin: '0 0 8px' }}>Courses Coming Soon</h3>
                                        <p style={{ color: colors.textMuted }}>We are currently building the curriculum for the {selectedTrack.name} track.</p>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>
            <EmareTeamSection />
        </div>
    );
}
