// @desc    Ask a question to the AI TutorBot
// @route   POST /api/ai/ask
// @access  Private/Student
exports.askTutor = async (req, res) => {
    try {
        const { question, courseContext } = req.body;
        
        if (!question) {
            return res.status(400).json({ success: false, message: 'Please provide a question' });
        }

        // --- Mock AI Response for Phase 5 ---
        // In a real production scenario, you would integrate OpenAI or Gemini APIs here.
        // e.g. const response = await openai.chat.completions.create({...})
        
        // Wait 1.5 seconds to simulate AI processing time
        await new Promise(resolve => setTimeout(resolve, 1500));

        const mockResponses = [
            "That's a great question! Based on the course material, you should focus on understanding the core fundamentals first. Let me know if you need a step-by-step breakdown.",
            "I can help with that. The concept you're asking about is closely related to what was covered in Chapter 2. Would you like me to summarize that section for you?",
            "Good catch. In enterprise-grade applications, we typically handle this by abstracting the logic into a separate service layer. Try implementing it that way!",
            "I'm Emare TutorBot! While I'm just a mock right now, in the future I will analyze your specific course transcripts to give you the perfect answer."
        ];

        const randomReply = mockResponses[Math.floor(Math.random() * mockResponses.length)];

        res.status(200).json({
            success: true,
            data: {
                answer: `[AI Tutor]: ${randomReply}\n\n(Context: ${courseContext || 'General'})`,
                timestamp: new Date()
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
