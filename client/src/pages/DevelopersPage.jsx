import React from 'react';
import Navbar from '../components/Navbar';
import { useTheme } from '../context/ThemeContext';

const DEVELOPERS = [
    {
        name: 'Fawaz Bekele',
        title: 'Full Stack Developer',
        skills: ['Angular', '.NET', 'HTML/CSS', 'PHP', 'Bootstrap', 'MySQL', 'Node.js', 'GitHub'],
        summary: 'Experienced developer with a strong background in Angular and .NET, delivering robust enterprise solutions and maintaining collaborative code practices.',
        experiences: [
            { period: 'June 2023 - Feb 2024', title: 'Software Developer', company: 'Ethiopian Commodity Exchange', description: 'Developed web apps with Angular and .NET. Optimized SQL queries for data management. Used GitHub for version control and documented features for future use.' },
            { period: 'Apr 2024 - Present', title: 'Application Developer', company: 'Lion International Bank', description: 'Built full-stack apps with Angular, .NET and SQL Server. Integrated APIs, used Docker and Kubernetes for deployment, and collaborated on GitHub for code reviews.' }
        ]
    },
    {
        name: 'Solomon Legesse',
        title: 'Full Stack Developer',
        skills: ['Node.js', 'React', 'PHP/Laravel', 'Python/Flask', 'Springboot', 'Angular', 'GitHub'],
        summary: 'A versatile backend and frontend engineer focused on building scalable systems using modern JavaScript and Python frameworks.',
        experiences: [
            { period: 'Feb 2022 - Jan 2022', title: 'ALX Software Engineering Program', company: 'ALX', description: 'Completed a 12-month intensive program in backend development with Python and Django. Built multiple projects, gained hands-on experience, and used Git for version control.' },
            { period: 'Mar 2024 - Aug 2024', title: 'MERN Stack Training', company: 'Yeneta IT', description: 'Participated in a hands-on MERN Stack training program, working on real-world projects with MongoDB, Express.js, React, and Node.js.' },
            { period: 'Sep 2024 - Present', title: 'Freelance Web Developer', company: 'Independent', description: 'Designed and deployed modern websites for clients using clean UI and efficient backend services. Delivered tailored solutions with a strong focus on functionality.' }
        ]
    },
    {
        name: 'Natawal Zeithu',
        title: 'Full Stack Developer / IT Professional',
        skills: ['Node.js', 'React', 'PHP', 'Flutter', 'WordPress', 'SEO', 'MySQL', 'MongoDB', 'Cybersecurity', 'GitHub'],
        summary: 'A developer and IT professional with experience delivering secure web applications, managing infrastructure, and leading digital transformation initiatives.',
        experiences: [
            { period: 'Dec 2022 - Present', title: 'IT Director', company: 'Allure Communication', description: 'Led IT strategy, optimized software and hardware infrastructure, and supported the development of applications like "Enat" and "Mistrir" for digital health and tracking.' },
            { period: 'Sep 2024 - Present', title: 'Full Stack Developer', company: 'Primeco Technologies PLC', description: 'Developed EthioEinstein, a gaming marketplace platform. Built reusable deliverables with Node.js, React, and API integrations.' },
            { period: 'Aug 2023 - Present', title: 'Full Stack Development Lecturer', company: 'Gobeze Training Center', description: 'Created course materials and delivered comprehensive instruction in full stack development to help students succeed in software careers.' },
            { period: 'Mar 2021 - May 2022', title: 'Mobile Application Developer', company: 'Engida Travel and Technology', description: 'Enhanced user experiences through innovative app features and collaborative code review practices.' }
        ]
    },
    {
        name: 'Filiget Shewa',
        title: 'Full Stack Developer',
        skills: ['Go', 'Angular', 'Node.js', 'React', 'MySQL', 'MongoDB', 'Postgres', 'HTML/CSS', 'Java', 'Springboot', 'GitHub'],
        summary: 'Front-to-back software engineer experienced in building scalable web systems with modern backend frameworks, cloud infrastructure, and responsive UI design.',
        experiences: [
            { period: 'Dec 2022 - Jan 2023', title: 'Application Developer Trainee', company: 'DAN Energy', description: 'Gained experience in application development, working with Node.js and Express. Built a knowledge-sharing environment and learned professional software delivery standards.' },
            { period: 'Jun 2023 - Feb 2024', title: 'Full Stack Developer', company: 'Ethiopian Commodity Exchange (ECC)', description: 'Delivered web applications using .NET and Angular. Worked closely with cross-functional teams to build high-quality products and ensured cross-browser compatibility.' },
            { period: 'Feb 2024 - Present', title: 'Full Stack Developer', company: 'Two Capital', description: 'Developed backend systems with Go and Node.js. Used containers and cloud deployments to improve application performance and reliability.' }
        ]
    },
    {
        name: 'Samuel B',
        title: 'Mobile & Web App Developer',
        skills: ['Node.js', 'React', 'Angular', 'Flutter', '.NET', 'Python', 'MySQL', 'MongoDB', 'Postgres'],
        summary: 'Application developer focused on building mobile and web experiences with modern cross-platform frameworks and backend services.',
        experiences: [
            { period: 'Aug 2024 - Nov 2024', title: 'Full-Stack Developer', company: 'Taptopion.com', description: 'Developed new features for a system frontend and backend. Worked across React and Go backend components.' },
            { period: 'Jul 2023 - Jun 2024', title: 'Software Developer and System Admin', company: 'Unity University', description: 'Maintained WordPress sites, managed asset servers, and supported technical operations for student platforms.' },
            { period: 'Feb 2024 - Present', title: 'Software Developer', company: 'Center for Adolescent Girls Health', description: 'Designed and implemented user-friendly applications on WordPress and React, focused on quality control and UX testing.' },
            { period: 'Aug 2023 - Sept 2023', title: 'Guideline For Midwives Flutter Application', company: 'Freelance', description: 'Built a Midwives Guide application using Flutter and React, focusing on usability and user-centered design.' }
        ]
    },
    {
        name: 'Robel Alemayehu',
        title: 'Full Stack Developer',
        skills: ['Android/Kotlin', 'Python/Django', 'JavaScript', 'PHP', 'HTML/CSS', 'Cloud (GCP, AWS)', 'SQL', 'Postgres', 'MongoDB', 'Linux Desktop App', 'GitHub'],
        summary: 'Developer specializing in full stack and cloud solutions with experience across mobile, web, and desktop platforms.',
        experiences: [
            { period: 'May 2023 - Oct 2023', title: 'Health Management Web Application', company: 'Freelance', description: 'Developed a healthcare management system with React and .NET for clinic operations.' },
            { period: 'Aug 2023 - Sept 2023', title: 'E-Commerce Web Application', company: 'Freelance', description: 'Built a customer-facing ecommerce application with React and .NET, implementing product flows and checkout logic.' },
            { period: 'Feb 2024 - Present', title: 'Software Developer', company: 'Prime Technologies PLC', description: 'Connected users with tailored services through a modern marketplace platform using React, Node.js, and cloud services.' }
        ]
    }
];

