import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { userService } from '../../services/api';
import Sidebar from '../../components/Sidebar';
import { useTheme } from '../../context/ThemeContext';

export default function AdminUserProfilePage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { colors } = useTheme();
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        let active = true;
        const fetchUser = async () => {
            setLoading(true);
            setError('');
            try {
                const res = await userService.getById(id);
                if (active) setUser(res.data?.data || null);
            } catch (err) {
                if (active) setError(err.response?.data?.message || 'Failed to load user profile.');
            } finally {
                if (active) setLoading(false);
            }
        };

        fetchUser();
        return () => { active = false; };
    }, [id]);

    const styles = {
        page: { minHeight: '100vh', display: 'flex', background: colors.bg },
        main: { flex: 1, padding: '48px', maxWidth: '1200px', margin: '0 auto', marginLeft: '260px' },
        card: { background: colors.bgCard, border: `1px solid ${colors.border}`, borderRadius: '24px', padding: '32px', marginBottom: '28px' },
        header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', marginBottom: '28px' },
        title: { fontSize: '28px', fontWeight: '800', margin: 0, color: colors.text },
        subtitle: { color: colors.textMuted, margin: 0 },
        backBtn: { background: 'transparent', border: 'none', color: colors.primary, fontSize: '14px', cursor: 'pointer', fontWeight: '700' },
        row: { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '20px' },
        field: { display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '18px' },
        label: { color: colors.textMuted, fontSize: '13px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' },
        value: { color: colors.text, fontSize: '16px', fontWeight: '600' },
        badge: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: '999px', padding: '8px 14px', fontSize: '12px', fontWeight: '700' },
        sectionTitle: { fontSize: '18px', fontWeight: '800', marginBottom: '18px', color: colors.text },
        sectionBody: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }
    };

    const renderStatusBadge = () => {
        if (!user) return null;
        if (!user.isActive) {
            return <span style={{ ...styles.badge, background: `${colors.danger}15`, color: colors.danger }}>Suspended</span>;
        }
        return <span style={{ ...styles.badge, background: `${colors.success}15`, color: colors.success }}>Active</span>;
    };

    if (loading) {
        return (
            <div style={styles.page}>
                <Sidebar />
                <main style={styles.main}>
                    <div style={styles.card}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: colors.textMuted }}>
                            <Loader2 className="animate-spin" size={20} color={colors.primary} />
                            <span>Loading user profile…</span>
                        </div>
                    </div>
                </main>
            </div>
        );
    }

    if (error) {
        return (
            <div style={styles.page}>
                <Sidebar />
                <main style={styles.main}>
                    <div style={styles.card}>
                        <button onClick={() => navigate('/admin/dashboard')} style={styles.backBtn}>← Back to Admin</button>
                        <h2 style={styles.title}>Unable to load profile</h2>
                        <p style={{ color: colors.danger, marginTop: '16px' }}>{error}</p>
                    </div>
                </main>
            </div>
        );
    }

    if (!user) {
        return (
            <div style={styles.page}>
                <Sidebar />
                <main style={styles.main}>
                    <div style={styles.card}>
                        <button onClick={() => navigate('/admin/dashboard')} style={styles.backBtn}>← Back to Admin</button>
                        <h2 style={styles.title}>User not found</h2>
                        <p style={{ color: colors.textMuted, marginTop: '16px' }}>No user account was returned for this ID.</p>
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div style={styles.page}>
            <Sidebar />
            <main style={styles.main}>
                <div style={styles.header}>
                    <div>
                        <button onClick={() => navigate('/admin/dashboard')} style={styles.backBtn}>← Back to Admin Dashboard</button>
                        <h1 style={styles.title}>User Profile</h1>
                        <p style={styles.subtitle}>Full account details for {user.fullName}</p>
                    </div>
                    {renderStatusBadge()}
                </div>

                <div style={styles.card}>
                    <div style={styles.row}>
                        <div style={styles.field}>
                            <span style={styles.label}>Full name</span>
                            <span style={styles.value}>{user.fullName || 'N/A'}</span>
                        </div>
                        <div style={styles.field}>
                            <span style={styles.label}>Email address</span>
                            <span style={styles.value}>{user.accountEmail || 'N/A'}</span>
                        </div>
                        <div style={styles.field}>
                            <span style={styles.label}>Role</span>
                            <span style={styles.value}>{user.assignedRole || 'Student'}</span>
                        </div>
                        <div style={styles.field}>
                            <span style={styles.label}>Account created</span>
                            <span style={styles.value}>{new Date(user.creationTimestamp || user.createdAt || Date.now()).toLocaleDateString()}</span>
                        </div>
                        <div style={styles.field}>
                            <span style={styles.label}>Last login</span>
                            <span style={styles.value}>{user.lastLoginTimestamp ? new Date(user.lastLoginTimestamp).toLocaleString() : 'Never'}</span>
                        </div>
                        <div style={styles.field}>
                            <span style={styles.label}>Account status</span>
                            <span style={styles.value}>{user.isActive ? 'Active' : 'Suspended'}</span>
                        </div>
                    </div>
                </div>

                <div style={styles.card}>
                    <h2 style={styles.sectionTitle}>Profile details</h2>
                    <div style={styles.sectionBody}>
                        <div style={styles.field}>
                            <span style={styles.label}>Suspension reason</span>
                            <span style={styles.value}>{user.suspensionReason || 'None'}</span>
                        </div>
                        <div style={styles.field}>
                            <span style={styles.label}>Suspension start</span>
                            <span style={styles.value}>{user.suspensionDate ? new Date(user.suspensionDate).toLocaleDateString() : 'N/A'}</span>
                        </div>
                        <div style={styles.field}>
                            <span style={styles.label}>Suspension end</span>
                            <span style={styles.value}>{user.suspensionEndDate ? new Date(user.suspensionEndDate).toLocaleDateString() : 'N/A'}</span>
                        </div>
                        <div style={styles.field}>
                            <span style={styles.label}>Username</span>
                            <span style={styles.value}>{user.username || 'N/A'}</span>
                        </div>
                        <div style={styles.field}>
                            <span style={styles.label}>Phone</span>
                            <span style={styles.value}>{user.contactPhone || 'N/A'}</span>
                        </div>
                        <div style={styles.field}>
                            <span style={styles.label}>Country</span>
                            <span style={styles.value}>{user.country || 'N/A'}</span>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
