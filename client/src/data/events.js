const pad = (n) => String(n).padStart(2, '0');

export const eventGallery = [
    { src: '/images/hero-students.png', label: 'Live class session' },
    { src: '/images/education-hero.jpg', label: 'Onboarding workshop' },
    { src: '/images/contact.jpg', label: 'Community meetup' },
    { src: '/images/perfectEmarelogo.jpg', label: 'Awards ceremony' },
    { src: '/images/home.avif', label: 'Masterclass panel' },
];

export const formatISODate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const formatLongDate = (d) =>
    d.toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' });