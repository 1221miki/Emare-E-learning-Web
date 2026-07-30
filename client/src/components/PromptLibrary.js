import React, { useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import { promptLibrary } from '../promptLibrary';

export default function PromptLibrary({ onSelectPrompt }) {
    const { colors } = useTheme();
    const [activeCategory, setActiveCategory] = useState(promptLibrary[0]?.id || '');
    const category = promptLibrary.find((item) => item.id === activeCategory) || promptLibrary[0];

    return (
        <section style={{ background: colors.bgCard, border: `1px solid ${colors.border}`, borderRadius: '20px', padding: '24px', marginTop: '32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', flexWrap: 'wrap' }}>
                <div>
                    <h2 style={{ fontSize: '20px', color: colors.text, margin: 0, fontWeight: '900' }}>Prompt Library for Students</h2>
                    <p style={{ color: colors.textMuted, fontSize: '14px', margin: '10px 0 0', maxWidth: '620px' }}>Select a responsibility category to explore ready-to-use prompts, reminders, and instructional messages that help you stay on track.</p>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px', flex: '1 1 320px' }}>
                    {promptLibrary.slice(0, 6).map((item) => (
                        <button
                            key={item.id}
                            type="button"
                            onClick={() => setActiveCategory(item.id)}
                            style={{
                                borderRadius: '12px',
                                border: activeCategory === item.id ? `2px solid ${colors.primary}` : `1px solid ${colors.border}`,
                                background: activeCategory === item.id ? `${colors.primary}15` : colors.bgInput,
                                color: activeCategory === item.id ? colors.primary : colors.text,
                                padding: '12px 14px',
                                cursor: 'pointer',
                                fontWeight: 700,
                                textAlign: 'left'
                            }}
                        >
                            {item.title}
                        </button>
                    ))}
                </div>
            </div>

            <div style={{ marginTop: '28px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', gap: '12px' }}>
                    <div>
                        <h3 style={{ fontSize: '16px', color: colors.text, margin: 0, fontWeight: '800' }}>{category.title}</h3>
                        <p style={{ color: colors.textMuted, fontSize: '13px', margin: '8px 0 0' }}>{category.description}</p>
                    </div>
                    <span style={{ color: colors.textMuted, fontSize: '12px', padding: '8px 12px', borderRadius: '999px', background: colors.bgInput, border: `1px solid ${colors.border}` }}>
                        {category.prompts.length} prompts available
                    </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '14px' }}>
                    {category.prompts.map((promptText, idx) => (
                        <button
                            key={`${category.id}-${idx}`}
                            type="button"
                            onClick={() => onSelectPrompt(promptText)}
                            style={{
                                textAlign: 'left',
                                borderRadius: '16px',
                                border: `1px solid ${colors.border}`,
                                background: colors.bgInput,
                                padding: '16px',
                                cursor: 'pointer',
                                color: colors.text,
                                fontSize: '13px',
                                boxShadow: '0 8px 18px rgba(0,0,0,0.03)',
                                lineHeight: 1.6,
                                minHeight: '88px',
                                transition: 'transform 0.15s ease, border-color 0.15s ease'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'translateY(-2px)';
                                e.currentTarget.style.borderColor = colors.primary;
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.borderColor = colors.border;
                            }}
                        >
                            {promptText}
                        </button>
                    ))}
                </div>
            </div>
        </section>
    );
}
