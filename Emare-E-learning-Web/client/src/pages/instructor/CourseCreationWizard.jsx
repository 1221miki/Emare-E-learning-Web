/**
 * CourseCreationWizard.jsx
 *
 * Each chapter has its own completely isolated state:
 *   - draft lesson form (lessonTitle, videoUrl, notesPdfUrl, isFreePreview)
 *   - video upload progress
 *   - PDF upload progress
 *   - hidden file input refs
 *
 * No state is ever shared between chapters.
 * Adding a new chapter always starts fresh with empty draft data.
 */
import React, { useMemo, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import { courseService, uploadService } from '../../services/api.jsx';
import {
    ArrowLeft, ArrowRight, CheckCircle, FileText,
    ImagePlus, PlayCircle, Plus, Trash2, Video
} from 'lucide-react';

// ── Constants ─────────────────────────────────────────────────────────────────

const STEPS = [
    { title: 'Course Info',       description: 'Define the course title, category, price and overview.' },
    { title: 'Curriculum',        description: 'Build chapters and lessons for your course.' },
    { title: 'Media & Resources', description: 'Upload thumbnail, preview video and supporting assets.' },
    { title: 'Review & Publish',  description: 'Confirm course details and submit for review.' }
];

const CATEGORIES = [
    'Web Coding','Creative Media','Robotics Hardware','Network Engineering',
    'Mobile Development','Data Science','Cybersecurity','Cloud Computing',
    'Artificial Intelligence','Business & Management','Databases','DevOps & CI/CD','Graphic Design'
];

const initialForm = {
    courseTitle: '', subtitle: '', descriptionText: '',
    technicalCategory: 'Web Coding', level: 'Beginner', language: 'English',
    estimatedDurationHours: 1, price: 0,
    learningObjectives: '', requirements: '', tags: '', resources: '',
    thumbnailUrl: '', previewVideoUrl: ''
};

/** Generate a simple unique ID for chapters/lessons */
const uid = () => `_${Math.random().toString(36).slice(2, 10)}`;

/** Create a fresh empty lesson (always a new object — never reuse) */
const newLesson = () => ({
    _id: uid(),
    lessonTitle: '',
    videoUrl: '',
    notesPdfUrl: '',
    resourceLink: '',
    isFreePreview: false,
    quizRequired: false,
    assignmentRequired: false,
    linkedQuizId: '',
    linkedAssignmentId: ''
});

/** Create a fresh empty chapter (always a new object — never reuse) */
const newChapter = (title = '') => ({
    _id: uid(),
    chapterTitle: title,
    lessons: []
});

/** Per-chapter draft state (completely isolated per chapter ID) */
const newDraft = () => ({
    lessonTitle: '',
    videoUrl: '',
    notesPdfUrl: '',
    isFreePreview: false,
    quizRequired: false,
    assignmentRequired: false,
    linkedQuizId: '',
    linkedAssignmentId: '',
    videoProgress: null,   // null | 'uploading' | 'done' | 'error'
    pdfProgress: null,
    uploading: false
});

// ── ChapterCard ────────────────────────────────────────────────────────────────
// A self-contained component so each chapter manages its own file input refs
// and upload state locally — completely independent of every other chapter.

function ChapterCard({ chapter, chapterIndex, totalChapters, onUpdate, onRemove, colors, styles, isSavingOrOtherUploading }) {
    const [draft, setDraft] = useState(newDraft);
    const videoRef = useRef(null);
    const pdfRef   = useRef(null);

    // ── Lesson draft field helpers ───────────────────────────────────────────

    const setDraftField = (field, value) =>
        setDraft(prev => ({ ...prev, [field]: value }));

    // ── Video upload (Bunny Stream) ──────────────────────────────────────────

    const handleVideoUpload = useCallback(async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (videoRef.current) videoRef.current.value = '';

        setDraft(prev => ({ ...prev, videoProgress: 'uploading', uploading: true, videoUrl: '' }));
        try {
            const fd = new FormData();
            fd.append('file', file);
            fd.append('targetType', 'video');
            const res = await uploadService.uploadFile(fd);
            const embedUrl = res.data?.data?.embedUrl || res.data?.data?.url;
            if (!embedUrl) throw new Error('No embed URL returned from Bunny.');
            setDraft(prev => ({ ...prev, videoUrl: embedUrl, videoProgress: 'done', uploading: false }));
        } catch (err) {
            console.error('[ChapterCard] video upload error:', err);
            setDraft(prev => ({ ...prev, videoProgress: 'error', uploading: false }));
        }
    }, []);

    // ── PDF upload (Bunny Storage) ───────────────────────────────────────────

    const handlePdfUpload = useCallback(async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (pdfRef.current) pdfRef.current.value = '';

        setDraft(prev => ({ ...prev, pdfProgress: 'uploading', uploading: true, notesPdfUrl: '' }));
        try {
            const fd = new FormData();
            fd.append('file', file);
            fd.append('targetType', 'pdf');
            const res = await uploadService.uploadFile(fd);
            const url = res.data?.data?.url;
            if (!url) throw new Error('No URL returned from Bunny Storage.');
            setDraft(prev => ({ ...prev, notesPdfUrl: url, pdfProgress: 'done', uploading: false }));
        } catch (err) {
            console.error('[ChapterCard] PDF upload error:', err);
            setDraft(prev => ({ ...prev, pdfProgress: 'error', uploading: false }));
        }
    }, []);

    // ── Add lesson to this chapter ───────────────────────────────────────────

    const handleAddLesson = () => {
        if (!draft.lessonTitle.trim()) {
            alert('Lesson title is required.');
            return;
        }
        if (!draft.videoUrl.trim()) {
            alert('Please upload a video or paste a Bunny embed URL before adding the lesson.');
            return;
        }
        const lesson = {
            _id: uid(),
            lessonTitle: draft.lessonTitle.trim(),
            videoUrl:    draft.videoUrl.trim(),
            notesPdfUrl: draft.notesPdfUrl.trim(),
            resourceLink: draft.notesPdfUrl.trim(),
            isFreePreview: draft.isFreePreview,
            quizRequired: draft.quizRequired,
            assignmentRequired: draft.assignmentRequired,
            linkedQuizId: draft.linkedQuizId.trim() || '',
            linkedAssignmentId: draft.linkedAssignmentId.trim() || ''
        };
        onUpdate({ ...chapter, lessons: [...chapter.lessons, lesson] });
        // Reset ONLY this chapter's draft — do not touch any other chapter
        setDraft(newDraft());
    };

    // ── Remove a saved lesson ────────────────────────────────────────────────

    const handleRemoveLesson = (lessonId) => {
        onUpdate({ ...chapter, lessons: chapter.lessons.filter(l => l._id !== lessonId) });
    };

    const uploading = draft.uploading || isSavingOrOtherUploading;

    // ── Render ───────────────────────────────────────────────────────────────

    return (
        <div style={styles.chapterCard}>
            {/* Chapter header */}
            <div style={styles.chapterHeader}>
                <div style={{ flex: 1 }}>
                    <input
                        style={{ ...styles.input, fontSize: 15, fontWeight: 700, marginBottom: 4 }}
                        value={chapter.chapterTitle}
                        onChange={e => onUpdate({ ...chapter, chapterTitle: e.target.value })}
                        placeholder="Chapter title"
                    />
                    <p style={styles.sectionSubtitle}>
                        {chapter.lessons.length} lesson{chapter.lessons.length !== 1 ? 's' : ''}
                    </p>
                </div>
                <button type="button" onClick={() => onRemove(chapter._id)} style={{ ...styles.textBtn, color: '#ef4444' }}>
                    Remove
                </button>
            </div>

            {/* ── Saved lessons list ── */}
            {chapter.lessons.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
                    {chapter.lessons.map((lesson, li) => (
                        <div key={lesson._id} style={styles.lessonRow}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ color: colors.text, fontWeight: 700, fontSize: 14 }}>
                                    {li + 1}. {lesson.lessonTitle}
                                </div>
                                {lesson.videoUrl && (
                                    <div style={{ color: '#60a5fa', fontSize: 11, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        ▶ {lesson.videoUrl}
                                    </div>
                                )}
                                {lesson.notesPdfUrl && (
                                    <div style={{ color: '#10b981', fontSize: 11, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        📄 {lesson.notesPdfUrl}
                                    </div>
                                )}
                                {/* Completion requirement badges */}
                                <div style={{ display: 'flex', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                                    <span style={{
                                        padding: '2px 8px', borderRadius: 999, fontSize: 10, fontWeight: 700,
                                        background: lesson.quizRequired ? 'rgba(245,158,11,0.18)' : 'rgba(71,85,105,0.18)',
                                        color: lesson.quizRequired ? '#f59e0b' : '#64748b',
                                        border: `1px solid ${lesson.quizRequired ? 'rgba(245,158,11,0.35)' : 'rgba(71,85,105,0.25)'}`
                                    }}>
                                        Quiz: {lesson.quizRequired ? 'ON' : 'OFF'}
                                    </span>
                                    <span style={{
                                        padding: '2px 8px', borderRadius: 999, fontSize: 10, fontWeight: 700,
                                        background: lesson.assignmentRequired ? 'rgba(139,92,246,0.18)' : 'rgba(71,85,105,0.18)',
                                        color: lesson.assignmentRequired ? '#a78bfa' : '#64748b',
                                        border: `1px solid ${lesson.assignmentRequired ? 'rgba(139,92,246,0.35)' : 'rgba(71,85,105,0.25)'}`
                                    }}>
                                        Assignment: {lesson.assignmentRequired ? 'ON' : 'OFF'}
                                    </span>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: 8, flexShrink: 0, alignItems: 'center' }}>
                                <span style={styles.badge}>
                                    {lesson.isFreePreview ? 'Free' : 'Locked'}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => handleRemoveLesson(lesson._id)}
                                    style={{ ...styles.textBtn, color: '#ef4444', fontSize: 12 }}
                                >
                                    <Trash2 size={13} /> Remove
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* ── New lesson form (completely isolated to this chapter) ── */}
            <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 14, border: '1px dashed rgba(71,85,105,0.5)', padding: 16, display: 'grid', gap: 14 }}>
                <p style={{ ...styles.label, margin: 0, fontSize: 12, color: '#60a5fa', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    + New Lesson for this chapter
                </p>

                {/* Row 1: title + free preview */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, alignItems: 'end' }}>
                    <div style={styles.formGroup}>
                        <label style={styles.label}>Lesson Title *</label>
                        <input
                            style={styles.input}
                            value={draft.lessonTitle}
                            onChange={e => setDraftField('lessonTitle', e.target.value)}
                            placeholder="e.g. What is Data Science?"
                        />
                    </div>
                    <div style={styles.formGroup}>
                        <label style={styles.label}>Free Preview</label>
                        <select
                            style={styles.input}
                            value={draft.isFreePreview}
                            onChange={e => setDraftField('isFreePreview', e.target.value === 'true')}
                        >
                            <option value="false">No</option>
                            <option value="true">Yes</option>
                        </select>
                    </div>
                </div>

                {/* Row 1b: Completion requirements — Quiz + Assignment toggles */}
                <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 10, border: '1px solid rgba(71,85,105,0.35)', padding: '12px 14px' }}>
                    <p style={{ margin: '0 0 10px', fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        Completion Requirements
                    </p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        {/* Quiz toggle */}
                        <div style={styles.formGroup}>
                            <label style={styles.label}>Quiz Requirement</label>
                            <select
                                style={{
                                    ...styles.input,
                                    color: draft.quizRequired ? '#f59e0b' : undefined,
                                    borderColor: draft.quizRequired ? 'rgba(245,158,11,0.5)' : undefined
                                }}
                                value={draft.quizRequired}
                                onChange={e => setDraftField('quizRequired', e.target.value === 'true')}
                            >
                                <option value="false">OFF — Not required</option>
                                <option value="true">ON — Must complete quiz</option>
                            </select>
                        </div>
                        {/* Assignment toggle */}
                        <div style={styles.formGroup}>
                            <label style={styles.label}>Assignment Requirement</label>
                            <select
                                style={{
                                    ...styles.input,
                                    color: draft.assignmentRequired ? '#a78bfa' : undefined,
                                    borderColor: draft.assignmentRequired ? 'rgba(139,92,246,0.5)' : undefined
                                }}
                                value={draft.assignmentRequired}
                                onChange={e => setDraftField('assignmentRequired', e.target.value === 'true')}
                            >
                                <option value="false">OFF — Not required</option>
                                <option value="true">ON — Must submit assignment</option>
                            </select>
                        </div>
                        {/* Linked Quiz ID (shown only when ON) */}
                        {draft.quizRequired && (
                            <div style={styles.formGroup}>
                                <label style={styles.label}>Linked Quiz ID (optional)</label>
                                <input
                                    style={{ ...styles.input, borderColor: 'rgba(245,158,11,0.4)' }}
                                    value={draft.linkedQuizId}
                                    onChange={e => setDraftField('linkedQuizId', e.target.value)}
                                    placeholder="Paste Quiz _id from Quiz Manager"
                                />
                                <p style={{ margin: '3px 0 0', fontSize: 10, color: '#94a3b8' }}>
                                    Leave blank to block completion until you link a quiz later.
                                </p>
                            </div>
                        )}
                        {/* Linked Assignment ID (shown only when ON) */}
                        {draft.assignmentRequired && (
                            <div style={styles.formGroup}>
                                <label style={styles.label}>Linked Assignment ID (optional)</label>
                                <input
                                    style={{ ...styles.input, borderColor: 'rgba(139,92,246,0.4)' }}
                                    value={draft.linkedAssignmentId}
                                    onChange={e => setDraftField('linkedAssignmentId', e.target.value)}
                                    placeholder="Paste Assignment _id from Assignment Builder"
                                />
                                <p style={{ margin: '3px 0 0', fontSize: 10, color: '#94a3b8' }}>
                                    Leave blank to block completion until you link an assignment later.
                                </p>
                            </div>
                        )}
                    </div>
                    {(draft.quizRequired || draft.assignmentRequired) && (
                        <p style={{ margin: '10px 0 0', fontSize: 11, color: '#f59e0b', fontWeight: 600 }}>
                            ⚠ Students must complete {[draft.quizRequired && 'the quiz', draft.assignmentRequired && 'the assignment'].filter(Boolean).join(' and ')} before this lesson can be marked complete.
                        </p>
                    )}
                </div>

                {/* Row 2: video field + status */}
                <div style={styles.formGroup}>
                    <label style={styles.label}>Lesson Video</label>
                    <input
                        style={{
                            ...styles.input,
                            color: draft.videoUrl.includes('mediadelivery') ? '#10b981' : undefined
                        }}
                        value={draft.videoUrl}
                        onChange={e => { setDraftField('videoUrl', e.target.value); setDraftField('videoProgress', null); }}
                        placeholder="Upload a video below, or paste Bunny embed URL"
                        readOnly={draft.videoProgress === 'uploading'}
                    />
                    {draft.videoProgress === 'uploading' && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 5, color: '#60a5fa', fontSize: 12, fontWeight: 600 }}>
                            <span style={{ display: 'inline-block', width: 11, height: 11, border: '2px solid rgba(96,165,250,0.3)', borderTopColor: '#60a5fa', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                            Uploading to Bunny Stream… (may take a few minutes for large files)
                        </div>
                    )}
                    {draft.videoProgress === 'done' && <div style={{ marginTop: 5, color: '#10b981', fontSize: 12, fontWeight: 600 }}>✓ Video uploaded to Bunny Stream</div>}
                    {draft.videoProgress === 'error' && <div style={{ marginTop: 5, color: '#ef4444', fontSize: 12, fontWeight: 600 }}>✗ Video upload failed — try again</div>}
                </div>

                {/* Row 3: PDF field + status */}
                <div style={styles.formGroup}>
                    <label style={styles.label}>PDF Notes (optional)</label>
                    <input
                        style={{
                            ...styles.input,
                            color: draft.notesPdfUrl.includes('b-cdn') ? '#10b981' : undefined
                        }}
                        value={draft.notesPdfUrl}
                        onChange={e => { setDraftField('notesPdfUrl', e.target.value); setDraftField('pdfProgress', null); }}
                        placeholder="Upload a PDF below, or paste Bunny CDN URL"
                        readOnly={draft.pdfProgress === 'uploading'}
                    />
                    {draft.pdfProgress === 'uploading' && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 5, color: '#10b981', fontSize: 12, fontWeight: 600 }}>
                            <span style={{ display: 'inline-block', width: 11, height: 11, border: '2px solid rgba(16,185,129,0.3)', borderTopColor: '#10b981', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                            Uploading PDF to Bunny Storage…
                        </div>
                    )}
                    {draft.pdfProgress === 'done' && <div style={{ marginTop: 5, color: '#10b981', fontSize: 12, fontWeight: 600 }}>✓ PDF uploaded to Bunny Storage</div>}
                    {draft.pdfProgress === 'error' && <div style={{ marginTop: 5, color: '#ef4444', fontSize: 12, fontWeight: 600 }}>✗ PDF upload failed — try again</div>}
                </div>

                {/* Row 4: action buttons */}
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                    {/* Add lesson */}
                    <button
                        type="button"
                        onClick={handleAddLesson}
                        disabled={uploading}
                        style={{ ...styles.primaryBtn, opacity: uploading ? 0.6 : 1, cursor: uploading ? 'not-allowed' : 'pointer' }}
                    >
                        <Plus size={15} /> Add Lesson
                    </button>

                    {/* Hidden video input — unique to THIS chapter */}
                    <input
                        ref={videoRef}
                        type="file"
                        accept="video/mp4,video/mov,video/m4v,video/mkv,video/webm,video/*"
                        onChange={handleVideoUpload}
                        style={{ display: 'none' }}
                    />
                    <button
                        type="button"
                        onClick={() => videoRef.current?.click()}
                        disabled={uploading}
                        style={{
                            display: 'inline-flex', alignItems: 'center', gap: 7,
                            padding: '10px 14px', borderRadius: 10, fontWeight: 600, fontSize: 13,
                            cursor: uploading ? 'not-allowed' : 'pointer',
                            opacity: uploading ? 0.6 : 1,
                            background: draft.videoProgress === 'done' ? 'rgba(16,185,129,0.15)' : 'rgba(59,130,246,0.12)',
                            color: draft.videoProgress === 'done' ? '#10b981' : '#60a5fa',
                            border: `1px solid ${draft.videoProgress === 'done' ? 'rgba(16,185,129,0.3)' : 'rgba(59,130,246,0.3)'}`
                        }}
                    >
                        <Video size={14} />
                        {draft.videoProgress === 'uploading' ? 'Uploading…'
                            : draft.videoProgress === 'done' ? 'Video ✓'
                            : 'Upload Video → Bunny'}
                    </button>

                    {/* Hidden PDF input — unique to THIS chapter */}
                    <input
                        ref={pdfRef}
                        type="file"
                        accept="application/pdf,.pdf"
                        onChange={handlePdfUpload}
                        style={{ display: 'none' }}
                    />
                    <button
                        type="button"
                        onClick={() => pdfRef.current?.click()}
                        disabled={uploading}
                        style={{
                            display: 'inline-flex', alignItems: 'center', gap: 7,
                            padding: '10px 14px', borderRadius: 10, fontWeight: 600, fontSize: 13,
                            cursor: uploading ? 'not-allowed' : 'pointer',
                            opacity: uploading ? 0.6 : 1,
                            background: draft.pdfProgress === 'done' ? 'rgba(16,185,129,0.2)' : 'rgba(16,185,129,0.1)',
                            color: '#10b981',
                            border: `1px solid ${draft.pdfProgress === 'done' ? 'rgba(16,185,129,0.4)' : 'rgba(16,185,129,0.25)'}`
                        }}
                    >
                        <FileText size={14} />
                        {draft.pdfProgress === 'uploading' ? 'Uploading…'
                            : draft.pdfProgress === 'done' ? 'PDF ✓'
                            : 'Upload PDF → Bunny'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── Main Wizard ───────────────────────────────────────────────────────────────

export default function CourseCreationWizard() {
    const { colors } = useTheme();
    const navigate   = useNavigate();

    const [activeStep, setActiveStep] = useState(0);
    const [form, setForm]             = useState(initialForm);
    const [curriculum, setCurriculum] = useState([]);  // array of chapter objects
    const [chapterTitle, setChapterTitle] = useState('');
    const [courseId, setCourseId]     = useState(null);
    const [statusMessage, setStatusMessage] = useState('');
    const [errorMessage, setErrorMessage]   = useState('');
    const [isSaving, setIsSaving]     = useState(false);
    const [isUploading, setIsUploading] = useState(false); // for thumbnail/preview uploads

    const stepStatus = useMemo(() =>
        STEPS.map((s, i) => ({ ...s, completed: i < activeStep })),
    [activeStep]);

    // ── Curriculum helpers ───────────────────────────────────────────────────

    const addChapter = () => {
        if (!chapterTitle.trim()) {
            setErrorMessage('Enter a chapter title before adding.');
            return;
        }
        setErrorMessage('');
        // Always create a brand-new chapter object — never copy or mutate an existing one
        setCurriculum(prev => [...prev, newChapter(chapterTitle.trim())]);
        setChapterTitle('');
    };

    const handleKeyDownChapter = (e) => {
        if (e.key === 'Enter') { e.preventDefault(); addChapter(); }
    };

    const updateChapter = useCallback((updated) => {
        setCurriculum(prev => prev.map(ch => ch._id === updated._id ? updated : ch));
    }, []);

    const removeChapter = useCallback((chapterId) => {
        setCurriculum(prev => prev.filter(ch => ch._id !== chapterId));
    }, []);

    // ── Validation ───────────────────────────────────────────────────────────

    const validateStep = () => {
        if (activeStep === 0) {
            if (!form.courseTitle.trim()) return 'Course title is required.';
            if (!form.descriptionText.trim() || form.descriptionText.trim().length < 20)
                return 'Course description must be at least 20 characters.';
            if (!form.estimatedDurationHours || Number(form.estimatedDurationHours) < 1)
                return 'Estimated duration must be at least 1 hour.';
        }
        if (activeStep === 1) {
            if (curriculum.length === 0) return 'Add at least one chapter to your curriculum.';
            for (const ch of curriculum) {
                if (!ch.chapterTitle.trim()) return 'All chapters need a title.';
                if (!ch.lessons || ch.lessons.length === 0)
                    return `Chapter "${ch.chapterTitle || 'Untitled'}" needs at least one lesson.`;
                for (const l of ch.lessons) {
                    if (!l.lessonTitle.trim()) return 'Lesson title is required.';
                    if (!l.videoUrl.trim())
                        return `Lesson "${l.lessonTitle || 'Untitled'}" needs a video.`;
                }
            }
        }
        return '';
    };

    // ── API payload ──────────────────────────────────────────────────────────

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
        learningObjectives: form.learningObjectives.split('\n').map(s => s.trim()).filter(Boolean),
        requirements: form.requirements.split('\n').map(s => s.trim()).filter(Boolean),
        tags: form.tags.split(',').map(s => s.trim()).filter(Boolean),
        curriculumTree: curriculum.map(ch => ({
            chapterTitle: ch.chapterTitle.trim(),
            lessons: (ch.lessons || []).map(l => ({
                lessonTitle:        l.lessonTitle.trim(),
                videoUrl:           l.videoUrl.trim(),
                notesPdfUrl:        l.notesPdfUrl   ? l.notesPdfUrl.trim()   : '',
                resourceLink:       l.resourceLink  ? l.resourceLink.trim()  : '',
                isFreePreview:      l.isFreePreview,
                // Completion requirement fields — safe for existing lessons (defaults to false/null)
                quizRequired:       !!l.quizRequired,
                assignmentRequired: !!l.assignmentRequired,
                linkedQuizId:       l.linkedQuizId       && l.linkedQuizId.trim()       ? l.linkedQuizId.trim()       : null,
                linkedAssignmentId: l.linkedAssignmentId && l.linkedAssignmentId.trim() ? l.linkedAssignmentId.trim() : null
            }))
        }))
    });

    // ── Course persistence ───────────────────────────────────────────────────

    const createDraftCourse = async () => {
        const res = await courseService.create({
            courseTitle: form.courseTitle.trim(),
            subtitle: form.subtitle.trim(),
            descriptionText: form.descriptionText.trim(),
            technicalCategory: form.technicalCategory,
            estimatedDurationHours: Number(form.estimatedDurationHours || 1),
            price: Number(form.price || 0),
            thumbnailUrl: form.thumbnailUrl
        });
        setCourseId(res.data.data._id);
        return res.data.data._id;
    };

    const saveCourseDraft = async () => {
        setErrorMessage('');
        setStatusMessage('');
        setIsSaving(true);
        try {
            let id = courseId;
            if (!id) id = await createDraftCourse();
            await courseService.update(id, buildUpdatePayload());
            setStatusMessage('Draft saved successfully.');
            return id;
        } catch (err) {
            setErrorMessage(err.response?.data?.message || 'Unable to save draft.');
            throw err;
        } finally {
            setIsSaving(false);
        }
    };

    const handleNext = async () => {
        const err = validateStep();
        if (err) { setErrorMessage(err); return; }
        setErrorMessage('');
        if (activeStep === 0 && !courseId) {
            setIsSaving(true);
            try { await createDraftCourse(); }
            catch (e) { setErrorMessage(e.response?.data?.message || 'Failed to create draft.'); return; }
            finally { setIsSaving(false); }
        }
        if (activeStep > 0) {
            try { await saveCourseDraft(); }
            catch { return; }
        }
        setActiveStep(p => Math.min(p + 1, STEPS.length - 1));
    };

    const handleBack = () => {
        setErrorMessage('');
        setStatusMessage('');
        setActiveStep(p => Math.max(p - 1, 0));
    };

    const handleSubmitCourse = async () => {
        const err = validateStep();
        if (err) { setErrorMessage(err); return; }
        setErrorMessage('');
        setStatusMessage('');
        setIsSaving(true);
        try {
            let id = courseId;
            if (!id) id = await createDraftCourse();
            await courseService.update(id, buildUpdatePayload());
            await courseService.submitForReview(id);
            setStatusMessage('Course submitted for review.');
            navigate('/instructor/dashboard');
        } catch (e) {
            setErrorMessage(e.response?.data?.message || 'Unable to submit course for review.');
        } finally {
            setIsSaving(false);
        }
    };

    // ── Thumbnail / preview video upload (Step 3 — course-level) ────────────

    const handleUploadFile = async (event, field) => {
        const file = event.target.files?.[0];
        if (!file) return;
        setErrorMessage('');
        setStatusMessage('');
        setIsUploading(true);
        try {
            const fd = new FormData();
            fd.append('file', file);
            if (field === 'thumbnailUrl') {
                fd.append('targetType', 'thumbnail');
                fd.append('folder', 'emare_elms/course_thumbnails');
            }
            const res = await uploadService.uploadFile(fd);
            const url = res.data?.data?.url || res.data?.data;
            if (!url) throw new Error('Upload returned no URL.');
            setForm(prev => ({ ...prev, [field]: url }));
            setStatusMessage('File uploaded successfully.');
        } catch (err) {
            setErrorMessage(err.response?.data?.message || 'File upload failed.');
        } finally {
            setIsUploading(false);
        }
    };

    // ── Step rendering ───────────────────────────────────────────────────────

    const renderStepContent = () => {
        switch (activeStep) {

            // ── Step 0: Course Info ──────────────────────────────────────────
            case 0:
                return (
                    <div style={styles.grid}>
                        <div style={styles.formGroup}>
                            <label style={styles.label}>Course Title *</label>
                            <input style={styles.input} value={form.courseTitle} onChange={e => setForm(p => ({ ...p, courseTitle: e.target.value }))} placeholder="Modern Web Development with React" />
                        </div>
                        <div style={styles.formGroup}>
                            <label style={styles.label}>Subtitle</label>
                            <input style={styles.input} value={form.subtitle} onChange={e => setForm(p => ({ ...p, subtitle: e.target.value }))} placeholder="Build real-world apps and launch your first project" />
                        </div>
                        <div style={{ ...styles.formGroup, gridColumn: '1 / -1' }}>
                            <label style={styles.label}>Course Description *</label>
                            <textarea style={{ ...styles.input, minHeight: 140 }} value={form.descriptionText} onChange={e => setForm(p => ({ ...p, descriptionText: e.target.value }))} placeholder="Write a compelling course overview that explains what students will learn." />
                        </div>
                        <div style={styles.formGroup}>
                            <label style={styles.label}>Category</label>
                            <select style={styles.input} value={form.technicalCategory} onChange={e => setForm(p => ({ ...p, technicalCategory: e.target.value }))}>
                                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                        <div style={styles.formGroup}>
                            <label style={styles.label}>Level</label>
                            <select style={styles.input} value={form.level} onChange={e => setForm(p => ({ ...p, level: e.target.value }))}>
                                {['Beginner','Intermediate','Advanced'].map(o => <option key={o} value={o}>{o}</option>)}
                            </select>
                        </div>
                        <div style={styles.formGroup}>
                            <label style={styles.label}>Language</label>
                            <select style={styles.input} value={form.language} onChange={e => setForm(p => ({ ...p, language: e.target.value }))}>
                                {['English','Amharic','Afaan Oromo'].map(o => <option key={o} value={o}>{o}</option>)}
                            </select>
                        </div>
                        <div style={styles.formGroup}>
                            <label style={styles.label}>Duration (hours)</label>
                            <input type="number" min="1" style={styles.input} value={form.estimatedDurationHours} onChange={e => setForm(p => ({ ...p, estimatedDurationHours: e.target.value }))} />
                        </div>
                        <div style={styles.formGroup}>
                            <label style={styles.label}>Price (ETB)</label>
                            <input type="number" min="0" style={styles.input} value={form.price} onChange={e => setForm(p => ({ ...p, price: e.target.value }))} />
                        </div>
                        <div style={{ ...styles.formGroup, gridColumn: '1 / -1' }}>
                            <label style={styles.label}>Learning Objectives</label>
                            <textarea style={{ ...styles.input, minHeight: 100 }} value={form.learningObjectives} onChange={e => setForm(p => ({ ...p, learningObjectives: e.target.value }))} placeholder="One objective per line." />
                        </div>
                        <div style={{ ...styles.formGroup, gridColumn: '1 / -1' }}>
                            <label style={styles.label}>Prerequisites</label>
                            <textarea style={{ ...styles.input, minHeight: 100 }} value={form.requirements} onChange={e => setForm(p => ({ ...p, requirements: e.target.value }))} placeholder="One prerequisite per line." />
                        </div>
                        <div style={{ ...styles.formGroup, gridColumn: '1 / -1' }}>
                            <label style={styles.label}>Tags</label>
                            <input style={styles.input} value={form.tags} onChange={e => setForm(p => ({ ...p, tags: e.target.value }))} placeholder="react, javascript, web development" />
                        </div>
                    </div>
                );

            // ── Step 1: Curriculum ───────────────────────────────────────────
            case 1:
                return (
                    <div style={styles.panel}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 18 }}>
                            <div>
                                <h3 style={{ ...styles.sectionTitle, marginBottom: 6 }}>Curriculum Builder</h3>
                                <p style={styles.sectionSubtitle}>Each chapter is fully independent. Add chapters, then add lessons inside each chapter.</p>
                            </div>
                            <button type="button" onClick={addChapter} style={styles.secondaryBtn}>
                                <Plus size={15} /> Add Chapter
                            </button>
                        </div>

                        {/* New chapter title input */}
                        <div style={{ ...styles.formGroup, marginBottom: 20 }}>
                            <label style={styles.label}>New Chapter Title</label>
                            <div style={{ display: 'flex', gap: 10 }}>
                                <input
                                    style={{ ...styles.input, flex: 1 }}
                                    value={chapterTitle}
                                    onChange={e => setChapterTitle(e.target.value)}
                                    onKeyDown={handleKeyDownChapter}
                                    placeholder="e.g. Introduction to React"
                                />
                                <button type="button" onClick={addChapter} style={styles.primaryBtn}>
                                    <Plus size={15} /> Add
                                </button>
                            </div>
                            <p style={{ ...styles.sectionSubtitle, marginTop: 4, fontSize: 11 }}>Press Enter or click Add to create a new chapter.</p>
                        </div>

                        {curriculum.length === 0 ? (
                            <div style={styles.emptyBox}>
                                Start by typing a chapter title above and clicking Add Chapter.<br />
                                Each chapter gets its own set of lessons, videos and PDFs.
                            </div>
                        ) : (
                            curriculum.map((chapter, idx) => (
                                <ChapterCard
                                    key={chapter._id}
                                    chapter={chapter}
                                    chapterIndex={idx}
                                    totalChapters={curriculum.length}
                                    onUpdate={updateChapter}
                                    onRemove={removeChapter}
                                    colors={colors}
                                    styles={styles}
                                    isSavingOrOtherUploading={isSaving || isUploading}
                                />
                            ))
                        )}
                    </div>
                );

            // ── Step 2: Media & Resources ────────────────────────────────────
            case 2:
                return (
                    <div style={styles.grid}>
                        <div style={styles.card}>
                            <div style={styles.cardHeader}><ImagePlus size={20} /> <span style={styles.cardTitle}>Course Thumbnail</span></div>
                            <p style={styles.cardDescription}>Upload a visual cover image that represents your course.</p>
                            <input type="file" accept="image/*" onChange={e => handleUploadFile(e, 'thumbnailUrl')} style={styles.fileInput} />
                            {form.thumbnailUrl && <div style={styles.preview}>✓ Thumbnail uploaded.</div>}
                        </div>
                        <div style={styles.card}>
                            <div style={styles.cardHeader}><PlayCircle size={20} /> <span style={styles.cardTitle}>Preview Video</span></div>
                            <p style={styles.cardDescription}>Paste the Bunny Stream embed URL for your course preview video.</p>
                            <input style={styles.input} value={form.previewVideoUrl} onChange={e => setForm(p => ({ ...p, previewVideoUrl: e.target.value }))} placeholder="https://iframe.mediadelivery.net/embed/LIBRARY_ID/VIDEO_GUID" />
                            {form.previewVideoUrl && <div style={styles.preview}>✓ Preview video URL saved.</div>}
                        </div>
                        <div style={{ ...styles.card, gridColumn: '1 / -1' }}>
                            <div style={styles.cardHeader}><FileText size={20} /> <span style={styles.cardTitle}>Course Resources</span></div>
                            <p style={styles.cardDescription}>Optional resource links (slides, repos, reading material).</p>
                            <textarea style={{ ...styles.input, minHeight: 100 }} value={form.resources || ''} onChange={e => setForm(p => ({ ...p, resources: e.target.value }))} placeholder="Include URLs or notes for learners." />
                        </div>
                    </div>
                );

            // ── Step 3: Review ───────────────────────────────────────────────
            case 3:
                return (
                    <div style={styles.reviewGrid}>
                        <div style={styles.panelCard}>
                            <h3 style={styles.sectionTitle}>Course Summary</h3>
                            <p style={styles.sectionSubtitle}>Review before submitting for review.</p>
                            {[
                                ['Title',    form.courseTitle || 'Not set'],
                                ['Category', form.technicalCategory],
                                ['Level',    form.level],
                                ['Language', form.language],
                                ['Duration', `${form.estimatedDurationHours} hour(s)`],
                                ['Price',    form.price > 0 ? `${form.price} ETB` : 'Free'],
                                ['Thumbnail', form.thumbnailUrl ? '✓ Uploaded' : '✗ Not uploaded'],
                                ['Preview Video', form.previewVideoUrl ? '✓ Provided' : 'Not provided']
                            ].map(([k, v]) => (
                                <div key={k} style={styles.summaryRow}><strong>{k}</strong><span>{v}</span></div>
                            ))}
                        </div>
                        <div style={styles.panelCard}>
                            <h3 style={styles.sectionTitle}>Curriculum ({curriculum.length} chapter{curriculum.length !== 1 ? 's' : ''})</h3>
                            {curriculum.length === 0
                                ? <p style={styles.emptyText}>No curriculum added yet.</p>
                                : curriculum.map((ch, i) => (
                                    <div key={ch._id} style={styles.chapterSummary}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <strong>{ch.chapterTitle || `Chapter ${i + 1}`}</strong>
                                            <span style={styles.badge}>{ch.lessons.length} lesson{ch.lessons.length !== 1 ? 's' : ''}</span>
                                        </div>
                                        {ch.lessons.map(l => (
                                            <div key={l._id} style={styles.lessonSummary}>
                                                <span>{l.lessonTitle}</span>
                                                <span style={{ color: colors.textMuted, fontSize: 12, display: 'flex', gap: 4, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                                                    {l.videoUrl ? '▶ Video' : '⚠ No video'} &nbsp;
                                                    {l.notesPdfUrl ? '📄 PDF' : ''} &nbsp;
                                                    {l.isFreePreview ? '🆓' : '🔒'} &nbsp;
                                                    {l.quizRequired && <span style={{ color: '#f59e0b' }}>Quiz: ON</span>}
                                                    {l.assignmentRequired && <span style={{ color: '#a78bfa' }}>Assignment: ON</span>}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                ))
                            }
                        </div>
                    </div>
                );

            default:
                return null;
        }
    };

    // ── Render ───────────────────────────────────────────────────────────────

    return (
        <div style={{ padding: 28, color: colors.text, background: colors.bg, minHeight: '100vh' }}>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            <div style={{ maxWidth: 1120, margin: '0 auto' }}>
                <header style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
                    <div>
                        <p style={{ color: colors.primary, fontWeight: 700, marginBottom: 8 }}>Instructor Course Builder</p>
                        <h1 style={{ margin: 0, fontSize: 32 }}>Create & launch your course</h1>
                        <p style={{ color: colors.textMuted, marginTop: 6 }}>A guided wizard to build a professional learning experience.</p>
                    </div>
                    <button onClick={() => navigate('/instructor/dashboard')} style={{ ...styles.secondaryBtn, minWidth: 140 }}>
                        Back to Dashboard
                    </button>
                </header>

                {/* Step indicators */}
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

                {/* Step content */}
                <div style={{ background: colors.bgCard, border: `1px solid ${colors.border}`, borderRadius: 20, padding: 24, marginTop: 20 }}>
                    {renderStepContent()}
                </div>

                {/* Messages */}
                {(statusMessage || errorMessage) && (
                    <div style={{ marginTop: 16, padding: '14px 16px', borderRadius: 12, background: errorMessage ? 'rgba(239,68,68,0.12)' : 'rgba(16,185,129,0.12)', color: errorMessage ? '#dc2626' : '#10b981', border: `1px solid ${errorMessage ? 'rgba(220,38,38,0.25)' : 'rgba(16,185,129,0.3)'}` }}>
                        {errorMessage || statusMessage}
                    </div>
                )}

                {/* Navigation */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 24, flexWrap: 'wrap', gap: 12 }}>
                    <button type="button" onClick={handleBack} disabled={activeStep === 0 || isSaving} style={{ ...styles.secondaryBtn, opacity: activeStep === 0 || isSaving ? 0.5 : 1, cursor: activeStep === 0 ? 'not-allowed' : 'pointer' }}>
                        <ArrowLeft size={16} /> Back
                    </button>
                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                        <button type="button" onClick={saveCourseDraft} disabled={isSaving || isUploading} style={styles.secondaryBtn}>
                            {isSaving ? 'Saving…' : 'Save Draft'}
                        </button>
                        {activeStep < STEPS.length - 1 ? (
                            <button type="button" onClick={handleNext} disabled={isSaving || isUploading} style={styles.primaryBtn}>
                                Next Step <ArrowRight size={16} />
                            </button>
                        ) : (
                            <button type="button" onClick={handleSubmitCourse} disabled={isSaving || isUploading} style={styles.primaryBtn}>
                                {isSaving ? 'Submitting…' : 'Submit for Review'}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = {
    stepper: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 },
    stepItem: { display: 'flex', alignItems: 'center', gap: 12, padding: 16, borderRadius: 16, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' },
    stepCircle: { width: 36, height: 36, borderRadius: '50%', display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: 14, flexShrink: 0 },
    grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 },
    formGroup: { display: 'flex', flexDirection: 'column', gap: 6 },
    label: { color: '#94a3b8', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' },
    input: { background: 'rgba(15,23,42,0.85)', border: '1px solid rgba(71,85,105,0.3)', borderRadius: 10, color: '#f1f5f9', padding: '11px 13px', fontSize: 14, outline: 'none', width: '100%', boxSizing: 'border-box' },
    panel: { display: 'flex', flexDirection: 'column', gap: 18 },
    sectionTitle: { fontSize: 17, color: '#f1f5f9', margin: 0, fontWeight: 700 },
    sectionSubtitle: { color: '#94a3b8', fontSize: 13, margin: 0, lineHeight: 1.6 },
    secondaryBtn: { background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.35)', color: '#bfdbfe', borderRadius: 12, padding: '11px 16px', cursor: 'pointer', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 13 },
    primaryBtn: { background: 'linear-gradient(135deg, #2563eb, #7c3aed)', border: 'none', borderRadius: 12, color: '#fff', padding: '11px 16px', cursor: 'pointer', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 13 },
    emptyBox: { padding: 24, borderRadius: 16, background: 'rgba(15,23,42,0.65)', border: '1px dashed rgba(71,85,105,0.5)', color: '#94a3b8', lineHeight: 1.7 },
    chapterCard: { background: 'rgba(15,23,42,0.75)', border: '1px solid rgba(71,85,105,0.4)', borderRadius: 18, padding: 18, display: 'flex', flexDirection: 'column', gap: 14 },
    chapterHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
    lessonRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 12, background: 'rgba(15,23,42,0.9)', border: '1px solid rgba(71,85,105,0.3)' },
    badge: { padding: '3px 10px', borderRadius: 999, background: 'rgba(37,99,235,0.15)', color: '#93c5fd', fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' },
    reviewGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 },
    panelCard: { padding: 20, borderRadius: 18, border: '1px solid rgba(71,85,105,0.35)', background: 'rgba(15,23,42,0.75)' },
    summaryRow: { display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 10, color: '#e2e8f0', fontSize: 14 },
    chapterSummary: { padding: 12, borderRadius: 12, border: '1px solid rgba(71,85,105,0.3)', marginBottom: 10, background: 'rgba(15,23,42,0.85)' },
    lessonSummary: { display: 'flex', justifyContent: 'space-between', marginTop: 8, color: '#cbd5e1', fontSize: 13 },
    fileInput: { border: 'none', color: '#fff', marginTop: 8 },
    preview: { marginTop: 8, color: '#d1fae5', fontSize: 13, fontWeight: 600 },
    textBtn: { border: 'none', background: 'transparent', color: '#60a5fa', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 13 },
    card: { background: 'rgba(15,23,42,0.75)', border: '1px solid rgba(71,85,105,0.4)', borderRadius: 18, padding: 20, display: 'flex', flexDirection: 'column', gap: 12 },
    cardHeader: { display: 'flex', alignItems: 'center', gap: 10, color: '#f1f5f9', fontWeight: 700 },
    cardTitle: { fontSize: 15 },
    cardDescription: { color: '#94a3b8', fontSize: 13, margin: 0 },
    emptyText: { color: '#94a3b8', fontSize: 14 },
    uploadLabel: { display: 'inline-flex', alignItems: 'center', gap: 8, padding: '11px 14px', borderRadius: 12, background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.3)', color: '#bfdbfe', cursor: 'pointer', fontSize: 13, fontWeight: 600 }
};
