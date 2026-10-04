import React from 'react';
import Navbar from '../components/Navbar';
import DeveloperSection from '../components/DeveloperSection';
import SiteFooter from '../components/SiteFooter';

export default function DevelopersPage() {
    return (
        <div style={{ minHeight: '100vh' }}>
            <Navbar />
            <DeveloperSection />
            <SiteFooter />
        </div>
    );
}
