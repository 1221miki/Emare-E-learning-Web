import React from 'react';

export default function MyLearningTab(dash) {
    const { colors, setActiveTab, enrollments, certificates, allCourses, searchQuery, setSearchQuery, navigate, styles } = dash;
        <div>
            <div style={styles.tabHeader}>
                <h2 style={styles.tabTitle}>My Courses & Learning Tracks</h2>
                <p style={styles.tabSubtitle}>Access your enrolled lectures and track your clearance status</p>
            </div>
            {enrollments.length === 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    <div style={{ ...styles.panelCard, display: 'grid', gridTemplateColumns: '1fr 360px', gap: 24, alignItems: 'center' }}>
                        <div>
                            <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                                <div style={{ width: 84, height: 84, borderRadius: 18, background: `linear-gradient(135deg, ${colors.primary}20, ${colors.accent}20)`, display: 'grid', placeItems: 'center', fontSize: 40 }}>🚀</div>
                                <div>
                                    <h3 style={{ margin: 0, color: colors.text, fontSize: 22, fontWeight: 900 }}>Start Your Learning Journey</h3>
                                    <p style={{ margin: '8px 0 0', color: colors.textMuted, maxWidth: 560 }}>You haven't enrolled in any courses yet. Explore featured courses, curated learning paths, and start a career-focused learning track.</p>
                                </div>
                            </div>

                            <div style={{ marginTop: 18, display: 'flex', gap: 12 }}>
                                <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search courses, e.g. React, Python" style={{ ...styles.input, flex: 1 }} />
                                <button onClick={() => navigate(`/search?q=${encodeURIComponent(searchQuery)}`)} style={styles.resumeBtn}>Search</button>
                            </div>

                            <div style={{ marginTop: 20, display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
                                <div style={styles.statCard}><span style={styles.statValue}>{allCourses.length || '—'}</span><span style={styles.statLabel}>Available Courses</span></div>
                                <div style={styles.statCard}><span style={styles.statValue}>{Array.from(new Set(allCourses.map(c => c.creatorRef?._id))).length || '—'}</span><span style={styles.statLabel}>Professional Instructors</span></div>
                                <div style={styles.statCard}><span style={styles.statValue}>{(allCourses.reduce((s, c) => s + (c.enrolledCount || 0), 0)) || '4,500+'}</span><span style={styles.statLabel}>Students Enrolled</span></div>
                                <div style={styles.statCard}><span style={styles.statValue}>{certificates.length || '—'}</span><span style={styles.statLabel}>Certificates</span></div>
                            </div>
                        </div>

                        <div>
                            <h4 style={{ margin: 0, color: colors.text, fontSize: 16, fontWeight: 800 }}>Featured Courses</h4>
                            <div style={{ marginTop: 12 }}>
                                <FeaturedCarousel courses={allCourses.slice(0,6)} />
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20 }}>
                        <div>
                            <div style={{ ...styles.panelCard }}>
                                <h4 style={styles.panelCardTitle}>Career Paths</h4>
                                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                                    {['Frontend Developer','Backend Developer','Full Stack Developer','UI/UX Designer','Data Scientist','Cyber Security Analyst'].map(p => (
                                        <div key={p} style={{ padding: 12, borderRadius: 12, background: colors.bgInput, border: `1px solid ${colors.border}`, minWidth: 180 }}>
                                            <div style={{ fontWeight: 800, color: colors.text }}>{p}</div>
                                            <div style={{ color: colors.textMuted, fontSize: 12, marginTop: 8 }}>Complete learning path with projects and certificates.</div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div style={{ ...styles.panelCard, marginTop: 16 }}>
                                <h4 style={styles.panelCardTitle}>Why Learn With Emare ELMS?</h4>
                                <ul style={{ margin: 0, paddingLeft: 18, color: colors.textMuted }}>
                                    <li>Industry Projects</li>
                                    <li>Certificates</li>
                                    <li>Expert Instructors</li>
                                    <li>Lifetime Access</li>
                                    <li>Community Support</li>
                                    <li>Live Sessions</li>
                                </ul>
                            </div>
                        </div>

                        <div>
                            <div style={{ ...styles.panelCard }}>
                                <h4 style={styles.panelCardTitle}>Trending This Week</h4>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    {(allCourses.slice(0,5).map(c => (
                                        <div key={c._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div style={{ color: colors.text }}>{c.courseTitle}</div>
                                            <div style={{ color: colors.textMuted, fontSize: 12 }}>ETB {c.price || '—'}</div>
                                        </div>
                                    )))}
                                </div>
                            </div>

                            <div style={{ ...styles.panelCard, marginTop: 12 }}>
                                <h4 style={styles.panelCardTitle}>Top Instructors</h4>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                    {Array.from(new Map(allCourses.map(c => [c.creatorRef?._id, c.creatorRef])).values()).slice(0,4).map(inst => (
                                        <div key={inst?._id} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                                            <div style={{ width: 44, height: 44, borderRadius: 8, background: `linear-gradient(135deg, ${colors.primary}10, ${colors.accent}10)` }} />
                                            <div>
                                                <div style={{ color: colors.text, fontWeight: 800 }}>{inst?.fullName || 'Instructor'}</div>
                                                <div style={{ color: colors.textMuted, fontSize: 12 }}>Top Mentor</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'center', marginTop: 8 }}>
                        <button onClick={() => navigate('/courses')} style={{ ...styles.resumeBtn, padding: '12px 28px' }}>Browse Course Catalog</button>
                    </div>
                </div>
            ) : (
                <div style={styles.courseGrid}>
                    {enrollments.map((enroll) => {
                        const course = enroll.courseRef || {};
                        const progress = enroll.completionPercentage || 0;
                        const cleared = enroll.tuitionClearanceFlag;
                        return (
                            <div key={enroll._id} style={{ ...styles.courseCard, position: 'relative', overflow: 'hidden' }}>
                                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: `linear-gradient(90deg, ${colors.primary}, ${colors.accent})`, width: `${progress}%`, transition: 'width 0.5s' }} />
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: '8px' }}>
                                    <span style={styles.courseBadge}>{course.technicalCategory || 'Development'}</span>
                                    <span style={{ fontSize: '11px', fontWeight: '700', color: cleared ? colors.success : colors.warning, background: cleared ? `${colors.success}15` : `${colors.warning}15`, padding: '3px 8px', borderRadius: '6px' }}>
                                        {cleared ? '✓ Cleared' : '⏳ Pending'}
                                    </span>
                                </div>
                                <h3 style={styles.courseTitle}>{course.courseTitle || 'Course'}</h3>
                                <p style={{ color: colors.textMuted, fontSize: '12px', margin: '0 0 12px' }}>By {course.creatorRef?.fullName || 'EMARE Instructor'} · {course.estimatedDurationHours || 0}h total</p>
                                <div style={{ marginBottom: '8px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                        <span style={{ color: colors.textMuted, fontSize: '12px' }}>Progress</span>
                                        <span style={{ color: colors.primary, fontSize: '12px', fontWeight: '700' }}>{progress}%</span>
                                    </div>
                                    <div style={styles.progressBar}>
                                        <div style={{ ...styles.progressFill, width: `${progress}%` }} />
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                                    {cleared ? (
                                        <button onClick={() => navigate(`/student/learn/${course._id}`)} style={{ ...styles.watchBtn, flex: 1 }}>▶ Continue Learning</button>
                                    ) : (
                                        <button onClick={() => setActiveTab('payments')} style={{ ...styles.lockedBtn, flex: 1, textAlign: 'center' }}>🔒 Clear Tuition to Access</button>
                                    )}
                                    <button onClick={() => navigate(`/courses/${course._id}`)} style={{ background: 'transparent', border: `1px solid ${colors.border}`, color: colors.textMuted, borderRadius: '8px', padding: '8px 12px', cursor: 'pointer', fontSize: '12px' }}>Details</button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
}
