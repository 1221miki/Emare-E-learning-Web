/**
 * socraticAiService.js
 * 
 * Enhanced AI Service with Socratic Method and RAG (Retrieval-Augmented Generation)
 * Supports Groq API (high-speed LPU inference) and OpenAI
 * Features:
 * - Socratic questioning techniques
 * - RAG using MongoDB Atlas Vector Search
 * - Adaptive difficulty levels
 * - Student comprehension tracking
 * - Personalized learning paths
 */

const axios = require('axios');
const mongoose = require('mongoose');
const ContentEmbedding = require('../models/ContentEmbedding');
const {
    PROFESSIONAL_SOCRATIC_PROMPT,
    INITIAL_INTRODUCTION,
    ASSESSMENT_DETECTION_RESPONSE,
    CONCEPTUAL_HINT_TEMPLATE,
    PROCEDURAL_HINT_TEMPLATE,
    MICRO_EXAMPLE_HINT_TEMPLATE,
    RESPONSE_EVALUATION_TEMPLATE,
    OFF_TOPIC_REDIRECTION,
    SESSION_SUMMARY_TEMPLATE,
    getProfessionalSystemPrompt,
    isAssessmentFormat
} = require('../config/socraticPrompts');

class SocraticAIService {
    constructor() {
        this.apiKey = process.env.GROQ_API_KEY || process.env.AI_API_KEY || '';
        this.provider = process.env.AI_PROVIDER || (this.apiKey ? 'groq' : 'mock');
        this.model = process.env.AI_MODEL || (this.provider === 'groq' ? 'openai/gpt-oss-120b' : 'gpt-4o-mini');
        this.fallbackModel = 'openai/gpt-oss-20b';
    }

    /**
     * Generate text embeddings using OpenAI API (if configured) or fallback vector
     * @param {string} text - Text to embed
     * @returns {Promise<Array<number>>} - Vector embedding
     */
    async generateEmbedding(text) {
        try {
            if (this.provider === 'openai' && this.apiKey) {
                return await this._generateOpenAIEmbedding(text);
            }
            // Groq does not provide text embeddings directly; return safe zero/mock vector for vector search
            return new Array(1536).fill(0);
        } catch (error) {
            console.error('Error generating embedding:', error.message);
            return new Array(1536).fill(0);
        }
    }

    /**
     * Generate embedding using OpenAI API
     */
    async _generateOpenAIEmbedding(text) {
        try {
            const response = await axios.post(
                'https://api.openai.com/v1/embeddings',
                {
                    input: text.substring(0, 8191),
                    model: 'text-embedding-3-small'
                },
                {
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: 30000
                }
            );

            return response.data.data[0].embedding;
        } catch (error) {
            console.error('Error with OpenAI embedding:', error.message);
            throw error;
        }
    }

    /**
     * Retrieve relevant course content using vector similarity search
     * @param {string} query - User question/query
     * @param {string} courseId - Course ID
     * @param {number} topK - Number of results to return
     * @returns {Promise<Array>} - Relevant content chunks
     */
    async retrieveRelevantContent(query, courseId, topK = 3) {
        try {
            // Generate embedding for the query
            const queryEmbedding = await this.generateEmbedding(query);

            // Use aggregation pipeline for vector search
            const relevantContent = await ContentEmbedding.aggregate([
                {
                    $match: {
                        courseRef: mongoose.Types.ObjectId(courseId),
                        embedding: { $exists: true, $ne: null }
                    }
                },
                {
                    $addFields: {
                        similarity: {
                            $let: {
                                vars: {
                                    dotProduct: {
                                        $reduce: {
                                            input: { $range: [0, { $size: '$embedding' }] },
                                            initialValue: 0,
                                            in: {
                                                $add: [
                                                    '$$value',
                                                    {
                                                        $multiply: [
                                                            { $arrayElemAt: ['$embedding', '$$this'] },
                                                            { $arrayElemAt: [queryEmbedding, '$$this'] }
                                                        ]
                                                    }
                                                ]
                                            }
                                        }
                                    }
                                },
                                in: '$$dotProduct'
                            }
                        }
                    }
                },
                { $sort: { similarity: -1 } },
                { $limit: topK }
            ]).exec();

            return relevantContent;
        } catch (error) {
            console.error('Error retrieving relevant content:', error);
            return [];
        }
    }

