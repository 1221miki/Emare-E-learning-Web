import React, { useEffect, useState } from 'react';
import { certificateService } from '../../services/api';
import { useParams } from 'react-router-dom';

export default function CertificateView(){
    const { id } = useParams();
    const [data, setData] = useState(null);

    useEffect(()=>{ certificateService.verifyPublic(id).then(r=>setData(r.data.data)).catch(()=>{}); }, [id]);

    if (!data) return <div>Loading...</div>;

    return (
        <div style={{ padding: 12 }}>
            <h2>Certificate Verification</h2>
            <div><strong>Certificate ID:</strong> {data.certificateId}</div>
            <div><strong>Student:</strong> {data.studentName}</div>
            <div><strong>Course:</strong> {data.course}</div>
            <div><strong>Issuer:</strong> {data.issuer}</div>
            <div><strong>Status:</strong> {data.status}</div>
        </div>
    );
}
