import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import { courseService, uploadService } from '../../services/api';
import {
    ArrowLeft,
    ArrowRight,
    CheckCircle,
    FileText,
    ImagePlus,
    PlayCircle,
    Plus,
    Trash2,
    UploadCloud
} from 'lucide-react';

const STEPS = [
    { title: 'Course Info', description: 'Define the course title, category, price and overview.' },
    { title: 'Curriculum', description: 'Build chapters and lessons for your course.' },
    { title: 'Media & Resources', description: 'Upload thumbnail, preview video and supporting assets.' },
    { title: 'Review & Publish', description: 'Confirm course details and submit for review.' }
];

const initialForm = {
    courseTitle: '',
    subtitle: '',
    descriptionText: '',
    technicalCategory: 'Web Coding',
    level: 'Beginner',
    language: 'English',
    estimatedDurationHours: 1,
    price: 0,
    learningObjectives: '',
    requirements: '',
    tags: '',
    resources: '',
    thumbnailUrl: '',
    previewVideoUrl: ''
};

const emptyLesson = { lessonTitle: '', videoUrl: '', notesPdfUrl: '', resourceLink: '', isFreePreview: false };

export default function CourseCreationWizard() {
    const { colors } = useTheme();
    const navigate = useNavigate();
    const [activeStep, setActiveStep] = useState(0);
    const [form, setForm] = useState(initialForm);
    const [curriculum, setCurriculum] = useState([]);
    const [chapterTitle, setChapterTitle] = useState('');
    const [lessonDraft, setLessonDraft] = useState(emptyLesson);
    const [courseId, setCourseId] = useState(null);
    const [statusMessage, setStatusMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [isUploading, setIsUploading] = useState(false);

    const stepStatus = useMemo(() => {
        return STEPS.map((step, index) => ({
            ...step,
            completed: index < activeStep
        }));
    }, [activeStep]);

    const validateStep = () => {
        if (activeStep === 0) {
            if (!form.courseTitle.trim()) return 'Course title is required.';
            if (!form.descriptionText.trim() || form.descriptionText.trim().length < 20) return 'Course description must be at least 20 characters.';
            if (!form.estimatedDurationHours || Number(form.estimatedDurationHours) < 1) return 'Estimated duration must be at least 1 hour.';
        }
        if (activeStep === 1) {
            if (curriculum.length === 0) return 'Add at least one chapter to your curriculum.';
            for (const chapter of curriculum) {
                if (!chapter.chapterTitle.trim()) return 'All chapters need a title.';
                if (!chapter.lessons || chapter.lessons.length === 0) return `Add at least one lesson to chapter "${chapter.chapterTitle || 'Untitled'}".`;
                for (const lesson of chapter.lessons) {
                    if (!lesson.lessonTitle.trim()) return 'Lesson title is required.';
                    if (!lesson.videoUrl.trim()) return `Lesson "${lesson.lessonTitle || 'Untitled'}" needs a video link or uploaded file.`;
                }
            }
        }
        return '';
    };

    const buildUpdatePayload = () => ({
        courseTitle: form.courseTitle.trim(),
        subtitle: form.subtitle.trim(),
        descriptionText: form.descriptionText.trim(),
        technicalCategory: form.technicalCategory,
        level: form.level,
        language: form.language,
        estimatedDurationHours: Number(form.estimatedDurationHours || 1),
        price: Number(form.price || 0),
        thumbnailUrl: form.thumbnailUrl,
        previewVideoUrl: form.previewVideoUrl,
        learningObjectives: form.learningObjectives.split('\n').map(item => item.trim()).filter(Boolean),
        requirements: form.requirements.split('\n').map(item => item.trim()).filter(Boolean),
        tags: form.tags.split(',').map(item => item.trim()).filter(Boolean),
        curriculumTree: curriculum.map(chapter => ({
            chapterTitle: chapter.chapterTitle.trim(),
            lessons: (chapter.lessons || []).map(lesson => ({
                lessonTitle: lesson.lessonTitle.trim(),
                videoUrl: lesson.videoUrl.trim(),
                notesPdfUrl: lesson.notesPdfUrl ? lesson.notesPdfUrl.trim() : '',
                resourceLink: lesson.resourceLink ? lesson.resourceLink.trim() : '',
                isFreePreview: lesson.isFreePreview
            }))
        }))
    });

    const createDraftCourse = async () => {
        const payload = {
            courseTitle: form.courseTitle.trim(),
            subtitle: form.subtitle.trim(),
            descriptionText: form.descriptionText.trim(),
            technicalCategory: form.technicalCategory,
            estimatedDurationHours: Number(form.estimatedDurationHours || 1),
            price: Number(form.price || 0),
            thumbnailUrl: form.thumbnailUrl
        };

        const res = await courseService.create(payload);
        setCourseId(res.data.data._id);
        return res.data.data._id;
    };

    const saveCourseDraft = async () => {
        setErrorMessage('');
        setStatusMessage('');
        setIsSaving(true);
        try {
            let id = courseId;
            if (!id) {
                id = await createDraftCourse();
            }
            await courseService.update(id, buildUpdatePayload());
            setStatusMessage('Draft saved successfully.');
            return id;
        } catch (err) {
            console.error(err);
            setErrorMessage(err.response?.data?.message || 'Unable to save draft.');
            throw err;
        } finally {
            setIsSaving(false);
        }
    };

    const handleNext = async () => {
        const validationError = validateStep();
        if (validationError) {
            setErrorMessage(validationError);
            return;
        }

        setErrorMessage('');
        if (activeStep === 0 && !courseId) {
            setIsSaving(true);
            try {
                await createDraftCourse();
            } catch (err) {
                setErrorMessage(err.response?.data?.message || 'Failed to create draft course.');
                return;
            } finally {
                setIsSaving(false);
            }
        }

        if (activeStep > 0) {
            try {
                await saveCourseDraft();
            } catch (err) {
                return;
            }
        }

        setActiveStep(prev => Math.min(prev + 1, STEPS.length - 1));
    };

    const handleBack = () => {
        setErrorMessage('');
        setStatusMessage('');
        setActiveStep(prev => Math.max(prev - 1, 0));
    };

    const handleSubmitCourse = async () => {
        const validationError = validateStep();
        if (validationError) {
            setErrorMessage(validationError);
            return;
        }

        setErrorMessage('');
        setStatusMessage('');
        setIsSaving(true);
        try {
            let id = courseId;
            if (!id) {
                id = await createDraftCourse();
            }
            await courseService.update(id, buildUpdatePayload());
            await courseService.submitForReview(id);
            setStatusMessage('Course submitted for review. Your course will be evaluated by the admin team.');
            navigate('/instructor/dashboard');
        } catch (err) {
            console.error(err);
            setErrorMessage(err.response?.data?.message || 'Unable to submit course for review.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleUploadFile = async (event, field) => {
        const file = event.target.files?.[0];
        if (!file) return;
        setErrorMessage('');
        setStatusMessage('');
        setIsUploading(true);
        try {
            const formData = new FormData();
            formData.append('file', file);
            const res = await uploadService.uploadFile(formData);
            const uploadedUrl = res.data?.data?.url || res.data?.data;
            if (!uploadedUrl) throw new Error('Upload returned no URL.');
            setForm(prev => ({ ...prev, [field]: uploadedUrl }));
            setStatusMessage('File uploaded successfully.');
        } catch (err) {
            console.error(err);
            setErrorMessage(err.response?.data?.message || 'File upload failed.');
        } finally {
            setIsUploading(false);
        }
    };

    const addChapter = () => {
        if (!chapterTitle.trim()) {
            setErrorMessage('Enter a chapter title before adding.');
            return;
        }
        setErrorMessage('');
        setCurriculum(prev => [...prev, { chapterTitle: chapterTitle.trim(), lessons: [] }]);
        setChapterTitle('');
    };

    const removeChapter = (index) => {
        setCurriculum(prev => prev.filter((_, idx) => idx !== index));
    };

    const updateChapterTitle = (index, value) => {
        setCurriculum(prev => prev.map((chapter, idx) => idx === index ? { ...chapter, chapterTitle: value } : chapter));
    };

    const addLesson = (chapterIndex) => {
        if (!lessonDraft.lessonTitle.trim()) {
            setErrorMessage('Lesson title is required.');
            return;
        }
        if (!lessonDraft.videoUrl.trim()) {
            setErrorMessage('Provide a video URL or upload before adding the lesson.');
            return;
        }
        setErrorMessage('');
        setCurriculum(prev => prev.map((chapter, idx) => {
            if (idx !== chapterIndex) return chapter;
            return {
                ...chapter,
                lessons: [...chapter.lessons, { ...lessonDraft }]
            };
        }));
        setLessonDraft(emptyLesson);
    };

    const removeLesson = (chapterIndex, lessonIndex) => {
        setCurriculum(prev => prev.map((chapter, idx) => {
            if (idx !== chapterIndex) return chapter;
            return { ...chapter, lessons: chapter.lessons.filter((_, idx2) => idx2 !== lessonIndex) };
        }));
    };

    const renderStepContent = () => {
        switch (activeStep) {
            case 0:
                return (
                    <div style={styles.grid}>
                        <div style={styles.formGroup}>
                            <label style={styles.label}>Course Title</label>
                            <input style={styles.input} value={form.courseTitle} onChange={e => setForm(prev => ({ ...prev, courseTitle: e.target.value }))} placeholder="Modern Web Development with React" />
                        </div>
                        <div style={styles.formGroup}>
                            <label style={styles.label}>Subtitle</label>
                            <input style={styles.input} value={form.subtitle} onChange={e => setForm(prev => ({ ...prev, subtitle: e.target.value }))} placeholder="Build real-world apps and launch your first project" />
                        </div>
                        <div style={{ ...styles.formGroup, gridColumn: '1 / -1' }}>
                            <label style={styles.label}>Course Description</label>
                            <textarea style={{ ...styles.input, minHeight: 140 }} value={form.descriptionText} onChange={e => setForm(prev => ({ ...prev, descriptionText: e.target.value }))} placeholder="Write a compelling course overview that explains what students will learn." />
                        </div>
                        <div style={styles.formGroup}>
                            <label style={styles.label}>Category</label>
                            <select style={styles.input} value={form.technicalCategory} onChange={e => setForm(prev => ({ ...prev, technicalCategory: e.target.value }))}>
                                {['Web Coding', 'Creative Media', 'Robotics Hardware', 'Network Engineering', 'Mobile Development', 'Data Science', 'Cybersecurity', 'Cloud Computing', 'Artificial Intelligence', 'Business & Management', 'Databases', 'DevOps & CI/CD', 'Graphic Design'].map(option => <option key={option} value={option}>{option}</option>)}
                            </select>
                        </div>
                        <div style={styles.formGroup}>
                            <label style={styles.label}>Level</label>
                            <select style={styles.input} value={form.level} onChange={e => setForm(prev => ({ ...prev, level: e.target.value }))}>
                                {['Beginner', 'Intermediate', 'Advanced'].map(option => <option key={option} value={option}>{option}</option>)}
                            </select>
                        </div>
                        <div style={styles.formGroup}>
                            <label style={styles.label}>Language</label>
                            <select style={styles.input} value={form.language} onChange={e => setForm(prev => ({ ...prev, language: e.target.value }))}>
                                {['English', 'Amharic', 'Afaan Oromo'].map(option => <option key={option} value={option}>{option}</option>)}
                            </select>
                        </div>
                        <div style={styles.formGroup}>
                            <label style={styles.label}>Duration (hours)</label>
                            <input type="number" min="1" style={styles.input} value={form.estimatedDurationHours} onChange={e => setForm(prev => ({ ...prev, estimatedDurationHours: e.target.value }))} />
                        </div>
                        <div style={styles.formGroup}>
                            <label style={styles.label}>Price (ETB)</label>
                            <input type="number" min="0" style={styles.input} value={form.price} onChange={e => setForm(prev => ({ ...prev, price: e.target.value }))} />
                        </div>
                        <div style={{ ...styles.formGroup, gridColumn: '1 / -1' }}>
                            <label style={styles.label}>Learning Objectives</label>
                            <textarea style={{ ...styles.input, minHeight: 120 }} value={form.learningObjectives} onChange={e => setForm(prev => ({ ...prev, learningObjectives: e.target.value }))} placeholder="One objective per line." />
                        </div>
                        <div style={{ ...styles.formGroup, gridColumn: '1 / -1' }}>
                            <label style={styles.label}>Prerequisites</label>
                            <textarea style={{ ...styles.input, minHeight: 120 }} value={form.requirements} onChange={e => setForm(prev => ({ ...prev, requirements: e.target.value }))} placeholder="One prerequisite per line." />
                        </div>
                        <div style={{ ...styles.formGroup, gridColumn: '1 / -1' }}>
                            <label style={styles.label}>Tags</label>
                            <input style={styles.input} value={form.tags} onChange={e => setForm(prev => ({ ...prev, tags: e.target.value }))} placeholder="react, javascript, web development" />
                        </div>
                    </div>
                );
            case 1:
                return (
                    <div style={styles.panel}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, marginBottom: 18 }}>
                            <div>
                                <h3 style={{ ...styles.sectionTitle, marginBottom: 10 }}>Curriculum Builder</h3>
                                <p style={styles.sectionSubtitle}>Group lessons into chapters and add course lessons one by one.</p>
                            </div>
                            <button type="button" onClick={addChapter} style={styles.secondaryBtn}><Plus size={16} /> Add Chapter</button>
                        </div>
                        <div style={{ ...styles.formGroup, marginBottom: 16 }}>
                            <label style={styles.label}>New Chapter Title</label>
                            <input style={styles.input} value={chapterTitle} onChange={e => setChapterTitle(e.target.value)} placeholder="e.g. Introduction to React" />
                        </div>
                        {curriculum.length === 0 ? (
                            <div style={styles.emptyBox}>Start by creating your first chapter. Add lessons after the chapter is created.</div>
                        ) : curriculum.map((chapter, chapterIndex) => (
                            <div key={chapterIndex} style={styles.chapterCard}>
                                <div style={styles.chapterHeader}>
                                    <div>
                                        <input style={{ ...styles.input, fontSize: 16, fontWeight: 700 }} value={chapter.chapterTitle} onChange={e => updateChapterTitle(chapterIndex, e.target.value)} />
                                        <p style={styles.sectionSubtitle}>{chapter.lessons.length} lesson{chapter.lessons.length === 1 ? '' : 's'}</p>
                                    </div>
                                    <button type="button" onClick={() => removeChapter(chapterIndex)} style={styles.textBtn}>Remove</button>
                                </div>
                                <div style={styles.lessonForm}>
                                    <div style={styles.formGroup}>
                                        <label style={styles.label}>Lesson Title</label>
                                        <input style={styles.input} value={lessonDraft.lessonTitle} onChange={e => setLessonDraft(prev => ({ ...prev, lessonTitle: e.target.value }))} placeholder="e.g. Component Hierarchy" />
                                    </div>
                                    <div style={styles.formGroup}>
                                        <label style={styles.label}>Lesson Video URL</label>
                                        <input style={styles.input} value={lessonDraft.videoUrl} onChange={e => setLessonDraft(prev => ({ ...prev, videoUrl: e.target.value }))} placeholder="Paste YouTube link or video URL" />
                                    </div>
                                    <div style={styles.formGroup}>
                                        <label style={styles.label}>PDF Notes / Google Drive URL</label>
                                        <input style={styles.input} value={lessonDraft.notesPdfUrl || lessonDraft.resourceLink || ''} onChange={e => setLessonDraft(prev => ({ ...prev, notesPdfUrl: e.target.value, resourceLink: e.target.value }))} placeholder="Paste Google Drive link or PDF URL" />
                                    </div>
                                    <div style={styles.formGroup}>
                                        <label style={styles.label}>Free Preview</label>
                                        <select style={styles.input} value={lessonDraft.isFreePreview} onChange={e => setLessonDraft(prev => ({ ...prev, isFreePreview: e.target.value === 'true' }))}>
                                            <option value="false">No</option>
                                            <option value="true">Yes</option>
                                        </select>
                                    </div>
                                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                                        <button type="button" onClick={() => addLesson(chapterIndex)} style={styles.primaryBtn}><Plus size={16} /> Add Lesson</button>
                                        <label style={styles.uploadLabel}>
                                            <UploadCloud size={16} /> Upload Video
                                            <input type="file" accept="video/*" onChange={e => handleLessonUpload(e)} style={{ display: 'none' }} />
                                        </label>
                                        <label style={{ ...styles.uploadLabel, background: 'rgba(16,185,129,0.15)', color: '#10b981', borderColor: 'rgba(16,185,129,0.3)' }}>
                                            <FileText size={16} /> Upload PDF Notes
                                            <input type="file" accept="application/pdf" onChange={e => handlePdfUpload(e)} style={{ display: 'none' }} />
                                        </label>
                                    </div>
                                </div>
                                {chapter.lessons.length > 0 && chapter.lessons.map((lesson, lessonIndex) => (
                                    <div key={lessonIndex} style={styles.lessonRow}>
                                        <div>
                                            <div style={{ color: colors.text, fontWeight: 700 }}>{lesson.lessonTitle}</div>
                                            <div style={{ color: colors.textMuted, fontSize: 12 }}>🎬 {lesson.videoUrl}</div>
                                            {(lesson.notesPdfUrl || lesson.resourceLink) && (
                                                <div style={{ color: '#10b981', fontSize: 12, marginTop: 2 }}>📄 PDF/Drive: {lesson.notesPdfUrl || lesson.resourceLink}</div>
                                            )}
                                        </div>
                                        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                                            <span style={styles.badge}>{lesson.isFreePreview ? 'Free Preview' : 'Locked'}</span>
                                            <button type="button" onClick={() => removeLesson(chapterIndex, lessonIndex)} style={styles.textBtn}><Trash2 size={14} /> Remove</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>
                );
            case 2:
                return (
                    <div style={styles.grid}>
                        <div style={styles.card}>
                            <div style={styles.cardHeader}><ImagePlus size={20} /> <span style={styles.cardTitle}>Course Thumbnail</span></div>
                            <p style={styles.cardDescription}>Upload a visual cover image that represents your course.</p>
                            <input type="file" accept="image/*" onChange={e => handleUploadFile(e, 'thumbnailUrl')} style={styles.fileInput} />
                            {form.thumbnailUrl && <div style={styles.preview}>Thumbnail uploaded successfully.</div>}
                        </div>
                        <div style={styles.card}>
                            <div style={styles.cardHeader}><PlayCircle size={20} /> <span style={styles.cardTitle}>Preview Video</span></div>
                            <p style={styles.cardDescription}>Upload or paste the preview video URL you want learners to see first.</p>
                            <input type="file" accept="video/*" onChange={e => handleUploadFile(e, 'previewVideoUrl')} style={styles.fileInput} />
                            <div style={{ marginTop: 12 }}>
                                <input style={styles.input} value={form.previewVideoUrl} onChange={e => setForm(prev => ({ ...prev, previewVideoUrl: e.target.value }))} placeholder="Paste a hosted preview video URL" />
                            </div>
                            {form.previewVideoUrl && <div style={styles.preview}>Preview video is ready.</div>}
                        </div>
                        <div style={{ ...styles.card, gridColumn: '1 / -1' }}>
                            <div style={styles.cardHeader}><FileText size={20} /> <span style={styles.cardTitle}>Course Resources</span></div>
                            <p style={styles.cardDescription}>Add optional resource links such as slides, code repos, or external reading material.</p>
                            <textarea style={{ ...styles.input, minHeight: 120 }} value={form.resources || ''} onChange={e => setForm(prev => ({ ...prev, resources: e.target.value }))} placeholder="Include URLs or notes for learners." />
                        </div>
                    </div>
                );
            case 3:
                return (
                    <div style={styles.reviewGrid}>
                        <div style={styles.panelCard}>
                            <h3 style={styles.sectionTitle}>Course Summary</h3>
                            <p style={styles.sectionSubtitle}>Review your course information before submitting.</p>
                            <div style={styles.summaryRow}><strong>Title</strong><span>{form.courseTitle || 'Not set'}</span></div>
                            <div style={styles.summaryRow}><strong>Category</strong><span>{form.technicalCategory}</span></div>
                            <div style={styles.summaryRow}><strong>Level</strong><span>{form.level}</span></div>
                            <div style={styles.summaryRow}><strong>Language</strong><span>{form.language}</span></div>
                            <div style={styles.summaryRow}><strong>Duration</strong><span>{form.estimatedDurationHours} hour(s)</span></div>
                            <div style={styles.summaryRow}><strong>Price</strong><span>{form.price > 0 ? `${form.price} ETB` : 'Free'}</span></div>
                            <div style={styles.summaryRow}><strong>Thumbnail</strong><span>{form.thumbnailUrl ? 'Uploaded' : 'Not uploaded'}</span></div>
                            <div style={styles.summaryRow}><strong>Preview Video</strong><span>{form.previewVideoUrl ? 'Provided' : 'Not provided'}</span></div>
                        </div>
                        <div style={styles.panelCard}>
                            <h3 style={styles.sectionTitle}>Curriculum</h3>
                            {curriculum.length === 0 ? <p style={styles.emptyText}>No curriculum added yet.</p> : curriculum.map((chapter, idx) => (
                                <div key={idx} style={styles.chapterSummary}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <strong>{chapter.chapterTitle || `Chapter ${idx + 1}`}</strong>
                                        <span style={styles.badge}>{chapter.lessons.length} lesson{chapter.lessons.length === 1 ? '' : 's'}</span>
                                    </div>
                                    {chapter.lessons.map((lesson, lessonIndex) => (
                                        <div key={lessonIndex} style={styles.lessonSummary}>
                                            <span>{lesson.lessonTitle}</span>
                                            <span style={{ color: colors.textMuted, fontSize: 12 }}>{lesson.isFreePreview ? 'Free preview' : 'Locked'}</span>
                                        </div>
                                    ))}
                                </div>
                            ))}
                        </div>
                    </div>
                );
            default:
                return null;
        }
    };

    const handleLessonUpload = async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;
        setErrorMessage('');
        setStatusMessage('');
        setIsUploading(true);
        try {
            const formData = new FormData();
            formData.append('file', file);
            const res = await uploadService.uploadFile(formData);
            const url = res.data?.data?.url || res.data?.data;
            if (!url) throw new Error('Upload returned no URL.');
            setLessonDraft(prev => ({ ...prev, videoUrl: url }));
            setStatusMessage('Lesson video uploaded.');
        } catch (err) {
            console.error(err);
            setErrorMessage(err.response?.data?.message || 'Lesson upload failed.');
        } finally {
            setIsUploading(false);
        }
    };

    const handlePdfUpload = async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;
        setErrorMessage('');
        setStatusMessage('');
        setIsUploading(true);
        try {
            const formData = new FormData();
            formData.append('file', file);
            const res = await uploadService.uploadFile(formData);
            const url = res.data?.data?.url || res.data?.data;
            if (!url) throw new Error('Upload returned no URL.');
            setLessonDraft(prev => ({ ...prev, notesPdfUrl: url, resourceLink: url }));
            setStatusMessage('Lesson PDF notes uploaded.');
        } catch (err) {
            console.error(err);
            setErrorMessage(err.response?.data?.message || 'PDF upload failed.');
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div style={{ padding: 28, color: colors.text, background: colors.bg, minHeight: '100vh' }}>
            <div style={{ maxWidth: 1120, margin: '0 auto' }}>
                <header style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
                    <div>
                        <p style={{ color: colors.primary, fontWeight: 700, marginBottom: 8 }}>Instructor Course Builder</p>
                        <h1 style={{ margin: 0, fontSize: 32 }}>Create & launch your course</h1>
                        <p style={{ color: colors.textMuted, marginTop: 6 }}>A guided course creation wizard to build a professional learning experience and submit for review.</p>
                    </div>
                    <button onClick={() => navigate('/instructor/dashboard')} style={{ ...styles.secondaryBtn, minWidth: 140 }}>Back to Dashboard</button>
                </header>

                <div style={styles.stepper}>
                    {stepStatus.map((step, index) => (
                        <div key={step.title} style={styles.stepItem}>
                            <div style={{ ...styles.stepCircle, background: index === activeStep ? 'linear-gradient(135deg,#2563eb,#7c3aed)' : index < activeStep ? '#10b981' : colors.bgCard, color: index <= activeStep ? '#fff' : colors.textMuted }}>
                                {index < activeStep ? <CheckCircle size={16} /> : index + 1}
                            </div>
                            <div>
                                <p style={{ margin: 0, fontWeight: 700, color: index === activeStep ? colors.text : colors.textMuted }}>{step.title}</p>
                                <p style={{ margin: '4px 0 0', color: colors.textMuted, fontSize: 12 }}>{step.description}</p>
                            </div>
                        </div>
                    ))}
                </div>

                <div style={{ background: colors.bgCard, border: `1px solid ${colors.border}`, borderRadius: 20, padding: 24, marginTop: 20 }}>
                    {renderStepContent()}
                </div>

                {(statusMessage || errorMessage) && (
                    <div style={{ marginTop: 16, padding: '14px 16px', borderRadius: 12, background: errorMessage ? 'rgba(239,68,68,0.12)' : 'rgba(16,185,129,0.12)', color: errorMessage ? '#dc2626' : '#10b981', border: `1px solid ${errorMessage ? 'rgba(220,38,38,0.25)' : 'rgba(16,185,129,0.3)'}` }}>
                        {errorMessage || statusMessage}
                    </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 24, flexWrap: 'wrap', gap: 12 }}>
                    <button type="button" onClick={handleBack} disabled={activeStep === 0 || isSaving} style={{ ...styles.secondaryBtn, opacity: activeStep === 0 || isSaving ? 0.5 : 1, cursor: activeStep === 0 ? 'not-allowed' : 'pointer' }}><ArrowLeft size={16} /> Back</button>
                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                        <button type="button" onClick={saveCourseDraft} disabled={isSaving || isUploading} style={styles.secondaryBtn}>Save Draft</button>
                        {activeStep < STEPS.length - 1 ? (
                            <button type="button" onClick={handleNext} disabled={isSaving || isUploading} style={styles.primaryBtn}>Next Step <ArrowRight size={16} /></button>
                        ) : (
                            <button type="button" onClick={handleSubmitCourse} disabled={isSaving || isUploading} style={styles.primaryBtn}>{isSaving ? 'Submitting...' : 'Submit for Review'}</button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

const styles = {
    stepper: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: 14
    },
    stepItem: {
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: 16,
        borderRadius: 16,
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.08)'
    },
    stepCircle: {
        width: 36,
        height: 36,
        borderRadius: '50%',
        display: 'grid',
        placeItems: 'center',
        fontWeight: 700,
        fontSize: 14
    },
    grid: {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 18
    },
    formGroup: {
        display: 'flex',
        flexDirection: 'column',
        gap: 8
    },
    label: {
        color: '#94a3b8',
        fontSize: 13,
        fontWeight: 600
    },
    input: {
        background: 'rgba(15,23,42,0.85)',
        border: '1px solid rgba(71,85,105,0.3)',
        borderRadius: 12,
        color: '#fff',
        padding: '12px 14px',
        fontSize: 14,
        outline: 'none'
    },
    panel: {
        display: 'flex',
        flexDirection: 'column',
        gap: 18
    },
    sectionTitle: {
        fontSize: 18,
        color: '#fff',
        margin: 0
    },
    sectionSubtitle: {
        color: '#94a3b8',
        fontSize: 13,
        margin: 0,
        lineHeight: 1.6
    },
    secondaryBtn: {
        background: 'rgba(59,130,246,0.12)',
        border: '1px solid rgba(59,130,246,0.35)',
        color: '#bfdbfe',
        borderRadius: 12,
        padding: '12px 18px',
        cursor: 'pointer',
        fontWeight: 700,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8
    },
    primaryBtn: {
        background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
        border: 'none',
        borderRadius: 12,
        color: '#fff',
        padding: '12px 18px',
        cursor: 'pointer',
        fontWeight: 700,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8
    },
    emptyBox: {
        padding: 24,
        borderRadius: 16,
        background: 'rgba(15,23,42,0.65)',
        border: '1px dashed rgba(71,85,105,0.5)',
        color: '#94a3b8'
    },
    chapterCard: {
        background: 'rgba(15,23,42,0.75)',
        border: '1px solid rgba(71,85,105,0.4)',
        borderRadius: 18,
        padding: 18,
        display: 'grid',
        gap: 16
    },
    chapterHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: 12
    },
    lessonForm: {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 14
    },
    lessonRow: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 12,
        padding: '12px 14px',
        borderRadius: 14,
        background: 'rgba(15,23,42,0.9)',
        border: '1px solid rgba(71,85,105,0.35)'
    },
    badge: {
        padding: '4px 10px',
        borderRadius: 999,
        background: 'rgba(37,99,235,0.12)',
        color: '#bfdbfe',
        fontSize: 12,
        fontWeight: 700
    },
    reviewGrid: {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 18
    },
    panelCard: {
        padding: 20,
        borderRadius: 20,
        border: '1px solid rgba(71,85,105,0.35)',
        background: 'rgba(15,23,42,0.75)'
    },
    summaryRow: {
        display: 'flex',
        justifyContent: 'space-between',
        gap: 16,
        marginBottom: 12,
        color: '#e2e8f0'
    },
    chapterSummary: {
        padding: 14,
        borderRadius: 14,
        border: '1px solid rgba(71,85,105,0.35)',
        marginBottom: 12,
        background: 'rgba(15,23,42,0.85)'
    },
    lessonSummary: {
        display: 'flex',
        justifyContent: 'space-between',
        marginTop: 10,
        color: '#cbd5e1'
    },
    fileInput: {
        border: 'none',
        color: '#fff',
        marginTop: 8
    },
    preview: {
        marginTop: 10,
        color: '#d1fae5',
        fontSize: 13
    },
    uploadLabel: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        padding: '12px 16px',
        borderRadius: 12,
        background: 'rgba(59,130,246,0.12)',
        border: '1px solid rgba(59,130,246,0.3)',
        color: '#bfdbfe',
        cursor: 'pointer'
    },
    card: {
        background: 'rgba(15,23,42,0.75)',
        border: '1px solid rgba(71,85,105,0.4)',
        borderRadius: 18,
        padding: 20,
        display: 'grid',
        gap: 16
    },
    cardHeader: {
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        color: '#fff',
        fontWeight: 700
    },
    cardTitle: {
        fontSize: 15
    },
    cardDescription: {
        color: '#94a3b8',
        fontSize: 13,
        margin: 0
    },
    textBtn: {
        border: 'none',
        background: 'transparent',
        color: '#60a5fa',
        fontWeight: 700,
        cursor: 'pointer'
    }
};