    /**
     * Generate Socratic questions to guide student learning
     * @param {string} topic - Learning topic
     * @param {Object} studentProfile - Student's learning profile
     * @param {string} lastResponse - Student's previous response
     * @returns {Promise<Object>} - Socratic response object
     */
    async generateSocraticQuestion(topic, studentProfile = {}, lastResponse = '') {
        const comprehensionLevel = studentProfile.comprehensionLevel || 3;
        const difficultyLevel = studentProfile.difficultyLevel || 3;

        // Check if student is working on assessment
        if (isAssessmentFormat(lastResponse)) {
            return {
                success: true,
                messageType: 'assessment_detected',
                content: ASSESSMENT_DETECTION_RESPONSE,
                followUpPrompts: [
                    'Share your current thinking on this question',
                    'What reasoning led you to your choice?',
                    'Which option appeals to you most and why?'
                ]
            };
        }

        const socraticPrompt = this._buildSocraticPrompt(
            topic,
            comprehensionLevel,
            difficultyLevel,
            lastResponse
        );

        try {
            if (this.provider === 'groq') {
                return await this._generateGroqSocraticQuestion(socraticPrompt, comprehensionLevel, difficultyLevel);
            } else {
                return await this._generateOpenAISocraticQuestion(socraticPrompt, comprehensionLevel, difficultyLevel);
            }
        } catch (error) {
            console.error('Error generating Socratic question:', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * Generate Socratic question using Groq API
     */
    async _generateGroqSocraticQuestion(prompt, comprehensionLevel, difficultyLevel) {
        try {
            const systemPrompt = getProfessionalSystemPrompt(comprehensionLevel, 'question_generation');

            const sendGroq = async (modelToUse) => {
                return await axios.post(
                    'https://api.groq.com/openai/v1/chat/completions',
                    {
                        model: modelToUse,
                        messages: [
                            { role: 'system', content: systemPrompt },
                            { role: 'user', content: prompt }
                        ],
                        temperature: 0.7,
                        max_tokens: 300,
                        top_p: 0.9
                    },
                    {
                        headers: {
                            'Authorization': `Bearer ${this.apiKey}`,
                            'Content-Type': 'application/json'
                        },
                        timeout: 30000
                    }
                );
            };

            let response;
            try {
                response = await sendGroq(this.model);
            } catch (err) {
                if (this.fallbackModel && this.fallbackModel !== this.model) {
                    response = await sendGroq(this.fallbackModel);
                } else {
                    throw err;
                }
            }

            const questionContent = response.data?.choices?.[0]?.message?.content || 'I am ready to guide your thinking. What have you tried so far?';

            return {
                success: true,
                messageType: 'socratic_question',
                content: questionContent,
                followUpPrompts: this._extractFollowUpSuggestions(questionContent),
                comprehensionLevel: comprehensionLevel,
                difficultyLevel: difficultyLevel
            };
        } catch (error) {
            console.error('Error with Groq Socratic question:', error.message);
            throw error;
        }
    }

    /**
     * Generate Socratic question using OpenAI
     */
    async _generateOpenAISocraticQuestion(prompt, comprehensionLevel, difficultyLevel) {
        try {
            const systemPrompt = getProfessionalSystemPrompt(comprehensionLevel, 'question_generation');
            
            const response = await axios.post(
                'https://api.openai.com/v1/chat/completions',
                {
                    model: this.model,
                    messages: [
                        {
                            role: 'system',
                            content: systemPrompt
                        },
                        { role: 'user', content: prompt }
                    ],
                    temperature: 0.7,
                    max_tokens: 300,
                    top_p: 0.9
                },
                {
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            const questionContent = response.data.choices[0].message.content;

            return {
                success: true,
                messageType: 'socratic_question',
                content: questionContent,
                followUpPrompts: this._extractFollowUpSuggestions(questionContent),
                comprehensionLevel: comprehensionLevel,
                difficultyLevel: difficultyLevel
            };
        } catch (error) {
            console.error('Error with OpenAI Socratic question:', error.message);
            throw error;
        }
    }

    /**
     * Evaluate student response and provide feedback using Socratic method
     * @param {string} studentResponse - Student's answer
     * @param {string} expectedConcept - Expected learning outcome
     * @param {Object} studentProfile - Student profile
     * @param {Array} relevantContent - Retrieved course content
     * @returns {Promise<Object>} - Evaluation and guidance
     */
    async evaluateStudentResponse(
        studentResponse,
        expectedConcept,
        studentProfile = {},
        relevantContent = []
    ) {
        // Detect if this is an assessment question
        if (isAssessmentFormat(studentResponse)) {
            return {
                success: true,
                messageType: 'assessment_detected',
                content: ASSESSMENT_DETECTION_RESPONSE,
                isAssessment: true
            };
        }

        const context = relevantContent
            .map(item => `- ${item.lessonTitle || 'Content'}: ${item.content.substring(0, 300)}`)
            .join('\n');

        const evaluationPrompt = RESPONSE_EVALUATION_TEMPLATE(
            expectedConcept,
            studentResponse,
            studentProfile.comprehensionLevel || 3
        );

        const fullPrompt = `${evaluationPrompt}

Course Context:
${context || 'General domain knowledge'}`;

        try {
            if (this.provider === 'groq') {
                return await this._evaluateWithGroq(fullPrompt, studentProfile.comprehensionLevel || 3);
            } else {
                return await this._evaluateWithOpenAI(fullPrompt, studentProfile.comprehensionLevel || 3);
            }
        } catch (error) {
            console.error('Error evaluating response:', error);
            return { error: error.message };
        }
    }

    /**
     * Evaluate with Groq
     */
    async _evaluateWithGroq(prompt, comprehensionLevel = 3) {
        try {
            const systemPrompt = getProfessionalSystemPrompt(comprehensionLevel, 'evaluation');

            const sendGroq = async (modelToUse) => {
                return await axios.post(
                    'https://api.groq.com/openai/v1/chat/completions',
                    {
                        model: modelToUse,
                        messages: [
                            { role: 'system', content: systemPrompt },
                            { role: 'user', content: prompt }
                        ],
                        temperature: 0.5,
                        max_tokens: 500
                    },
                    {
                        headers: {
                            'Authorization': `Bearer ${this.apiKey}`,
                            'Content-Type': 'application/json'
                        },
                        timeout: 30000
                    }
                );
            };

            let response;
            try {
                response = await sendGroq(this.model);
            } catch (err) {
                if (this.fallbackModel && this.fallbackModel !== this.model) {
                    response = await sendGroq(this.fallbackModel);
                } else {
                    throw err;
                }
            }

            const responseText = response.data?.choices?.[0]?.message?.content || 'I need a bit more detail to assess your answer.';
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);

            return jsonMatch ? JSON.parse(jsonMatch[0]) : {
                feedback: responseText,
                socraticQuestion: 'Can you elaborate on your thinking?',
                isCorrect: 'partial'
            };
        } catch (error) {
            console.error('Error evaluating with Groq:', error);
            return { error: error.message };
        }
    }

    /**
     * Evaluate with OpenAI
     */
    async _evaluateWithOpenAI(prompt, comprehensionLevel = 3) {
        try {
            const systemPrompt = getProfessionalSystemPrompt(comprehensionLevel, 'evaluation');
            
            const response = await axios.post(
                'https://api.openai.com/v1/chat/completions',
                {
                    model: this.model,
                    messages: [
                        {
                            role: 'system',
                            content: systemPrompt
                        },
                        { role: 'user', content: prompt }
                    ],
                    temperature: 0.5,
                    max_tokens: 500
                },
                {
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            const responseText = response.data.choices[0].message.content;
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            
            return jsonMatch ? JSON.parse(jsonMatch[0]) : {
                feedback: responseText,
                socraticQuestion: 'Can you elaborate on your thinking?',
                isCorrect: 'partial'
            };
        } catch (error) {
            console.error('Error evaluating with OpenAI:', error);
            return { error: error.message };
        }
    }

    /**
     * Generate adaptive hints based on student comprehension
     * Three-tier system:
     * Tier 1: Conceptual reminder of principles/formulas
     * Tier 2: Procedural guidance on next steps
     * Tier 3: Simplified parallel example (never solving their problem)
     * 
     * @param {string} topic - Topic to hint about
     * @param {number} comprehensionLevel - Student comprehension level (1-5)
     * @param {Array} previousHints - Previously given hints
     * @param {number} hintTier - Which tier to generate (1, 2, or 3)
     * @returns {Promise<string>} - Adaptive hint
     */
    async generateAdaptiveHint(topic, comprehensionLevel = 3, previousHints = [], hintTier = 1) {
        let hintPrompt;

        switch(hintTier) {
            case 1:
                // Tier 1: Conceptual Hint - remind of principles
                hintPrompt = CONCEPTUAL_HINT_TEMPLATE(
                    topic,
                    'the underlying principle or formula',
                    `Student level: ${comprehensionLevel}/5`
                );
                break;
            case 2:
                // Tier 2: Procedural Hint - suggest next step
                hintPrompt = PROCEDURAL_HINT_TEMPLATE(
                    topic,
                    `Student has given ${previousHints.length} previous attempts`,
                    'the immediate next logical step'
                );
                break;
            case 3:
                // Tier 3: Parallel Micro-Example - simplified example, never their exact problem
                hintPrompt = MICRO_EXAMPLE_HINT_TEMPLATE(
                    topic,
                    'the student\'s problem (do not solve this)',
                    'a similar but different simplified example with different values'
                );
                break;
            default:
                hintTier = 1;
                hintPrompt = CONCEPTUAL_HINT_TEMPLATE(topic, 'the underlying principle', `Level: ${comprehensionLevel}/5`);
        }

        try {
            if (this.provider === 'groq') {
                return await this._generateGroqHint(hintPrompt);
            } else {
                return await this._generateOpenAIHint(hintPrompt);
            }
        } catch (error) {
            console.error('Error generating hint:', error);
            return 'Try breaking down the problem into smaller steps.';
        }
    }

    /**
     * Generate hint with Groq
     */
    async _generateGroqHint(prompt) {
        try {
            const sendGroq = async (modelToUse) => {
                return await axios.post(
                    'https://api.groq.com/openai/v1/chat/completions',
                    {
                        model: modelToUse,
                        messages: [
                            {
                                role: 'system',
                                content: 'You are a helpful tutor providing adaptive hints based on student level. Follow the Socratic method: never give direct answers, only hints that guide thinking.'
                            },
                            { role: 'user', content: prompt }
                        ],
                        temperature: 0.6,
                        max_tokens: 200
                    },
                    {
                        headers: {
                            'Authorization': `Bearer ${this.apiKey}`,
                            'Content-Type': 'application/json'
                        },
                        timeout: 30000
                    }
                );
            };

            let response;
            try {
                response = await sendGroq(this.model);
            } catch (err) {
                if (this.fallbackModel && this.fallbackModel !== this.model) {
                    response = await sendGroq(this.fallbackModel);
                } else {
                    throw err;
                }
            }

            return response.data?.choices?.[0]?.message?.content || 'Try breaking down the problem into smaller steps.';
        } catch (error) {
            console.error('Error generating Groq hint:', error);
            return 'Try breaking down the problem into smaller steps.';
        }
    }

    /**
     * Generate hint with OpenAI
     */
    async _generateOpenAIHint(prompt) {
        try {
            const response = await axios.post(
                'https://api.openai.com/v1/chat/completions',
                {
                    model: this.model,
                    messages: [
                        {
                            role: 'system',
                            content: 'You are a helpful tutor providing adaptive hints based on student level.'
                        },
                        { role: 'user', content: prompt }
                    ],
                    temperature: 0.6,
                    max_tokens: 200
                },
                {
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            return response.data.choices[0].message.content;
        } catch (error) {
            console.error('Error generating OpenAI hint:', error);
            return 'Try breaking down the problem into smaller steps.';
        }
    }

    /**
     * Build Socratic method prompt based on student level
     * Incorporates professional pedagogical standards
     */
    _buildSocraticPrompt(topic, comprehensionLevel, difficultyLevel, lastResponse) {
        const basePrompt = `🎓 **SOCRATIC TUTORING MODE ACTIVATED**

Student Topic: ${topic}
Comprehension Level: ${comprehensionLevel}/5
Difficulty: ${difficultyLevel}/5

**YOUR ROLE: Ask guiding questions. DO NOT give direct answers.**

Remember: Your job is to help the student DISCOVER the answer themselves through questions.`;
        
        if (lastResponse) {
            return `${basePrompt}

Student Said: "${lastResponse}"

**TASK:** 
- Acknowledge their thinking
- Ask a follow-up question that guides them DEEPER
- Help them see connections or gaps in their thinking
- NEVER tell them if they're right/wrong directly
- NEVER provide the next step - ask "What do you think comes next?"
- If stuck, provide a HINT (not the answer)`;
        }

        if (comprehensionLevel <= 2) {
            return `${basePrompt}

**TASK FOR BEGINNER:**
Ask a SIMPLE question that helps them recall what they already know about "${topic}".
Examples:
- "What have you learned so far about...?"
- "Have you come across this concept before?"
- "What do you think happens when...?"
- "Why might a student need to understand this?"

Start simple and build up!`;
        } else if (comprehensionLevel === 3) {
            return `${basePrompt}

**TASK FOR INTERMEDIATE:**
Ask a question that makes them THINK DEEPER about "${topic}".
Examples:
- "Can you connect this to something you already know?"
- "What would happen if...?"
- "How does this relate to...?"
- "What's the relationship between X and Y?"

Guide them to see the bigger picture!`;
        } else {
            return `${basePrompt}

**TASK FOR ADVANCED:**
Ask a CHALLENGING question about "${topic}" that explores nuances/edge cases.
Examples:
- "What would break this approach?"
- "How would you apply this to a different context?"
- "What assumptions are we making?"
- "Can you synthesize this with previous concepts?"

Push them to think critically and creatively!`;
        }
    }

    /**
     * Extract follow-up suggestions from generated question
     */
    _extractFollowUpSuggestions(questionContent) {
        const suggestions = [];
        const lines = questionContent.split('\n');
        
        lines.forEach(line => {
            if (line.match(/^\d\.|^-|^•/)) {
                suggestions.push(line.replace(/^\d\.|^-|^•/, '').trim());
            }
        });

        return suggestions.slice(0, 3); // Return top 3 suggestions
    }
}

module.exports = new SocraticAIService();
