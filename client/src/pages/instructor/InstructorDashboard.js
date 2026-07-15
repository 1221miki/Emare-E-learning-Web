import React, { useState, useEffect } from 'react';
import { courseService, quizService, gradebookService } from '../../services/api';
import Sidebar from '../../components/Sidebar';
import StatCard from '../../components/StatCard';
import Modal from '../../components/Modal';

export default function InstructorDashboard() {
    const [activeTab, setActiveTab] = useState('courses');
    const [loading, setLoading] = useState(true);
    
    // Data states
    const [courses, setCourses] = useState([]);
    const [selectedCourse, setSelectedCourse] = useState(null);
    const [submissions, setSubmissions] = useState([]);
    
    // Modal & Form states
    const [isCourseModalOpen, setIsCourseModalOpen] = useState(false);
    const [isQuizModalOpen, setIsQuizModalOpen] = useState(false);
    const [isGradeModalOpen, setIsGradeModalOpen] = useState(false);
    
    const [courseForm, setCourseForm] = useState({ courseTitle: '', descriptionText: '', technicalCategory: 'Web Coding', estimatedDurationHours: 1 });
    const [quizForm, setQuizForm] = useState({ quizTitle: '', allottedDurationMinutes: 15, passingScoreThreshold: 60 });
    const [gradeForm, setGradeForm] = useState({ numericalScoreEarned: 0, instructorReviewNotes: '' });
    const [selectedSubmission, setSelectedSubmission] = useState(null);

    useEffect(() => {
        fetchCourses();
    }, []);

    const fetchCourses = async () => {
        setLoading(true);
        try {
            const res = await courseService.getInstructorCourses();
            setCourses(res.data.data);
            if(res.data.data.length > 0) setSelectedCourse(res.data.data[0]);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    // When a course is selected for grading, fetch its submissions
    useEffect(() => {
        if(activeTab === 'grading' && selectedCourse) {
            gradebookService.getSubmissionsForCourse(selectedCourse._id)
                .then(res => setSubmissions(res.data.data))
                .catch(console.error);
        }
    }, [activeTab, selectedCourse]);

    // ── Actions ────────────────────────────────────────────────

    const handleCreateCourse = async (e) => {
        e.preventDefault();
        try {
            const res = await courseService.create(courseForm);
            setCourses([res.data.data, ...courses]);
            setIsCourseModalOpen(false);
            setCourseForm({ courseTitle: '', descriptionText: '', technicalCategory: 'Web Coding', estimatedDurationHours: 1 });
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to create course');
        }
    };

    const handleSubmitForReview = async (id) => {
        try {
            await courseService.submitForReview(id);
            setCourses(prev => prev.map(c => c._id === id ? { ...c, publicationState: 'Pending Audit' } : c));
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to submit.');
        }
    };

    const handleCreateQuiz = async (e) => {
        e.preventDefault();
        try {
            // Placeholder payload for demonstration - in a full implementation, you'd have a dynamic UI to build the questionArray
            const payload = {
                ...quizForm,
                courseRef: selectedCourse._id,
                submissionDeadline: new Date(Date.now() + 7*24*60*60*1000), // +1 week
                questionArray: [{
                    questionText: "Sample Question 1?",
                    options: ["A", "B", "C", "D"],
                    correctAnswerIndex: 0
                }]
            };
            await quizService.create(payload);
            alert("Quiz created successfully!");
            setIsQuizModalOpen(false);
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to create quiz');
        }
    };

    const handleGradeSubmission = async (e) => {
        e.preventDefault();
        try {
            await gradebookService.gradeSubmission(selectedSubmission._id, gradeForm);
            setSubmissions(prev => prev.map(s => s._id === selectedSubmission._id ? 
                { ...s, numericalScoreEarned: gradeForm.numericalScoreEarned, isGraded: true } : s
            ));
            setIsGradeModalOpen(false);
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to submit grade');
        }
    };

    // ── Renderers ──────────────────────────────────────────────

    const renderCourseList = () => (
        <div style={styles.tabContent}>
            <div style={styles.flexBetween}>
                <h2 style={styles.sectionTitle}>My Course Curriculums</h2>
                <button onClick={() => setIsCourseModalOpen(true)} style={styles.primaryBtn}>+ New Course</button>
            </div>
            
            <div style={styles.statsGrid}>
                <StatCard label="Total Courses" value={courses.length} color="#3b82f6" icon="📚" />
                <StatCard label="Active" value={courses.filter(c => c.publicationState === 'Active').length} color="#10b981" />
                <StatCard label="Drafts" value={courses.filter(c => c.publicationState === 'Draft').length} color="#f59e0b" />
            </div>

            {courses.length === 0 ? (
                <div style={styles.emptyState}>You haven't created any courses yet.</div>
            ) : (
                <div style={styles.courseList}>
                    {courses.map(c => (
                        <div key={c._id} style={styles.courseCard}>
                            <div style={{flex:1}}>
                                <div style={{display:'flex', alignItems:'center', gap:'12px', marginBottom:'8px'}}>
                                    <span style={{...styles.badge, background: c.publicationState==='Active'?'rgba(16,185,129,0.1)':'rgba(245,158,11,0.1)', color: c.publicationState==='Active'?'#10b981':'#f59e0b'}}>
                                        {c.publicationState}
                                    </span>
                                    <h3 style={{margin:0, color:'#f1f5f9'}}>{c.courseTitle}</h3>
                                </div>
                                <p style={{color:'#64748b', fontSize:'13px', margin:'0 0 12px'}}>{c.technicalCategory} · {c.estimatedDurationHours} hours</p>
                                
                                {/* Placeholder for Curriculum Builder Tree UI */}
                                <div style={styles.curriculumPreview}>
                                    <p style={{margin:0, fontSize:'12px', color:'#94a3b8'}}>Curriculum tree builder would render here...</p>
                                </div>
                            </div>
                            
                            <div style={{display:'flex', flexDirection:'column', gap:'8px'}}>
                                {c.publicationState === 'Draft' && (
                                    <button onClick={() => handleSubmitForReview(c._id)} style={styles.actionBtn}>Submit for Review</button>
                                )}
                                <button onClick={() => { setSelectedCourse(c); setIsQuizModalOpen(true); }} style={styles.actionBtnAlt}>+ Add Quiz</button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );

    const renderGradingPortal = () => (
        <div style={styles.tabContent}>
            <h2 style={styles.sectionTitle}>Student Submissions & Grading</h2>
            
            <div style={{marginBottom:'24px'}}>
                <label style={{color:'#94a3b8', fontSize:'13px', display:'block', marginBottom:'8px'}}>Select Course to View Submissions:</label>
                <select 
                    value={selectedCourse?._id || ''} 
                    onChange={e => setSelectedCourse(courses.find(c => c._id === e.target.value))}
                    style={styles.selectInput}
                >
                    {courses.map(c => <option key={c._id} value={c._id}>{c.courseTitle}</option>)}
                </select>
            </div>

            {submissions.length === 0 ? (
                <div style={styles.emptyState}>No submissions available for this course yet.</div>
            ) : (
                <div style={styles.tableContainer}>
                    <table style={styles.table}>
                        <thead>
                            <tr>
                                <th>Student</th>
                                <th>Assessment</th>
                                <th>Submission Date</th>
                                <th>Status / Score</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {submissions.map(sub => (
                                <tr key={sub._id}>
                                    <td>{sub.studentRef?.fullName}</td>
                                    <td>{sub.assessmentRef?.quizTitle}</td>
                                    <td>{new Date(sub.submissionTimestamp).toLocaleDateString()}</td>
                                    <td>
                                        {sub.isGraded ? (
                                            <span style={{color:'#10b981', fontWeight:'bold'}}>{sub.numericalScoreEarned}/100</span>
                                        ) : (
                                            <span style={{color:'#f59e0b'}}>Needs Grading</span>
                                        )}
                                    </td>
                                    <td>
                                        <button 
                                            onClick={() => {
                                                setSelectedSubmission(sub);
                                                setGradeForm({ numericalScoreEarned: sub.numericalScoreEarned || 0, instructorReviewNotes: sub.instructorReviewNotes || '' });
                                                setIsGradeModalOpen(true);
                                            }}
                                            style={styles.textBtn}
                                        >
                                            {sub.isGraded ? 'Edit Grade' : 'Grade Now'}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );

    const sidebarItems = [
        { key: 'courses', label: '📚 Course Curriculums' },
        { key: 'grading', label: '📝 Grading Portal' }
    ];

    return (
        <div style={styles.page}>
            <Sidebar navItems={sidebarItems} activeTab={activeTab} onTabChange={setActiveTab} />
            
            <main style={styles.main}>
                <header style={styles.header}>
                    <h1 style={styles.greeting}>Instructor Workspace</h1>
                </header>

                {loading ? <div style={{color:'#64748b'}}>Loading data...</div> : (
                    <>
                        {activeTab === 'courses' && renderCourseList()}
                        {activeTab === 'grading' && renderGradingPortal()}
                    </>
                )}
            </main>

            {/* Create Course Modal */}
            <Modal isOpen={isCourseModalOpen} onClose={() => setIsCourseModalOpen(false)} title="Create New Course">
                <form onSubmit={handleCreateCourse} style={styles.form}>
                    <input style={styles.input} placeholder="Course Title" required value={courseForm.courseTitle} onChange={e=>setCourseForm({...courseForm, courseTitle:e.target.value})} />
                    <textarea style={{...styles.input, minHeight:'80px'}} placeholder="Description" required value={courseForm.descriptionText} onChange={e=>setCourseForm({...courseForm, descriptionText:e.target.value})} />
                    <select style={styles.input} value={courseForm.technicalCategory} onChange={e=>setCourseForm({...courseForm, technicalCategory:e.target.value})}>
                        {['Web Coding', 'Creative Media', 'Robotics Hardware', 'Network Engineering', 'Mobile Development'].map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <input style={styles.input} type="number" placeholder="Duration (hours)" min="1" required value={courseForm.estimatedDurationHours} onChange={e=>setCourseForm({...courseForm, estimatedDurationHours:e.target.value})} />
                    <button type="submit" style={styles.primaryBtn}>Save Draft</button>
                </form>
            </Modal>

            {/* Create Quiz Modal */}
            <Modal isOpen={isQuizModalOpen} onClose={() => setIsQuizModalOpen(false)} title={`Add Quiz to ${selectedCourse?.courseTitle}`}>
                <form onSubmit={handleCreateQuiz} style={styles.form}>
                    <input style={styles.input} placeholder="Quiz Title" required value={quizForm.quizTitle} onChange={e=>setQuizForm({...quizForm, quizTitle:e.target.value})} />
                    <label style={styles.label}>Duration (minutes)</label>
                    <input style={styles.input} type="number" min="5" max="180" required value={quizForm.allottedDurationMinutes} onChange={e=>setQuizForm({...quizForm, allottedDurationMinutes:e.target.value})} />
                    <label style={styles.label}>Passing Score (%)</label>
                    <input style={styles.input} type="number" min="0" max="100" required value={quizForm.passingScoreThreshold} onChange={e=>setQuizForm({...quizForm, passingScoreThreshold:e.target.value})} />
                    <p style={{color:'#64748b', fontSize:'12px'}}>*Question builder UI omitted for brevity*</p>
                    <button type="submit" style={styles.primaryBtn}>Publish Quiz</button>
                </form>
            </Modal>

            {/* Grade Submission Modal */}
            <Modal isOpen={isGradeModalOpen} onClose={() => setIsGradeModalOpen(false)} title="Grade Student Submission">
                {selectedSubmission?.submittedRepositoryURL && (
                    <div style={{marginBottom:'16px', padding:'12px', background:'rgba(255,255,255,0.05)', borderRadius:'8px'}}>
                        <p style={{margin:0, fontSize:'13px', color:'#94a3b8'}}>Submitted Link:</p>
                        <a href={selectedSubmission.submittedRepositoryURL} target="_blank" rel="noreferrer" style={{color:'#60a5fa'}}>{selectedSubmission.submittedRepositoryURL}</a>
                    </div>
                )}
                <form onSubmit={handleGradeSubmission} style={styles.form}>
                    <label style={styles.label}>Score (0-100)</label>
                    <input style={styles.input} type="number" min="0" max="100" required value={gradeForm.numericalScoreEarned} onChange={e=>setGradeForm({...gradeForm, numericalScoreEarned:e.target.value})} />
                    <label style={styles.label}>Feedback Notes</label>
                    <textarea style={{...styles.input, minHeight:'100px'}} placeholder="Provide constructive feedback..." value={gradeForm.instructorReviewNotes} onChange={e=>setGradeForm({...gradeForm, instructorReviewNotes:e.target.value})} />
                    <button type="submit" style={styles.primaryBtn}>Save Grade</button>
                </form>
            </Modal>
        </div>
    );
}

const styles = {
    page: { display: 'flex', minHeight: '100vh', background: '#0f172a' },
    main: { marginLeft: '250px', flex: 1, padding: '40px', overflowY: 'auto' },
    header: { marginBottom: '32px' },
    greeting: { color: '#f1f5f9', fontSize: '28px', fontWeight: '800', margin: 0 },
    tabContent: { animation: 'fadeIn 0.3s ease-in-out' },
    sectionTitle: { color: '#f1f5f9', fontSize: '20px', fontWeight: '700', margin: 0 },
    flexBetween: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' },
    statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '32px' },
    emptyState: { padding: '40px', textAlign: 'center', color: '#64748b', background: '#1e293b', borderRadius: '16px', border: '1px solid #334155' },
    courseList: { display: 'flex', flexDirection: 'column', gap: '16px' },
    courseCard: { background: '#1e293b', borderRadius: '16px', padding: '24px', border: '1px solid #334155', display:'flex', justifyContent:'space-between' },
    badge: { padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700', textTransform:'uppercase' },
    curriculumPreview: { background: '#0f172a', borderRadius: '8px', padding: '16px', border: '1px dashed #334155', marginTop: '16px' },
    actionBtn: { background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.3)', color: '#60a5fa', borderRadius: '8px', padding: '8px 16px', cursor: 'pointer', fontWeight: '600', fontSize:'13px' },
    actionBtnAlt: { background: 'transparent', border: '1px solid #334155', color: '#f1f5f9', borderRadius: '8px', padding: '8px 16px', cursor: 'pointer', fontWeight: '600', fontSize:'13px' },
    primaryBtn: { background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', color: '#fff', border: 'none', borderRadius: '10px', padding: '10px 20px', fontWeight: '700', cursor: 'pointer', fontSize:'14px' },
    tableContainer: { background: '#1e293b', borderRadius: '16px', border: '1px solid #334155', overflowX: 'auto' },
    table: { width: '100%', borderCollapse: 'collapse', textAlign: 'left' },
    textBtn: { background:'transparent', border:'none', color:'#3b82f6', textDecoration:'underline', cursor:'pointer' },
    form: { display: 'flex', flexDirection: 'column', gap: '12px' },
    label: { color: '#94a3b8', fontSize: '13px', marginBottom: '-8px' },
    input: { background: 'rgba(255,255,255,0.05)', border: '1px solid #334155', borderRadius: '8px', color: '#fff', padding: '12px', width: '100%', boxSizing:'border-box', fontFamily:'inherit' },
    selectInput: { background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#fff', padding: '10px 16px', minWidth: '250px' }
};
