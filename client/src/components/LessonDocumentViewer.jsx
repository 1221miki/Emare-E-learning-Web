import React from 'react';
import { useTheme } from '../context/ThemeContext';

export default function LessonDocumentViewer({ file, onClose }) {
    const { colors } = useTheme();
    if (!file || !file.url) return null;

    const fileUrl = file.url;
    const extension = (file.fileType || fileUrl.split('.').pop() || '').toLowerCase();
    const isPdf = extension === 'pdf' || fileUrl.toLowerCase().includes('.pdf');
    const viewerUrl = isPdf
        ? fileUrl
        : `https://docs.google.com/gview?url=${encodeURIComponent(fileUrl)}&embedded=true`;

    return (
        <div style={{ background: colors.bgCard, border: `1px solid ${colors.border}`, borderRadius: '18px', overflow: 'hidden', minHeight: '380px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: `1px solid ${colors.border}` }}>
                <div>
                    <h3 style={{ margin: 0, color: colors.text, fontSize: '16px', fontWeight: '800' }}>{file.name || 'Document Viewer'}</h3>
                    <span style={{ color: colors.textMuted, fontSize: '12px' }}>{extension.toUpperCase()} · {file.fileSize || 'View online'}</span>
                </div>
                {onClose && (
                    <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: colors.textMuted, cursor: 'pointer', fontSize: '18px' }}></button>
                )}
            </div>
            <div style={{ width: '100%', height: 'calc(100% - 72px)', minHeight: '320px', background: '#000' }}>
                <iframe
                    title={file.name || 'document-viewer'}
                    src={viewerUrl}
                    style={{ width: '100%', height: '100%', border: 'none' }}
                />
            </div>
        </div>
    );
}
