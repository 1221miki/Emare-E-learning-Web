/*
 * aiService.js
 * 
 * AI Service for the Emare ELMS implementation.
 * Supports a mock fallback and an OpenAI-powered tutor assistant.
 */

const axios = require('axios');

class AIService {
    constructor() {
        this.provider = process.env.AI_PROVIDER || 'mock';
        this.apiKey = process.env.AI_API_KEY || '';
        this.model = process.env.AI_MODEL || 'gpt-4o-mini';
    }

    /**
     * Get a chat response from the AI learning assistant
     * @param {string} prompt - The user's query
     * @param {Object} context - Optional context (e.g., current course, user progress)
     * @returns {Promise<string>}
     */
    async generateChatResponse(prompt, context = {}, conversationHistory = []) {
        if (this.provider === 'openai' && this.apiKey) {
            try {
                return await this._callOpenAI(prompt, context, conversationHistory);
            } catch (error) {
                console.error('AIProvider error:', error.message || error);
                return `${this._getMockResponse(prompt, context)}\n\n(Note: This response is a fallback because the external AI service was unavailable.)`;
            }
        }

        return this._getMockResponse(prompt, context);
    }

    /**
     * Generate personalized course recommendations based on user history and goals
     * @param {Object} userProfile - The user's profile and learning history
     * @returns {Promise<Array>}
     */
    async generateRecommendations(userProfile) {
        if (this.provider === 'mock') {
            return [
                { title: 'Advanced React Patterns', matchScore: 95, reason: 'Based on your interest in Frontend Development' },
                { title: 'Machine Learning Basics', matchScore: 88, reason: 'Trending among students in your location' }
            ];
        }

        // TODO: Implement actual LLM/Recommendation engine call
        return [];
    }

    /**
     * Provide automated feedback for a submitted assignment
     * @param {string} submissionContent - The text/code submitted by the student
     * @param {string} rubric - The grading rubric
     * @returns {Promise<Object>}
     */
    async generateAssignmentFeedback(submissionContent, rubric) {
        if (this.provider === 'mock') {
            return {
                score: 85,
                feedback: 'Good effort! Make sure to focus more on code modularity.',
                suggestions: ['Extract the helper function into a separate file.', 'Add more comments.']
            };
        }

        // TODO: Implement actual LLM API call for code/text review
        return {};
    }

