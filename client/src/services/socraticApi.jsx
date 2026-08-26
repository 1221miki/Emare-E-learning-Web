/**
 * socraticApi.jsx
 * API service for Socratic AI Tutoring endpoints
 */

import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || '/api';

const socraticApi = {
    /**
     * Start a new Socratic tutoring session
     */
    startSession: async (courseId, topic, learningObjectives, difficultyLevel = 3) => {
        try {
            const response = await axios.post(
                `${API_BASE_URL}/socratic/session/${courseId}/start`,
                { topic, learningObjectives, difficultyLevel },
                { withCredentials: true }
            );
            return response.data;
        } catch (error) {
            console.error('Error starting Socratic session:', error);
            throw error;
        }
    },

    /**
     * Stream Socratic response with SSE
     */
    streamSocraticResponse: (sessionId, question, courseId, useHints = false) => {
        return new Promise((resolve, reject) => {
            try {
                const eventSource = new EventSource(
                    `${API_BASE_URL}/socratic/ask?sessionId=${sessionId}&question=${encodeURIComponent(question)}&courseId=${courseId}&useHints=${useHints}`,
                    { withCredentials: true }
                );

                const messages = [];
                let error = null;

                eventSource.addEventListener('message', (event) => {
                    try {
                        const data = JSON.parse(event.data);
                        if (data.type === 'done') {
                            eventSource.close();
                            resolve({ messages, success: true });
                        } else {
                            messages.push(data);
                        }
                    } catch (e) {
                        console.error('Error parsing SSE message:', e);
                    }
                });

                eventSource.addEventListener('error', (event) => {
                    eventSource.close();
                    if (error) {
                        reject(error);
                    } else {
                        reject(new Error('SSE connection error'));
                    }
                });

                // Also support POST with manual polling for better browser compatibility
                postSocraticResponse(sessionId, question, courseId, useHints)
                    .then(resolve)
                    .catch(reject);

            } catch (error) {
                reject(error);
            }
        });
    },

    /**
     * Evaluate student response (POST method with SSE fallback)
     */
    evaluateResponse: async (sessionId, studentResponse, expectedConcept) => {
        try {
            const response = await axios.post(
                `${API_BASE_URL}/socratic/evaluate`,
                { sessionId, studentResponse, expectedConcept },
                { withCredentials: true }
            );
            return response.data;
        } catch (error) {
            console.error('Error evaluating response:', error);
            throw error;
        }
    },

    /**
     * Get all Socratic sessions for a course
     */
    getSessionsForCourse: async (courseId) => {
        try {
            const response = await axios.get(
                `${API_BASE_URL}/socratic/sessions/${courseId}`,
                { withCredentials: true }
            );
            return response.data;
        } catch (error) {
            console.error('Error fetching sessions:', error);
            throw error;
        }
    },

    /**
     * Get specific session details
     */
    getSessionDetails: async (sessionId) => {
        try {
            const response = await axios.get(
                `${API_BASE_URL}/socratic/session/${sessionId}`,
                { withCredentials: true }
            );
            return response.data;
        } catch (error) {
            console.error('Error fetching session details:', error);
            throw error;
        }
    },

    /**
     * End session and get summary
     */
    endSession: async (sessionId) => {
        try {
            const response = await axios.post(
                `${API_BASE_URL}/socratic/session/${sessionId}/end`,
                {},
                { withCredentials: true }
            );
            return response.data;
        } catch (error) {
            console.error('Error ending session:', error);
            throw error;
        }
    }
};

/**
 * POST-based Socratic response (fallback for environments without SSE support)
 */
async function postSocraticResponse(sessionId, question, courseId, useHints = false) {
    try {
        const response = await axios.post(
            `${API_BASE_URL}/socratic/ask`,
            { sessionId, question, courseId, useHints },
            { withCredentials: true }
        );
        return { messages: [response.data], success: true };
    } catch (error) {
        console.error('Error in POST Socratic response:', error);
        throw error;
    }
}

export default socraticApi;
