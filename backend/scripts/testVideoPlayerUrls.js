const { getVideoEmbedUrl, getLessonVideoUrl } = require('../../client/src/utils/videoPlayer.js');

const sampleLessons = [
    { title: 'AI for Everyone', url: 'https://www.youtube.com/watch?v=JMUxmLyrhSk' },
    { title: 'Machine Learning Basics', url: 'https://www.youtube.com/watch?v=i_LwzRVP7bg' },
    { title: 'Deep Learning Fundamentals', url: 'https://www.youtube.com/watch?v=VyWAvY2CF9c' },
    { title: 'Project Management Fundamentals', url: 'https://www.youtube.com/watch?v=d_HscB9X_mg' },
    { title: 'Principles of Management', url: 'https://www.youtube.com/watch?v=13_fV-ZlPsc' },
    { title: 'Business Strategy Basics', url: 'https://www.youtube.com/watch?v=7u3S2_E4M5A' },
    { title: 'Cloud Computing Basics', url: 'https://www.youtube.com/watch?v=2LaAJq1lB4U' },
    { title: 'AWS Certified Cloud Practitioner', url: 'https://www.youtube.com/watch?v=3hLmDS179YE' },
    { title: 'Introduction to Azure', url: 'https://www.youtube.com/watch?v=NKEFWyqJxa4' },
    { title: 'Cyber Security Course for Beginners', url: 'https://www.youtube.com/watch?v=z5nc9MDbvkw' },
    { title: 'Ethical Hacking Full Course', url: 'https://www.youtube.com/watch?v=3Kq1MIfTWCE' },
    { title: 'Network Security Basics', url: 'https://www.youtube.com/watch?v=U_P23uqU4CA' },
    { title: 'Data Science for Beginners', url: 'https://www.youtube.com/watch?v=-ETQ97mXXF0' },
    { title: 'Python for Data Science', url: 'https://www.youtube.com/watch?v=LHBE6Q9XlzI' },
    { title: 'Data Analysis with Pandas & Python', url: 'https://www.youtube.com/watch?v=r-uOLxNrNk8' },
    { title: 'Database Design Course', url: 'https://www.youtube.com/watch?v=ztHopE5Wnpc' },
    { title: 'SQL Tutorial - Full Course', url: 'https://www.youtube.com/watch?v=HXV3zeQKqGY' },
    { title: 'MongoDB Complete Tutorial', url: 'https://www.youtube.com/watch?v=c2M-rlkkT5o' },
    { title: 'DevOps Beginners Course', url: 'https://www.youtube.com/watch?v=hQcFE0RD0cQ' },
    { title: 'Docker Tutorial for Beginners', url: 'https://www.youtube.com/watch?v=17482_K-GGE' },
    { title: 'Git Lab & CI/CD Pipeline Basics', url: 'https://www.youtube.com/watch?v=6YZvp2GwT0A' },
    { title: 'Graphic Design Basics', url: 'https://www.youtube.com/watch?v=dFSia1LZI4Y' },
    { title: 'UI/UX Design Essentials', url: 'https://www.youtube.com/watch?v=Sn2434J64r8' },
    { title: 'Photoshop Tutorial for Beginners', url: 'https://www.youtube.com/watch?v=3q3FV65ZrUs' }
];

console.log('--- Testing Video Player URL Parsing & Iframe Embed Conversion ---');
let passed = 0;
sampleLessons.forEach((item, index) => {
    const rawUrl = getLessonVideoUrl({ videoUrl: item.url });
    const embedUrl = getVideoEmbedUrl(rawUrl);
    const isValidEmbed = embedUrl.startsWith('https://www.youtube.com/embed/');
    console.log(`[Lesson ${index + 1}] ${item.title}`);
    console.log(`   - Original URL: ${item.url}`);
    console.log(`   - Embed Iframe URL: ${embedUrl}`);
    console.log(`   - Status: ${isValidEmbed ? '✅ VALID EMBED IFRAME' : '❌ INVALID'}\n`);
    if (isValidEmbed) passed++;
});

console.log(`🎉 Results: ${passed}/${sampleLessons.length} Video URLs successfully parsed to iframe embed format!`);