    async _callOpenAI(prompt, context, conversationHistory = [], instruction = null) {
        const messages = this._buildConversationMessages(prompt, context, conversationHistory, instruction);

        const response = await axios.post('https://api.openai.com/v1/chat/completions', {
            model: this.model,
            messages,
            temperature: 0.45,
            max_tokens: 900,
            top_p: 0.95,
            frequency_penalty: 0.0,
            presence_penalty: 0.0
        }, {
            headers: {
                Authorization: `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json'
            }
        });

        const answer = response?.data?.choices?.[0]?.message?.content;
        if (!answer) {
            throw new Error('Empty response from AI provider');
        }

        return answer.trim();
    }

    _buildConversationMessages(prompt, context, conversationHistory = [], instruction = null) {
        const defaultInstruction = `You are Emare AI Tutor.
You are the official AI learning assistant for the Emare ICT Hub E-Learning Platform.
You are an expert university professor, software engineer, course coach, study mentor, and assignment helper.
Your mission is to help students learn effectively, complete courses successfully, and achieve their learning goals.

You are not a generic chatbot.
You are a personalized tutor and course assistant.

Always:
- Provide a clear simple explanation first.
- Follow with a detailed technical explanation.
- Give practical examples.
- Give real-world examples.
- Use Markdown formatting.
- Organize content with headings and bullet points.
- Use tables when useful.
- Provide code blocks when needed.
- Highlight important notes.
- If the answer is long, divide it into sections.
- Mention common mistakes and best practices when relevant.
- Encourage curiosity and critical thinking.
- Be encouraging, patient, and professional.
- Do not criticize the student.
- Do not invent facts.
- If you are uncertain, state that you are unsure.

Response structure should include when appropriate:
1. Simple explanation
2. Detailed explanation
3. Real-life example
4. Key points
5. Quick summary
6. Practice question
7. Suggested next topic

Platform Context:
You are integrated into the Emare ICT Hub E-Learning Management System.
Use available student and course data to personalize answers while respecting privacy and only using information made available for the current student.

If lessons are unfinished, remind the student politely about their progress.
If the user asks for exam prep, quizzes, notes, flashcards, or course guidance, provide supportive learning guidance.
`;

        const contextSummary = this._summarizeContext(context);
        const requiredContext = `Required context fields:
- Course Name
- Lesson Name
- Module Name
- Assignment
- Quiz
- Student Level
- Language
- Current Page
- Course Progress
- Student Name
- Previous Messages
- Conversation History
- Selected Text
- Uploaded PDF
- Uploaded Notes

Use these details when they are available.`;

        const technicalNotes = this._buildTechnicalSpecializationNotes(prompt);
        const courseLabels = [];
        if (context?.courseName) courseLabels.push(`Course: ${context.courseName}`);
        if (context?.lessonName) courseLabels.push(`Lesson: ${context.lessonName}`);
        if (context?.moduleName) courseLabels.push(`Module: ${context.moduleName}`);
        if (context?.assignment) courseLabels.push(`Assignment: ${context.assignment}`);
        if (context?.quiz) courseLabels.push(`Quiz: ${context.quiz}`);
        if (context?.studentLevel) courseLabels.push(`Student Level: ${context.studentLevel}`);
        if (context?.language) courseLabels.push(`Language: ${context.language}`);
        if (context?.currentPage) courseLabels.push(`Current Page: ${context.currentPage}`);
        if (typeof context?.courseProgress === 'number') courseLabels.push(`Course Progress: ${context.courseProgress}%`);
        if (context?.studentName) courseLabels.push(`Student Name: ${context.studentName}`);

        const systemContext = courseLabels.length ? `Context: ${courseLabels.join('; ')}.` : 'Context: no course-specific context was provided.';
        const courseContextNote = context?.courseName ? `Use the course name "${context.courseName}" and the lesson details to relate your explanation to the student's enrolled course.` : '';

        const messages = [
            { role: 'system', content: instruction || defaultInstruction },
            { role: 'system', content: requiredContext },
            { role: 'system', content: systemContext },
            { role: 'system', content: contextSummary }
        ];

        if (technicalNotes) {
            messages.push({ role: 'system', content: technicalNotes });
        }

        if (courseContextNote) {
            messages.push({ role: 'system', content: courseContextNote });
        }

        const historyMessages = Array.isArray(conversationHistory)
            ? conversationHistory.slice(-6).flatMap((entry) => [
                { role: 'user', content: entry.question },
                { role: 'assistant', content: entry.answer }
            ])
            : [];

        const previousMessages = Array.isArray(context.previousMessages)
            ? context.previousMessages.slice(-6).map((message) => ({
                role: message.role === 'assistant' ? 'assistant' : 'user',
                content: message.text || message.content || ''
            }))
            : [];

        const extraContextMessages = [];
        if (typeof context.selectedText === 'string' && context.selectedText.trim()) {
            extraContextMessages.push({ role: 'system', content: `Selected Text: ${context.selectedText.trim()}` });
        }
        if (typeof context.uploadedNotes === 'string' && context.uploadedNotes.trim()) {
            extraContextMessages.push({ role: 'system', content: `Uploaded Notes: ${context.uploadedNotes.trim().slice(0, 1200)}${context.uploadedNotes.length > 1200 ? '... (truncated)' : ''}` });
        }
        if (typeof context.pdfText === 'string' && context.pdfText.trim()) {
            extraContextMessages.push({ role: 'system', content: `Uploaded PDF content: ${context.pdfText.trim().slice(0, 1200)}${context.pdfText.length > 1200 ? '... (truncated)' : ''}` });
        }

        return [...messages, ...extraContextMessages, ...historyMessages, ...previousMessages, { role: 'user', content: prompt }];
    }

    _summarizeContext(context = {}) {
        const summaryFields = [
            ['Course Name', context.courseName],
            ['Lesson Name', context.lessonName],
            ['Module Name', context.moduleName],
            ['Assignment', context.assignment],
            ['Quiz', context.quiz],
            ['Student Level', context.studentLevel],
            ['Language', context.language],
            ['Current Page', context.currentPage],
            ['Course Progress', typeof context.courseProgress === 'number' ? `${context.courseProgress}%` : context.courseProgress],
            ['Student Name', context.studentName]
        ];

        const lines = summaryFields
            .filter(([, value]) => value !== undefined && value !== null && value !== '')
            .map(([label, value]) => `${label}: ${value}`);

        if (!lines.length) {
            return 'No additional course metadata was provided.';
        }

        return `Course metadata available:\n- ${lines.join('\n- ')}`;
    }

    _buildTechnicalSpecializationNotes(prompt) {
        const text = prompt.toLowerCase();
        const notes = [];

        if (/mern|mongodb.*express|express.*mongodb|react.*node|node.*react|mern stack/i.test(text)) {
            notes.push(`The question is about the MERN stack. Answer as a senior MERN instructor with architecture, data flow, and best practices.`);
        }
        if (/\breact\b/i.test(text) && !/mern/i.test(text)) {
            notes.push(`The question is about React. Explain components, hooks, state, props, lifecycle, performance, routing, and examples.`);
        }
        if (/\b(node|node\.js)\b/i.test(text)) {
            notes.push(`The question is about Node.js. Explain backend architecture, request handling, server structure, and scaling considerations.`);
        }
        if (/\bmongo(db)?\b/i.test(text)) {
            notes.push(`The question is about MongoDB. Explain schema design, collections, relationships, and indexes.`);
        }
        if (/\bexpress\b/i.test(text)) {
            notes.push(`The question is about Express. Explain routes, middleware, controllers, authentication, and request lifecycle.`);
        }
        if (/\b(html|css)\b/i.test(text)) {
            notes.push(`The question is about HTML/CSS. Explain the visual structure, layout behavior, and how styles affect presentation.`);
        }

        return notes.join(' ');
    }

    async generatePersonalizedLearningPath(studentContext = {}) {
        if (this.provider === 'openai' && this.apiKey) {
            const instruction = `You are an AI Learning Coach.

Analyze:
- Student progress
- Quiz scores
- Assignment performance
- Completed lessons
- Learning speed

Your goal:
- Identify weak skills.
- Identify strong skills.
- Recommend next lessons.
- Build personalized learning paths.
- Prevent students from skipping prerequisites.

Output format:
Strengths:
[skills]

Areas to Improve:
[skills]

Recommended Next Steps:
[list]

Learning Path:
[step-by-step plan]`;
            const prompt = `Provide a personalized learning summary and plan based on the student's progress and performance.`;
            return await this._callOpenAI(prompt, studentContext, instruction);
        }

        return `Strengths:
- Understanding of core concepts
- Regular lesson completion

Areas to Improve:
- Time management for quizzes
- Practice on advanced project tasks

Recommended Next Steps:
- Review the latest lesson notes
- Complete a practice quiz on the weak topics
- Ask the AI Tutor for a step-by-step coding example

Learning Path:
1. Revisit the current lesson and summarize key terms.
2. Practice related exercises and quiz questions.
3. Complete a small project task using the learned skills.
4. Review feedback and repeat with the next lesson.`;
    }

    async recommendCourses(studentContext = {}) {
        if (this.provider === 'openai' && this.apiKey) {
            const instruction = `You are an AI Course Recommendation Specialist.

Analyze:
- Student interests
- Completed courses
- Search history
- Skill level
- Career goals

Recommend:
- Courses
- Learning paths
- Certifications
- Instructors

Rules:
- Prioritize skill progression.
- Recommend beginner-to-advanced paths.
- Explain why each recommendation is useful.

Output:
Recommended Courses
Reason
Expected Skills
Estimated Learning Time`;
            const prompt = `Provide course recommendations for the student based on their career goals, interests, and completed learning history.`;
            return await this._callOpenAI(prompt, studentContext, instruction);
        }

        return `Recommended Courses:
- Advanced React Development
- Data Science with Python
- Professional Project Management

Reason:
These courses build on existing skills, improve career readiness, and support long-term growth.

Expected Skills:
- Frontend architecture
- Data analysis
- Team collaboration and planning

Estimated Learning Time:
- Advanced React Development: 8 weeks
- Data Science with Python: 10 weeks
- Professional Project Management: 6 weeks`;
    }

    async generateQuiz(quizContext = {}) {
        if (this.provider === 'openai' && this.apiKey) {
            const instruction = `You are an AI Assessment Generator.

Create quizzes from:

- Course lessons
- PDFs
- Videos
- Lecture notes

Generate:

- Multiple Choice Questions
- True/False Questions
- Fill-in-the-Blank Questions
- Short Answer Questions

Rules:

- Cover key concepts.
- Mix difficulty levels.
- Include correct answers.
- Include explanations.

Output:

Question
Options
Correct Answer
Explanation
Difficulty`;
            const prompt = `Generate a mixed-format assessment that reflects the student's current learning material, course objectives, and lesson topics.`;
            return await this._callOpenAI(prompt, quizContext, instruction);
        }

        return `Question 1: What is the primary purpose of a responsive layout in modern web design?
Options:
A) To make the website load faster
B) To adapt the page layout across different screen sizes
C) To add decorative animations
D) To encrypt user data
Correct Answer: B
Explanation: A responsive layout ensures content adapts to desktop, tablet, and mobile screens, improving usability across devices.
Difficulty: Easy

Question 2: True/False: A well-designed quiz should include only multiple-choice questions.
Options:
A) True
B) False
Correct Answer: B
Explanation: High-quality quizzes use multiple formats like true/false, fill-in-the-blank, and short answers to assess deeper understanding.
Difficulty: Medium

Question 3: Fill in the blank: In JavaScript, the keyword ___ is used to declare a block-scoped constant.
Options:
A) var
B) let
C) const
D) function
Correct Answer: C
Explanation: 'const' declares a constant whose value cannot be reassigned, and it is block-scoped.
Difficulty: Medium

Question 4: Short Answer: Describe one key benefit of using a version control system like Git in a team project.
Options:
- Use your own answer here
Correct Answer: Allows team members to collaborate safely by tracking changes, resolving conflicts, and maintaining a history of edits.
Explanation: Version control helps coordinate work, prevents lost changes, and makes it easier to review and rollback code.
Difficulty: Hard`;
    }

    async generateAssignmentAssistant(assignmentContext = {}) {
        if (this.provider === 'openai' && this.apiKey) {
            const instruction = `You are an AI Assignment Coach.

Your job:

- Explain assignment requirements.
- Break assignments into steps.
- Suggest approaches.
- Review student work.
- Provide feedback.

Rules:

- Never complete graded assignments.
- Guide learning.
- Give hints.
- Encourage independent thinking.

Output:

Assignment Goal
Required Skills
Step-by-Step Plan
Helpful Resources
Common Mistakes`;
            const prompt = `Provide assignment coaching based on the assignment details, student progress, and learning objectives.`;
            return await this._callOpenAI(prompt, assignmentContext, instruction);
        }

        return `Assignment Goal:
- Understand the requirements and deliver a complete solution with clear structure.

Required Skills:
- Reading and interpreting instructions.
- Breaking work into smaller tasks.
- Writing clear and maintainable code or structured responses.

Step-by-Step Plan:
1. Read the assignment prompt carefully and highlight the deliverables.
2. Identify the required features, inputs, and outputs.
3. Outline each step before you start work.
4. Build the solution in small pieces and test each part.
5. Review your work against the grading criteria.

Helpful Resources:
- Course lecture notes and slides.
- Example code from previous modules.
- Official documentation for the technology stack.

Common Mistakes:
- Missing one or more assignment requirements.
- Starting without a clear plan.
- Not testing edge cases or validating inputs.`;
    }

    _isExplainRequest(prompt) {
        const explanationKeywords = ['explain', 'how', 'what does', 'what is', 'describe', 'why', 'how it', 'how does', 'how to', 'meaning of', 'explain it'];
        return explanationKeywords.some((kw) => prompt.includes(kw));
    }

    _isCodeSnippet(prompt) {
        return /\b(print\(|input\(|def\s+|class\s+|for\s+|while\s+|if\s+|elif\s+|else:|import\s+|from\s+)/i.test(prompt);
    }

    _getCodeExplanation(prompt, context) {
        const codeKeywords = prompt.toLowerCase();
        const courseName = context?.courseName || 'your course';

        if (codeKeywords.includes('menu') || codeKeywords.includes('choice') || codeKeywords.includes('input(')) {
            return `This Python program shows a simple menu-driven interface. It prints several numbered options, reads the student's choice using input(), then uses if/elif branches to run the corresponding function. Option 4 exits the program, and invalid choices are handled by a fallback message. Each menu option is meant to call a helper function like show_students(), add_student(), or average_grade().`;
        }

        if (codeKeywords.includes('print(') && codeKeywords.includes('input(')) {
            return `The code uses print() to show text to the user and input() to read user input. It then checks the user's selection with if / elif conditions and runs different steps depending on the chosen option. This is a standard pattern for a text-based menu application.`;
        }

        return `This looks like a programming question. The code sample uses standard Python control flow: printing options, reading user input with input(), checking the value with if/elif, and then calling a matching function. The main idea is to let the user choose a number and perform that action.`;
    }

    _applyStudentContext(answer, context) {
        if (!context?.courseName) {
            return answer;
        }

        const courseName = context.courseName;
        const lessonSegment = context.currentLessonTitle ? ` You are currently studying "${context.currentLessonTitle}".` : '';
        const progressSegment = context.courseProgress ? ` You are ${context.courseProgress}% through ${courseName}.` : '';

        return `${answer}\n\nSince you are studying ${courseName}, focus on the parts that connect to your current coursework.${lessonSegment}${progressSegment}`;
    }

    _getGeneralExplanation(topic, context) {
        const topicKey = topic.toLowerCase().trim().replace(/^(a|an|the)\s+/, '');
        const definitions = {
            python: `Python is a high-level, interpreted programming language known for its simple, readable syntax. It supports procedural, object-oriented, and functional programming styles. Python is widely used in web development, data science, automation, scripting, and artificial intelligence. For example:\n\n\`python\`\nprint('Hello, world!')\n\`\`\`\n\nIndentation is meaningful in Python and defines the structure of code blocks such as loops and functions.`,
            javascript: `JavaScript is a programming language that runs in web browsers and on servers with Node.js. It is used to make web pages interactive, manage browser behavior, and build full-stack applications. JavaScript supports event-driven programming, functions as first-class values, and asynchronous operations using promises or async/await.`,

            html: `HTML (HyperText Markup Language) is the standard markup language for creating web pages. It uses tags like <html>, <head>, <body>, <p>, <a>, and <div> to structure text, links, images, and other content. Browsers read HTML to render pages for users.`,
            css: `CSS (Cascading Style Sheets) controls the visual styling of web pages. It applies colors, layout, spacing, fonts, and responsive design rules to HTML elements. CSS enables websites to look polished and consistent across different devices.`,
            algorithm: `An algorithm is a step-by-step set of instructions for solving a problem or completing a task. In programming, algorithms are used to sort data, search lists, calculate values, and make decisions. Good algorithms are efficient, easy to understand, and scale well for larger inputs.`,
            database: `A database stores organized data so applications can retrieve, update, and manage information efficiently. Common databases include relational systems like MySQL and PostgreSQL, and document-oriented systems like MongoDB. Databases support queries, indexing, and transactions to keep data consistent and secure.`,
            ai: `Artificial Intelligence (AI) is a field of computer science focused on creating systems that perform tasks requiring human-like intelligence. AI includes subfields such as natural language processing, computer vision, and machine learning, and it is used for chatbots, recommendation systems, and automation.`,
            'machine learning': `Machine learning enables computers to learn patterns from data without explicit programming. Models can classify, predict, or group information by training on examples. Popular techniques include regression, classification, clustering, and neural networks.`,
            'cloud computing': `Cloud computing delivers computing services like servers, storage, databases, networking, and software over the internet. It allows organizations to use remote resources on demand without managing physical hardware directly. Examples include AWS, Azure, and Google Cloud.`,
            'blockchain': `Blockchain is a decentralized ledger technology where transactions are stored in a linked chain of blocks. Each block is secured with cryptography, and the chain is maintained by a distributed network of participants. Blockchain is often used for cryptocurrencies, smart contracts, and secure record keeping.`,
            'cryptocurrency': `Cryptocurrency is a digital asset that uses cryptography to secure transactions and control the creation of new units. Bitcoin and Ethereum are popular examples. Cryptocurrencies typically run on blockchain networks and can be used for payments or investment.`,
            'data science': `Data science combines statistics, programming, and domain knowledge to extract insights from data. It includes collecting, cleaning, analyzing, and visualizing data so organizations can make better decisions. Tools commonly used in data science include Python, R, and machine learning libraries.`,
            'climate change': `Climate change refers to long-term shifts in temperature and weather patterns caused by natural processes and human activity. Burning fossil fuels releases greenhouse gases that trap heat in the atmosphere, leading to global warming, rising sea levels, and more extreme weather.`,
            'cybersecurity': `Cybersecurity is the practice of protecting computers, networks, and data from unauthorized access, attacks, and damage. It includes authentication, encryption, firewalls, secure coding, and monitoring to keep systems safe.`,
            'photosynthesis': `Photosynthesis is the process plants use to convert sunlight, water, and carbon dioxide into energy and oxygen. Chlorophyll captures sunlight, and the plant uses that energy to build sugars that fuel growth.`,
            'solar system': `The solar system consists of the Sun and the objects that orbit it, including eight planets, moons, asteroids, and comets. Gravity keeps these objects in stable orbits around the Sun.`,
            'electricity': `Electricity is the flow of electric charge through a conductor. It powers lights, appliances, and electronic devices. In circuits, electrons move from a power source through wires and return, creating useful energy.`,
            'internet': `The internet is a global network of computers and devices that communicate using standard protocols. It enables websites, email, video streaming, and online services by connecting billions of devices around the world.`,
            'operating system': `An operating system is the software that manages computer hardware and provides services for applications. Examples include Windows, macOS, Linux, and Android. It handles files, memory, processes, and device access.`,
            'network': `A network is a group of connected devices that share data and resources. Networks can be local, like a home Wi-Fi network, or global, like the internet. They use routers, switches, and protocols to send information securely.`,
            'history': `History is the study of past events, societies, people, and cultures. It helps us understand how decisions, conflicts, and inventions shaped the world we live in today.`,
            'geography': `Geography studies places, landscapes, climates, and how people interact with their environment. It includes physical geography like mountains and rivers, and human geography like cities and economies.`,
            'economics': `Economics examines how people and societies produce, distribute, and consume goods and services. It studies supply and demand, markets, resources, and how choices affect wealth and well-being.`,
            'mathematics': `Mathematics is the study of numbers, shapes, patterns, and relationships. It provides tools for solving problems in science, engineering, finance, and daily life.`,
            'physics': `Physics explores the laws of nature, energy, motion, forces, and matter. It explains how objects move, how light behaves, and how the universe is structured.`,
            'chemistry': `Chemistry studies substances, their properties, and how they react with one another. It explains why materials change during reactions and how new compounds are formed.`,
            'biology': `Biology is the study of living organisms, including their structure, function, growth, and evolution. It covers plants, animals, cells, genetics, and ecosystems.`,
            'nutrition': `Nutrition is the science of how food affects the body. It covers vitamins, minerals, macronutrients, hydration, and how eating habits support health, energy, and growth.`,
            'english': `English is a global language used for communication, business, and education. It includes grammar, vocabulary, reading, writing, listening, and speaking skills.`,
            'music': `Music is the art of organizing sounds to create rhythm, melody, harmony, and expression. It is used in culture, entertainment, and emotional communication.`,
            'art': `Art is creative expression through visual, auditory, or performance media. It includes painting, sculpture, design, literature, theater, and digital media. It helps people share ideas, emotions, and culture.`,
            'ecosystem': `An ecosystem is a community of living organisms interacting with each other and their physical environment. It includes plants, animals, microorganisms, water, soil, and climate. Healthy ecosystems recycle nutrients and support biodiversity.`,
            'gravity': `Gravity is a force that pulls objects toward each other. On Earth, gravity keeps us grounded and causes objects to fall. It also governs planetary motion and the behavior of celestial bodies in space.`,
            'renewable energy': `Renewable energy comes from natural sources that are constantly replenished, like sunlight, wind, water, and geothermal heat. It is cleaner than fossil fuels and helps reduce pollution and climate change.`,
            'democracy': `Democracy is a system of government where people have the power to choose their leaders and influence decisions. Citizens vote in elections, and the government is accountable to the public.`,
            'election': `An election is a formal process where people vote to choose leaders or decide on public policies. Elections are a key part of democratic systems and help ensure government reflects the will of the people.`,
            'civil rights': `Civil rights are the protections that ensure individuals are treated fairly and equally under the law. They include freedom of speech, the right to vote, and equal treatment regardless of race, gender, religion, or background.`
        };

        const capitals = {
            france: 'Paris',
            ethiopia: 'Addis Ababa',
            usa: 'Washington, D.C.',
            uk: 'London',
            germany: 'Berlin',
            india: 'New Delhi',
            japan: 'Tokyo',
            china: 'Beijing',
            canada: 'Ottawa',
            brazil: 'Brasília',
            kenya: 'Nairobi'
        };

        const people = {
            'albert einstein': `Albert Einstein was a German-born theoretical physicist who developed the theory of relativity. His work transformed our understanding of space, time, and energy, and he is one of the most influential scientists of the 20th century.`,
            'nelson mandela': `Nelson Mandela was a South African anti-apartheid leader and president who fought for equality and reconciliation. He spent 27 years in prison before leading South Africa's transition to democracy.`,
            'mohandas gandhi': `Mohandas Gandhi, also known as Mahatma Gandhi, led India's independence movement using nonviolent civil disobedience. His philosophy influenced civil rights and freedom movements around the world.`,
            'steve jobs': `Steve Jobs was a co-founder of Apple Inc. He helped build the personal computer industry and introduced iconic products such as the iPhone, iPad, and MacBook.`,
            'bill gates': `Bill Gates is a co-founder of Microsoft and a philanthropist. He helped popularize personal computing and later focused on global health, education, and technology initiatives through the Gates Foundation.`
        };

        if (definitions[topicKey]) {
            return this._applyStudentContext(definitions[topicKey], context);
        }

        if (topicKey.startsWith('capital of ')) {
            const place = topicKey.replace('capital of ', '').trim();
            const capital = capitals[place] || 'a major city that serves as the administrative center';
            const answer = `The capital of ${place.charAt(0).toUpperCase() + place.slice(1)} is ${capital}. Capitals are typically where a country\'s government buildings, official residences, and national institutions are located.`;
            return this._applyStudentContext(answer, context);
        }

        if (people[topicKey]) {
            return this._applyStudentContext(people[topicKey], context);
        }

        if (topicKey.includes('vs ') || topicKey.includes(' versus ') || topicKey.includes(' or ')) {
            return this._applyStudentContext(`${topic.charAt(0).toUpperCase() + topic.slice(1)} is a comparison question. When comparing two ideas, look at how they differ in purpose, strengths, and common use cases. In general, focus on what each option is best for, then choose the one that fits your needs.`, context);
        }

        const answer = `Here is a clear, student-friendly explanation of ${topic.charAt(0).toUpperCase() + topic.slice(1)}:\n\n` +
            `1. What it means: ${topicKey} is a topic or concept that often refers to the main idea behind the subject.\n` +
            `2. Why it matters: Understanding ${topicKey} helps you use it in practical situations, solve problems, or connect it with related ideas.\n` +
            `3. How to remember it: Break it into smaller parts, use examples, and compare it to other things you already know.\n\n` +
            `If you want, I can also give a specific example or apply this idea to a real-world scenario.`;

        return this._applyStudentContext(answer, context);
    }

    _getMockResponse(prompt, context) {
        const p = prompt.toLowerCase();
        const courseName = context?.courseName || 'your course';
        const lessonTag = context?.currentLessonTitle ? `the lesson ${context.currentLessonTitle}` : 'your current lesson';
        const progressText = context?.courseProgress ? `You are ${context.courseProgress}% through ${courseName}.` : '';
        const assignmentHint = context?.upcomingAssignmentsCount > 0
            ? `You have ${context.upcomingAssignmentsCount} upcoming assignment${context.upcomingAssignmentsCount > 1 ? 's' : ''}.`
            : 'There are no assignments due right now.';

        if (p.includes('what is python') || p.includes('define python') || p.includes('explain python') || p === 'python') {
            const answer = `Python is a high-level, interpreted programming language known for its clear syntax and readability. It supports multiple programming styles such as procedural, object-oriented, and functional programming. Python is commonly used for web development, data science, automation, scripting, and machine learning. A simple Python example is:\n\n\`python\`\nprint('Hello, world!')\n\`\`\`\n\nThis prints text to the screen; indentation is important in Python because it defines the structure of loops, functions, and conditionals.`;
            return this._applyStudentContext(answer, context);
        }

        if (this._isCodeSnippet(p)) {
            return this._applyStudentContext(this._getCodeExplanation(p, context), context);
        }

        if (/^(what is|who is|where is|when is|why is|how is|how are|define|describe|explain|tell me about)\b/.test(p)) {
            const topic = p.replace(/^(what is|who is|where is|when is|why is|how is|how are|define|describe|explain|tell me about)\s+/, '').replace(/[?]+$/, '').trim();
            return this._getGeneralExplanation(topic || p, context);
        }

        if (p.includes('summary')) {
            const answer = `Here is a summary for ${lessonTag}: We reviewed the key ideas, focused on practical examples, and reinforced the core concepts so you can apply them confidently. ${assignmentHint}`;
            return this._applyStudentContext(answer, context);
        }

        if (p.includes('quiz') || p.includes('practice')) {
            const answer = `Let's review ${courseName} together. I can generate a short practice quiz or help you drill the concepts from ${lessonTag}. ${assignmentHint}`;
            return this._applyStudentContext(answer, context);
        }

        if (p.includes('debug') || p.includes('code')) {
            const answer = `When debugging code in ${courseName}, start by isolating the smallest failing part. Describe the issue and I will help you step through the logic.`;
            return this._applyStudentContext(answer, context);
        }

        if (p.includes('translate') || p.includes('amharic') || p.includes('flashcards') || p.includes('study plan')) {
            const answer = `I can help with that too. Ask me to translate notes, make flashcards, or build a study plan for your lesson.`;
            return this._applyStudentContext(answer, context);
        }

        const answer = `I can answer your academic questions directly. Describe the topic, concept, or example you want explained, and I will respond clearly with a longer, student-friendly answer.`;
        return this._applyStudentContext(answer, context);
    }
}

module.exports = new AIService();
