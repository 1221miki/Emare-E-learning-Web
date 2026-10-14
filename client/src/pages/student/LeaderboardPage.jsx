import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function LeaderboardPage() {
    const navigate = useNavigate();

    useEffect(() => {
        navigate('/student/dashboard', { replace: true });
    }, [navigate]);

    return null;
}
