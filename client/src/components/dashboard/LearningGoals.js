import React, { useState, useEffect } from 'react';
import { useTheme } from '../../context/ThemeContext';

const STORAGE_KEY = 'student_learning_goals';

export default function LearningGoals() {
    const { colors } = useTheme();
    const [goals, setGoals] = useState([]);
    const [text, setText] = useState('');

    useEffect(() => {
        const s = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
        setGoals(s);
    }, []);

    const addGoal = (e) => {
        e.preventDefault();
        if (!text) return;
        const next = [{ id: Date.now(), text, completed: false }, ...goals];
        setGoals(next);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        setText('');
    };

    const toggle = (id) => {
        const next = goals.map(g => g.id === id ? { ...g, completed: !g.completed } : g);
        setGoals(next);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    };

    return (
        <div style={{ background: colors.bgCard, border: `1px solid ${colors.border}`, borderRadius: 14, padding: 16 }}>
            <h4 style={{ margin: 0, color: colors.text, fontSize: 16, fontWeight: 900 }}>Learning Goals</h4>
            <p style={{ margin: '6px 0 12px', color: colors.textMuted, fontSize: 13 }}>Set daily or weekly targets and mark progress.</p>

            <form onSubmit={addGoal} style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                <input value={text} onChange={e => setText(e.target.value)} placeholder="Add a new goal, e.g. 1 hour study" style={{ flex: 1, padding: '8px 10px', borderRadius: 8, border: `1px solid ${colors.border}`, background: colors.bgInput, color: colors.text }} />
                <button style={{ background: colors.primary, border: 'none', color: '#fff', padding: '8px 12px', borderRadius: 8, fontWeight: 800 }}>Add</button>
            </form>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {goals.length === 0 ? (
                    <div style={{ color: colors.textMuted, fontSize: 13 }}>No goals set. Create one to start tracking your progress.</div>
                ) : goals.map(g => (
                    <div key={g.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: colors.bgInput, padding: 10, borderRadius: 10, border: `1px solid ${colors.border}` }}>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            <button onClick={() => toggle(g.id)} style={{ background: g.completed ? colors.success : 'transparent', color: g.completed ? '#fff' : colors.textMuted, border: `1px solid ${colors.border}`, borderRadius: 8, padding: '6px 8px', cursor: 'pointer' }}>{g.completed ? '✓' : '○'}</button>
                            <div style={{ color: g.completed ? colors.textMuted : colors.text, fontWeight: 700 }}>{g.text}</div>
                        </div>
                        <div style={{ fontSize: 12, color: colors.textMuted }}>{g.completed ? 'Done' : 'Pending'}</div>
                    </div>
                ))}
            </div>
        </div>
    );
}
