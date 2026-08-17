import React from 'react';
import { assignmentService, uploadService } from '../../../services/api';
import { ClipboardList, Paperclip, CalendarDays, Target, CheckCircle2, AlertCircle, Clock } from 'lucide-react';

export default function AssignmentsTab(dash) {
    const { assignmentsList, mySubmissions, setMySubmissions, assignmentSubmitText, setAssignmentSubmitText, assignmentFile, setAssignmentFile, submittingAssignmentId, setSubmittingAssignmentId, assignmentMsg, setAssignmentMsg, triggerAssistantPrompt } = dash;

    const handleAssignmentSubmit = async (assignmentId, courseId) => {
        setAssignmentMsg('');
        if (!assignmentSubmitText && !assignmentFile) {
            setAssignmentMsg('Please add a submission text or file.');
            return;
        }
        try {
            setSubmittingAssignmentId(assignmentId);
            let fileUrl = null;
            if (assignmentFile) {
                const fd = new FormData();
                fd.append('file', assignmentFile);
                const uploadRes = await uploadService.uploadFile(fd);
                fileUrl = uploadRes.data.data.url;
            }
            await assignmentService.submit(assignmentId, {
                submissionText: assignmentSubmitText,
                fileUrl,
                courseRef: courseId
            });
            setAssignmentMsg('Assignment submitted successfully!');
            setAssignmentSubmitText('');
            setAssignmentFile(null);
            try {
                const subRes = await assignmentService.getMySubmissions();
                setMySubmissions(subRes.data.data || []);
            } catch { /* refresh failure is non-fatal */ }
        } catch(err) {
            setAssignmentMsg((err.response?.data?.message || 'Submission failed. Please try again.'));
        } finally {
            setSubmittingAssignmentId(null);
        }
    };

    const submittedIds = mySubmissions.map(s => s.assignmentRef || s.assignment?._id);
    const card = 'rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm p-5';

    return (
        <div className="w-full">
            {/* Assignments & Submissions header */}
            <div className="mb-6">
                <h2 className="flex items-center gap-2 text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                    <ClipboardList size={20} className="text-blue-600 dark:text-blue-400" aria-hidden="true" /> Assignments &amp; Submissions
                </h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">View all your assignments from enrolled courses and submit your work</p>
            </div>

            {assignmentMsg && (
                <div className={`mb-5 flex items-center gap-2 rounded-lg border px-4 py-3 text-sm font-semibold ${assignmentMsg.includes('submitted') ? 'border-emerald-600/40 bg-emerald-600/10 text-emerald-600 dark:text-emerald-400' : 'border-red-600/40 bg-red-600/10 text-red-600 dark:text-red-400'}`}>
                    {assignmentMsg.includes('submitted')
                        ? <CheckCircle2 size={16} aria-hidden="true" />
                        : <AlertCircle size={16} aria-hidden="true" />
                    }
                    {assignmentMsg}
                </div>
            )}

            {assignmentsList.length === 0 ? (
                <div className="mx-auto max-w-2xl">
                    <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center shadow-sm dark:border-slate-700 dark:bg-slate-900">
                        <ClipboardList size={48} className="mx-auto text-slate-400" aria-hidden="true" />
                        <h3 className="mt-4 text-lg font-extrabold text-slate-900 dark:text-white">No assignments yet</h3>
                        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-500 dark:text-slate-400">
                            Your enrolled courses do not currently have assignment tasks posted. Keep learning, and the system will notify you when new work is available.
                        </p>
                        <button type="button" onClick={() => triggerAssistantPrompt('Generate a practice assignment')} className="mt-6 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-blue-700">
                            Generate a practice assignment
                        </button>
                    </div>
                </div>
            ) : (
                <div className="space-y-5">
                    {assignmentsList.map((asgn) => {
                        const isSubmitted = submittedIds.includes(asgn._id);
                        const isOverdue = asgn.dueDate && new Date(asgn.dueDate) < new Date();
                        return (
                            <div key={asgn._id} className={card}>
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div className="min-w-0 flex-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <h3 className="text-base font-bold text-slate-900 dark:text-white">{asgn.title || 'Assignment Task'}</h3>
                                            {isSubmitted && <span className="inline-flex items-center gap-1 rounded-md bg-emerald-600/15 px-2 py-0.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400"><CheckCircle2 size={12} aria-hidden="true" /> SUBMITTED</span>}
                                            {!isSubmitted && isOverdue && <span className="inline-flex items-center gap-1 rounded-md bg-red-600/15 px-2 py-0.5 text-[11px] font-bold text-red-600 dark:text-red-400"><AlertCircle size={12} aria-hidden="true" /> OVERDUE</span>}
                                            {!isSubmitted && !isOverdue && <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/15 px-2 py-0.5 text-[11px] font-bold text-amber-600 dark:text-amber-400"><Clock size={12} aria-hidden="true" /> PENDING</span>}
                                        </div>
                                        {asgn.description || asgn.instructions ? (
                                            <p className="mt-1.5 text-sm leading-relaxed text-slate-500 dark:text-slate-400">{asgn.description || asgn.instructions}</p>
                                        ) : null}
                                        <div className="mt-2 flex flex-wrap gap-4 text-xs text-slate-500 dark:text-slate-400">
                                            {asgn.dueDate && (
                                                <span className="inline-flex items-center gap-1">
                                                    <CalendarDays size={13} aria-hidden="true" /> Due: <strong className={isOverdue ? 'text-red-600 dark:text-red-400' : 'text-slate-900 dark:text-white'}>{new Date(asgn.dueDate).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</strong>
                                                </span>
                                            )}
                                            {asgn.totalMarks && (
                                                <span className="inline-flex items-center gap-1">
                                                    <Target size={13} aria-hidden="true" /> Max Marks: <strong className="text-slate-900 dark:text-white">{asgn.totalMarks}</strong>
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {!isSubmitted && (
                                    <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-800/50">
                                        <h4 className="mb-3 text-sm font-bold text-slate-900 dark:text-white">Submit Your Work</h4>
                                        <textarea
                                            rows="4"
                                            placeholder="Describe your solution, paste GitHub links, or summarize your approach..."
                                            value={submittingAssignmentId === asgn._id ? assignmentSubmitText : ''}
                                            onChange={e => { setSubmittingAssignmentId(asgn._id); setAssignmentSubmitText(e.target.value); }}
                                            className="mb-3 w-full resize-y rounded-lg border border-slate-300 bg-white p-3 text-sm text-slate-900 outline-none transition-colors focus:border-blue-600 focus:ring-2 focus:ring-blue-600 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                                        />
                                        <div className="flex flex-wrap items-center gap-3">
                                            <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-dashed border-blue-600 bg-blue-600/10 px-3.5 py-2 text-[13px] font-semibold text-blue-600 transition-colors hover:bg-blue-600/20 dark:text-blue-400">
                                                <Paperclip size={15} aria-hidden="true" /> {assignmentFile?.name || 'Attach File (PDF/ZIP/DOC)'}
                                                <input type="file" className="hidden" onChange={e => setAssignmentFile(e.target.files[0])} />
                                            </label>
                                            <button
                                                onClick={() => handleAssignmentSubmit(asgn._id, asgn.courseRef)}
                                                disabled={submittingAssignmentId === asgn._id && !assignmentSubmitText}
                                                className="rounded-lg bg-blue-600 px-5 py-2 text-[13px] font-bold text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
                                            >
                                                {submittingAssignmentId === asgn._id ? 'Submitting...' : 'Submit Assignment'}
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {isSubmitted && (() => {
                                    const mySubmission = mySubmissions.find(s => (s.assignmentRef || s.assignment?._id) === asgn._id);
                                    return mySubmission ? (
                                        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-600/30 bg-emerald-600/10 p-4">
                                            <span className="inline-flex items-center gap-1.5 text-[13px] font-bold text-emerald-600 dark:text-emerald-400">
                                                <CheckCircle2 size={14} aria-hidden="true" /> Submitted on {new Date(mySubmission.createdAt || Date.now()).toLocaleDateString()}
                                            </span>
                                            <div className="flex flex-wrap items-center gap-4">
                                                {mySubmission.grade && <span className="text-[13px] font-bold text-blue-600 dark:text-blue-400">Grade: {mySubmission.grade}/100</span>}
                                                {mySubmission.feedback && <span className="text-xs text-slate-500 dark:text-slate-400">Feedback: {mySubmission.feedback}</span>}
                                            </div>
                                        </div>
                                    ) : null;
                                })()}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}