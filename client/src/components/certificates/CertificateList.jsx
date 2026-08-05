import React, { useEffect, useState } from 'react';
import { certificateService } from '../../services/api';
import { useTheme } from '../../context/ThemeContext';

export default function CertificateList() {
    const [certs, setCerts] = useState([]);
    const { colors } = useTheme();

    useEffect(() => { certificateService.myCertificates().then(r => setCerts(r.data.data || [])).catch(()=>{}); }, []);

    return (
        <div style={{ padding: 12, background: colors.bgCard, borderRadius: 8 }}>
            <h4>My Certificates</h4>
            {certs.length === 0 ? <div style={{ color: colors.textMuted }}>No certificates yet.</div> : certs.map(c=> (
                <div key={c._id} style={{ display: 'flex', justifyContent: 'space-between', padding: 8, borderBottom: `1px solid ${colors.border}` }}>
                    <div>
                        <div style={{ fontWeight: 700 }}>{c.certificateId}</div>
                        <div style={{ fontSize: 13 }}>{c.courseRef && (c.courseRef.courseTitle || c.courseRef.title)}</div>
                    </div>
                    <div>
                        <a href={`/student/certificates/view/${c.certificateId}`} style={{ marginRight: 8 }}>View</a>
                        <a href={`/api/certificates/download/${c.certificateId}`}>Download</a>
                    </div>
                </div>
            ))}
        </div>
    );
}
