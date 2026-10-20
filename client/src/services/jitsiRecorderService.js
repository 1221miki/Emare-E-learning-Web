/**
 * jitsiRecorderService.js
 *
 * Professional automated conference recording service for Jitsi Meet live sessions.
 * 
 * Supports:
 * 1. Jitsi Meet External API Recording (api.executeCommand('startRecording', { mode: 'file' }))
 * 2. Browser MediaRecorder conference capture for automatic local/cloud saving
 * 3. Automatic upload to Cloudinary cloud storage on meeting completion
 * 4. Status management: 'recording', 'processing', 'ready', 'failed'
 */

import { liveSessionService } from './api';

export class JitsiConferenceRecorder {
    constructor(sessionId, options = {}) {
        this.sessionId = sessionId;
        this.options = options;
        this.mediaRecorder = null;
        this.recordedChunks = [];
        this.stream = null;
        this.startTime = null;
        this.status = 'not_started'; // 'recording' | 'processing' | 'ready' | 'failed'
        this.timerInterval = null;
        this.elapsedSeconds = 0;
        this.onStatusChange = options.onStatusChange || (() => {});
        this.onTimerTick = options.onTimerTick || (() => {});
    }

    setStatus(newStatus) {
        this.status = newStatus;
        this.onStatusChange(newStatus);
    }

    /**
     * Start automatic recording when instructor begins live class
     * @param {Object} jitsiApi - JitsiMeetExternalAPI instance
     */
    async start(jitsiApi) {
        try {
            this.setStatus('recording');
            this.startTime = Date.now();
            this.recordedChunks = [];

            // 1. Notify backend database that recording has started
            try {
                await liveSessionService.startRecording(this.sessionId);
            } catch (err) {
                console.warn('[JitsiRecorder] Backend startRecording notice:', err.message);
            }

            // 2. Start timer
            this.timerInterval = setInterval(() => {
                this.elapsedSeconds = Math.floor((Date.now() - this.startTime) / 1000);
                this.onTimerTick(this.elapsedSeconds);
            }, 1000);

            // 3. Trigger Jitsi External API native recording command
            if (jitsiApi && typeof jitsiApi.executeCommand === 'function') {
                try {
                    jitsiApi.executeCommand('startRecording', {
                        mode: 'file',
                        shouldShare: true
                    });
                } catch (jitsiErr) {
                    console.warn('[JitsiRecorder] Jitsi executeCommand startRecording notice:', jitsiErr);
                }

                // Listen for Jitsi recording events
                jitsiApi.addEventListener('recordingStatusChanged', (statusData) => {
                    console.log('[JitsiRecorder] Jitsi recordingStatusChanged:', statusData);
                    if (statusData?.error) {
                        console.warn('[JitsiRecorder] Jitsi recording warning:', statusData.error);
                    }
                });

                jitsiApi.addEventListener('recordingLinkAvailable', async (data) => {
                    console.log('[JitsiRecorder] Jitsi recordingLinkAvailable:', data);
                    if (data?.link) {
                        try {
                            await liveSessionService.updateRecording(this.sessionId, {
                                videoUrl: data.link,
                                status: 'ready'
                            });
                            this.setStatus('ready');
                        } catch (e) {
                            console.error('[JitsiRecorder] Error saving Jitsi recording link:', e);
                        }
                    }
                });
            }

            // 4. Try browser MediaStream capture if requested/supported
            if (this.options.enableMediaCapture && navigator.mediaDevices?.getDisplayMedia) {
                try {
                    const displayStream = await navigator.mediaDevices.getDisplayMedia({
                        video: { displaySurface: 'browser' },
                        audio: true
                    });
                    this.stream = displayStream;

                    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')
                        ? 'video/webm;codecs=vp8,opus'
                        : (MediaRecorder.isTypeSupported('video/mp4') ? 'video/mp4' : '');

                    const options = mimeType ? { mimeType } : undefined;
                    this.mediaRecorder = new MediaRecorder(displayStream, options);

                    this.mediaRecorder.ondataavailable = (event) => {
                        if (event.data && event.data.size > 0) {
                            this.recordedChunks.push(event.data);
                        }
                    };

                    this.mediaRecorder.start(2000); // chunk every 2 seconds
                } catch (captureErr) {
                    // Instructor cancelled prompt or permissions denied — Jitsi native recording is still active
                    console.info('[JitsiRecorder] Optional display capture notice:', captureErr.message);
                }
            }

            return true;
        } catch (err) {
            console.error('[JitsiRecorder] Failed to start recording:', err);
            this.setStatus('failed');
            throw err;
        }
    }

    /**
     * Stop recording and automatically save to Cloud Storage (Cloudinary)
     * @param {Object} jitsiApi - JitsiMeetExternalAPI instance
     * @returns {Promise<Object>} saved recording details
     */
    async stop(jitsiApi) {
        clearInterval(this.timerInterval);
        this.setStatus('processing');

        const duration = this.elapsedSeconds || Math.floor((Date.now() - (this.startTime || Date.now())) / 1000);

        // 1. Tell Jitsi to stop native recording
        if (jitsiApi && typeof jitsiApi.executeCommand === 'function') {
            try {
                jitsiApi.executeCommand('stopRecording', 'file');
            } catch (jitsiErr) {
                console.warn('[JitsiRecorder] Jitsi executeCommand stopRecording notice:', jitsiErr);
            }
        }

        // 2. Notify backend that recording has stopped (sets status to 'processing')
        try {
            await liveSessionService.stopRecording(this.sessionId);
        } catch (err) {
            console.warn('[JitsiRecorder] Backend stopRecording notice:', err.message);
        }

        // 3. Stop MediaStream capture and upload recorded video if chunks exist
        let recordingData = null;
        if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
            await new Promise((resolve) => {
                this.mediaRecorder.onstop = resolve;
                this.mediaRecorder.stop();
            });

            if (this.stream) {
                this.stream.getTracks().forEach(track => track.stop());
            }

            if (this.recordedChunks.length > 0) {
                try {
                    const blob = new Blob(this.recordedChunks, {
                        type: this.mediaRecorder.mimeType || 'video/webm'
                    });

                    const formData = new FormData();
                    formData.append('recording', blob, `session-${this.sessionId}-${Date.now()}.webm`);
                    formData.append('duration', String(duration));
                    formData.append('title', this.options.sessionTitle || 'Live Class Recording');

                    // Post to auto-save endpoint which uploads to Cloudinary cloud storage
                    const res = await liveSessionService.autoSaveRecording(this.sessionId, formData);
                    recordingData = res.data?.data?.recording || res.data?.data;
                    this.setStatus('ready');
                    return recordingData;
                } catch (uploadErr) {
                    console.error('[JitsiRecorder] Cloud upload failed:', uploadErr);
                    this.setStatus('failed');
                    throw uploadErr;
                }
            }
        }

        // If no media chunks were recorded locally (e.g. relying on Jitsi native recording/meeting link):
        // Ensure backend creates/finalizes the recording entry
        try {
            const endRes = await liveSessionService.endSession(this.sessionId);
            recordingData = endRes.data?.recording || endRes.data?.data;
            this.setStatus('ready');
            return recordingData;
        } catch (endErr) {
            console.error('[JitsiRecorder] End session error:', endErr);
            this.setStatus('failed');
            throw endErr;
        }
    }
}
