import React, { useState } from 'react';
import { projectService } from '../../services/api';
import { useTheme } from '../../context/ThemeContext';

export default function TeamManager({ projectId, onTeamCreated }) {
    const { colors } = useTheme();
    const [name, setName] = useState('');
    const [inviteCode, setInviteCode] = useState('');

    const create = async () => {
        if (!name) return;
        const res = await projectService.createTeam({ projectId, name });
        if (res.data && res.data.success) onTeamCreated && onTeamCreated(res.data.data);
    };

    const join = async () => {
        if (!inviteCode) return;
        const res = await projectService.joinTeam({ inviteCode, teamId: '' });
        if (res.data && res.data.success) onTeamCreated && onTeamCreated(res.data.data);
    };

    return (
        <div style={{ background: colors.bgCard, padding: 12, borderRadius: 8, border: `1px solid ${colors.border}` }}>
            <h4 style={{ margin: 0, color: colors.text }}>Team</h4>
            <div style={{ marginTop: 8 }}>
                <input placeholder="Team name" value={name} onChange={e=>setName(e.target.value)} style={{ width: '100%', padding: 8, borderRadius: 6, border: `1px solid ${colors.border}`, background: colors.bgInput }} />
                <button onClick={create} style={{ marginTop: 8, background: colors.primary, color: '#fff', padding: '8px 12px', border: 'none', borderRadius: 6 }}>Create Team</button>
            </div>
            <div style={{ marginTop: 12 }}>
                <input placeholder="Invite code" value={inviteCode} onChange={e=>setInviteCode(e.target.value)} style={{ width: '100%', padding: 8, borderRadius: 6, border: `1px solid ${colors.border}`, background: colors.bgInput }} />
                <button onClick={join} style={{ marginTop: 8, background: colors.primary, color: '#fff', padding: '8px 12px', border: 'none', borderRadius: 6 }}>Join Team</button>
            </div>
        </div>
    );
}
