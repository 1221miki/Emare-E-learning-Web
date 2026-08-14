import React, { useEffect, useState } from 'react';
import { certificateService } from '../../services/api.jsx';
import { useTheme } from '../../context/ThemeContext';

export default function CertificateList() {
    const [certs, setCerts]           = useState([]);
    const [downloading, setDownloading] = useState(null);
    const { colors }                  = useTheme();

    useEffect(() => {
        certificateService.getMine()
            .then(r => setCerts(r.data?.data || []))
            .catch(() => {});
    }, []);

    const handleDownload = async (cert) => {
        setDownloading(cert._id);
        try {
            const res  = await certificateService.download(cert._id, { responseType: 'blob' });
            const blob = new Blob([res.data], { type: 'application/pdf' });
            const url  = URL.createObjectURL(blob);
            const a    = document.createElement('a');
            a.href     = url;
            a.download = `${cert.certificateId || cert.certificateNumber || cert._id}.pdf`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (err) {
            console.error('[CertificateList] download failed:', err);
            alert('Download failed. Please try again.');
        } finally {
            setDownloading(null);
        }
    };

    return (
        <div style={{ padding: 12, background: colors.bgCard, borderRadius: 8 }}>
            <h4 style={{ color: colors.text, margin: '0 0 10px' }}>My Certificates</h4>
            {certs.length === 0 ? (
                <div style={{ color: colors.textMuted, fontSize: 13 }}>No certificates yet.</div>
            ) : (
                certs.map(c => (
                    <div key={c._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 4px', borderBottom: `1px solid ${colors.border}` }}>
                        <div>
                            <div style={{ fontWeight: 700, fontSize: 13, color: colors.text, fontFamily: 'monospace' }}>
                                {c.certificateId || c.certificateNumber}
                            </div>
                            <div style={{ fontSize: 12, color: colors.textMuted }}>
                                {c.courseRef?.courseTitle || c.courseRef?.title || 'Course'}
                            </div>
                        </div>
                        <button
                            onClick={() => handleDownload(c)}
                            disabled={downloading === c._id}
                            style={{
                                background: downloading === c._id ? colors.textMuted : 'linear-gradient(135deg,#10b981,#059669)',
                                color: '#fff', border: 'none', borderRadius: 6,
                                padding: '6px 14px', fontSize: 12, fontWeight: 700,
                                cursor: downloading === c._id ? 'not-allowed' : 'pointer'
                            }}
                        >
                            {downloading === c._id ? 'Downloading…' : '⬇ Download'}
                        </button>
                    </div>
                ))
            )}
        </div>
    );
}