export default function DevelopersPage() {
    const { colors } = useTheme();
    const [activeDetail, setActiveDetail] = React.useState(null);

    const styles = {
        page: { minHeight: '100vh', fontFamily: "'Outfit', 'Inter', sans-serif", background: colors.bg, color: colors.text },
        hero: { padding: '100px 5% 40px', textAlign: 'center' },
        heroLabel: { color: colors.primary, fontSize: '13px', letterSpacing: '0.2em', fontWeight: '800', textTransform: 'uppercase', marginBottom: '16px' },
        heroTitle: { fontSize: '44px', fontWeight: '900', lineHeight: '1.05', margin: '0 auto 18px', maxWidth: '860px' },
        heroSubtitle: { color: colors.textMuted, fontSize: '17px', lineHeight: '1.8', maxWidth: '720px', margin: '0 auto' },
        grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', padding: '40px 5%', maxWidth: '1400px', margin: '0 auto 80px' },
        card: { background: colors.bgCard, border: `1px solid ${colors.primary}33`, borderRadius: '24px', padding: '28px', display: 'flex', flexDirection: 'column', gap: '18px', minHeight: '320px' },
        cardHeader: { display: 'flex', alignItems: 'center', gap: '14px' },
        avatar: { width: '58px', height: '58px', borderRadius: '18px', background: colors.primary, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: '900' },
        devName: { margin: '0', fontSize: '20px', fontWeight: '800', color: colors.text },
        devTitle: { margin: '4px 0 0', fontSize: '13px', letterSpacing: '0.04em', color: colors.textMuted, fontWeight: '700', textTransform: 'uppercase' },
        skillsLabel: { marginTop: '18px', marginBottom: '12px', color: colors.text, letterSpacing: '0.16em', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase' },
        skills: { display: 'flex', flexWrap: 'wrap', gap: '10px' },
        skillTag: { background: colors.bgInput, border: `1px solid ${colors.primary}33`, borderRadius: '999px', color: colors.text, padding: '10px 14px', fontSize: '12px', fontWeight: '700' },
        button: { marginTop: 'auto', alignSelf: 'flex-start', padding: '12px 24px', borderRadius: '14px', border: `1px solid ${colors.primary}`, background: 'transparent', color: colors.primary, fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s ease' },
        buttonHover: { background: colors.primary, color: colors.bg, borderColor: colors.primary },
        detailPanel: { background: colors.bg, border: `1px solid ${colors.border}`, borderRadius: '20px', padding: '24px', marginTop: '18px', color: colors.text, boxShadow: '0 20px 45px rgba(0,0,0,0.12)' },
        detailHeading: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', marginBottom: '16px' },
        detailTitle: { margin: 0, fontSize: '18px', fontWeight: '800', color: colors.text },
        detailPeriod: { color: colors.textMuted, fontSize: '13px', fontWeight: '600' },
        detailDescription: { color: colors.textMuted, fontSize: '14px', lineHeight: 1.8, marginTop: '10px' },
        detailItem: { marginBottom: '20px' },
        closeButton: { marginLeft: 'auto', padding: '8px 16px', borderRadius: '12px', border: `1px solid ${colors.border}`, background: colors.bgCard, color: colors.text, cursor: 'pointer', fontWeight: '700' },
        modalOverlay: { position: 'fixed', inset: 0, backgroundColor: 'rgba(0, 0, 0, 0.65)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', overflowY: 'auto' },
        modal: { width: 'min(100%, 720px)', maxWidth: '720px', maxHeight: '90vh', background: colors.bgCard, borderRadius: '30px', border: `1px solid ${colors.border}`, padding: '28px', boxShadow: '0 30px 90px rgba(0,0,0,0.28)', position: 'relative', overflowY: 'auto' },
        modalHeader: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '24px', marginBottom: '24px', flexWrap: 'wrap' },
        modalTitle: { margin: 0, fontSize: '24px', fontWeight: '900', color: colors.text },
        modalSubtitle: { margin: '10px 0 0', color: colors.textMuted, fontSize: '14px', lineHeight: 1.8, maxWidth: '100%' },
        modalContent: { display: 'grid', gap: '18px' },
        modalSection: { display: 'grid', gap: '12px' },
        sectionTitle: { margin: 0, fontSize: '16px', fontWeight: '800', color: colors.text },
        sectionText: { margin: 0, color: colors.textMuted, fontSize: '14px', lineHeight: 1.8 },
        modalClose: { position: 'absolute', top: '22px', right: '22px', width: '44px', height: '44px', borderRadius: '14px', border: `1px solid ${colors.border}`, background: colors.bg, color: colors.text, cursor: 'pointer', fontWeight: '800' }
    };

    return (
        <div style={styles.page}>
            <Navbar />
            <div style={styles.hero}>
                <div style={styles.heroLabel}>EMARE DEVELOPERS</div>
                <h1 style={styles.heroTitle}>Let's Introduce Our Developer</h1>
                <p style={styles.heroSubtitle}>Meet the Emare development team behind the platform. Each developer brings technical depth, creative problem solving, and a commitment to building products that serve learners across Ethiopia.</p>
            </div>

            <div style={styles.grid}>
                {DEVELOPERS.map((dev, index) => (
                    <div key={index} style={styles.card}>
                        <div style={styles.cardHeader}>
                            <div style={styles.avatar}>{dev.name.split(' ').map(word => word[0]).join('').slice(0, 2)}</div>
                            <div>
                                <h2 style={styles.devName}>{dev.name}</h2>
                                <div style={styles.devTitle}>{dev.title}</div>
                            </div>
                        </div>
                        <div style={styles.skills}>
                            {dev.skills.map((skill, idx) => (
                                <span key={idx} style={styles.skillTag}>{skill}</span>
                            ))}
                        </div>
                        <button
                            style={styles.button}
                            onClick={() => setActiveDetail(index)}
                        >
                            Detail
                        </button>
                    </div>
                ))}
            </div>

            {activeDetail !== null ? (
                <div style={styles.modalOverlay} onClick={() => setActiveDetail(null)}>
                    <div style={styles.modal} onClick={e => e.stopPropagation()}>
                        <button style={styles.modalClose} onClick={() => setActiveDetail(null)}>×</button>
                        <div style={styles.modalHeader}>
                            <div>
                                <h2 style={styles.modalTitle}>{DEVELOPERS[activeDetail].name}</h2>
                                <p style={styles.modalSubtitle}>{DEVELOPERS[activeDetail].title}</p>
                            </div>
                        </div>
                        <div style={styles.modalSection}>
                            <h3 style={styles.sectionTitle}>Skills</h3>
                            <div style={styles.skills}>
                                {DEVELOPERS[activeDetail].skills.map((skill, idx) => (
                                    <span key={idx} style={styles.skillTag}>{skill}</span>
                                ))}
                            </div>
                        </div>
                        <div style={styles.modalContent}>
                            <div style={styles.modalSection}>
                                <h3 style={styles.sectionTitle}>Summary</h3>
                                <p style={styles.sectionText}>{DEVELOPERS[activeDetail].summary}</p>
                            </div>
                            <div style={styles.modalSection}>
                                <h3 style={styles.sectionTitle}>Experience</h3>
                                {DEVELOPERS[activeDetail].experiences.map((exp, expIndex) => (
                                    <div key={expIndex} style={{ marginBottom: '18px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
                                            <span style={styles.sectionTitle}>{exp.title}</span>
                                            <span style={styles.detailPeriod}>{exp.period}</span>
                                        </div>
                                        <p style={{ ...styles.sectionText, margin: '6px 0 0' }}><strong>{exp.company}</strong> — {exp.description}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
    );
}
