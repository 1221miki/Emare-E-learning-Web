const fs = require('fs');
const p = '../client/src/pages/LiveSessionsPage.jsx';
const lines = fs.readFileSync(p, 'utf8').split('\n');

// Replace lines 447..503 (1-indexed): platform select block + meeting link block
const startIdx = 446; // line 447 index
const endIdx = 503;   // line 503 is the closing </div> of meeting link block (index 502 inclusive) → slice end 503

const replacement = `                        <div>
                            <label style={{ display: 'block', color: colors.text, marginBottom: '8px', fontWeight: '600' }}>Platform</label>
                            <select value={formData.platform} onChange={e => {
                                const nextPlatform = e.target.value;
                                setLinkMsg(null);
                                setFieldErrors(prev => ({ ...prev, meetingLink: undefined }));
                                setFormData(prev => {
                                    // Keep an existing valid link — only auto-fill Jitsi when empty
                                    const keepLink = prev.meetingLink && prev.meetingLink.startsWith('http')
                                        ? prev.meetingLink
                                        : (nextPlatform === 'Jitsi Meet' ? getDefaultMeetingLink(nextPlatform, prev.title) : '');
                                    return { ...prev, platform: nextPlatform, meetingLink: keepLink };
                                });
                            }} style={{ width: '100%', padding: '12px', background: colors.bgInput, border: \`1px solid \${colors.border}\`, color: colors.text, borderRadius: '8px', outline: 'none' }}>
                                <option value="Zoom">Zoom</option>
                                <option value="Google Meet">Google Meet</option>
                                <option value="Jitsi Meet">Jitsi Meet</option>
                                <option value="Custom">Custom</option>
                            </select>
                        </div>
                        {formData.platform === 'Google Meet' && (
                            <div style={{ gridColumn: '1 / -1' }}>
                                <label style={{ display: 'block', color: colors.text, marginBottom: '8px', fontWeight: '600' }}>Invitees (comma separated emails)</label>
                                <input type="text" value={formData.attendees || ''} onChange={e => setFormData({...formData, attendees: e.target.value})} placeholder="e.g. student1@example.com,student2@example.com" style={{ width: '100%', padding: '12px', background: colors.bgInput, border: \`1px solid \${colors.border}\`, color: colors.text, borderRadius: '8px', outline: 'none' }} />
                            </div>
                        )}
                        <div style={{ gridColumn: '1 / -1' }}>
                            <label style={{ display: 'block', color: colors.text, marginBottom: '8px', fontWeight: '600' }}>Meeting Link</label>
                            <input type="url" value={formData.meetingLink} onChange={e => { setFormData({...formData, meetingLink: e.target.value}); setFieldErrors(prev => ({ ...prev, meetingLink: undefined })); }} placeholder="https://…" style={{ width: '100%', padding: '12px', background: colors.bgInput, border: \`1px solid \${fieldErrors.meetingLink ? '#ef4444' : colors.border}\`, color: colors.text, borderRadius: '8px', outline: 'none' }} />
                            {fieldErrors.meetingLink && (
                                <div style={{ marginTop: '6px', fontSize: '12.5px', fontWeight: 600, color: '#ef4444' }}>{fieldErrors.meetingLink}</div>
                            )}
                            <div style={{ marginTop: '6px', fontSize: '12px', color: colors.textMuted }}>{getPlatformHelperText()}</div>

                            {linkMsg && (
                                <div style={{
                                    marginTop: '8px', fontSize: '12.5px', fontWeight: 600,
                                    color: linkMsg.type === 'error' ? '#ef4444' : linkMsg.type === 'success' ? '#16a34a' : '#d97706'
                                }} role="status">
                                    {linkMsg.type === 'error' ? '⚠️ ' : linkMsg.type === 'success' ? '✓ ' : 'ℹ️ '}{linkMsg.text}
                                </div>
                            )}

                            {formData.platform !== 'Custom' && (
                                <div style={{ marginTop: '10px' }}>
                                    <button type="button" onClick={handleGenerateMeetingLink} disabled={generatingLink} style={{ padding: '10px 14px', background: colors.accent, color: '#fff', border: 'none', borderRadius: '8px', cursor: generatingLink ? 'wait' : 'pointer', opacity: generatingLink ? 0.7 : 1 }}>
                                        {generatingLink ? 'Generating…' : 'Generate Meeting Link'}
                                    </button>
                                </div>
                            )}
                        </div>`;

const out = [...lines.slice(0, startIdx), replacement, ...lines.slice(endIdx)];
fs.writeFileSync(p, out.join('\n'));
console.log('Form JSX replaced OK');
