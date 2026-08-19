const test = require('node:test');
const assert = require('node:assert/strict');

const googleMeetService = require('../services/googleMeetService');
const meetingService = require('../services/meetingService');

const {
    isValidGoogleMeetUrl,
    providerConfigured,
    mergeMeetingInfo,
    resolveMeetingUrl
} = meetingService;

const saveEnv = () => {
    const backup = {};
    for (const key of ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'GOOGLE_REDIRECT_URI', 'GOOGLE_REFRESH_TOKEN']) {
        backup[key] = process.env[key];
    }
    return backup;
};

const restoreEnv = (backup) => {
    for (const key of Object.keys(backup)) {
        if (backup[key] === undefined) delete process.env[key];
        else process.env[key] = backup[key];
    }
};

test('googleMeetService.connectStatus never exposes secrets', () => {
    const backup = saveEnv();
    delete process.env.GOOGLE_CLIENT_ID;
    delete process.env.GOOGLE_CLIENT_SECRET;
    delete process.env.GOOGLE_REDIRECT_URI;
    delete process.env.GOOGLE_REFRESH_TOKEN;
    try {
        const status = googleMeetService.connectStatus();
        assert.equal(status.provider, 'googleMeet');
        assert.equal(status.connected, false);
        assert.deepEqual(status.missingEnv.sort(), ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'GOOGLE_REDIRECT_URI'].sort());
        const serialized = JSON.stringify(status);
        assert.ok(!serialized.includes('client_secret'));
        assert.ok(!serialized.includes('refresh_token'));
    } finally {
        restoreEnv(backup);
    }
});

test('createMeetingSpace throws PROVIDER_NOT_CONFIGURED when env is missing', async () => {
    const backup = saveEnv();
    delete process.env.GOOGLE_CLIENT_ID;
    delete process.env.GOOGLE_CLIENT_SECRET;
    delete process.env.GOOGLE_REDIRECT_URI;
    delete process.env.GOOGLE_REFRESH_TOKEN;
    try {
        await assert.rejects(
            () => googleMeetService.createMeetingSpace({ title: 'Test' }),
            (err) => err.code === 'PROVIDER_NOT_CONFIGURED' && err.provider === 'googleMeet'
        );
    } finally {
        restoreEnv(backup);
    }
});

test('createMeetingSpace throws GOOGLE_NOT_AUTHORIZED without a refresh token', async () => {
    const backup = saveEnv();
    process.env.GOOGLE_CLIENT_ID = 'client-id';
    process.env.GOOGLE_CLIENT_SECRET = 'client-secret';
    process.env.GOOGLE_REDIRECT_URI = 'http://localhost:5000/api/calendar/google/callback';
    delete process.env.GOOGLE_REFRESH_TOKEN;
    try {
        await assert.rejects(
            () => googleMeetService.createMeetingSpace({ title: 'Test' }),
            (err) => err.code === 'GOOGLE_NOT_AUTHORIZED'
        );
    } finally {
        restoreEnv(backup);
    }
});

test('meetingService.providerConfigured reflects Google OAuth env + refresh token', () => {
    const backup = saveEnv();
    delete process.env.GOOGLE_CLIENT_ID;
    delete process.env.GOOGLE_CLIENT_SECRET;
    delete process.env.GOOGLE_REDIRECT_URI;
    delete process.env.GOOGLE_REFRESH_TOKEN;
    try {
        assert.equal(meetingService.providerConfigured('googleMeet'), false);
        process.env.GOOGLE_CLIENT_ID = 'client-id';
        process.env.GOOGLE_CLIENT_SECRET = 'client-secret';
        process.env.GOOGLE_REDIRECT_URI = 'http://localhost:5000/api/calendar/google/callback';
        assert.equal(meetingService.providerConfigured('googleMeet'), false);
        process.env.GOOGLE_REFRESH_TOKEN = 'test-refresh-token';
        assert.equal(meetingService.providerConfigured('googleMeet'), true);
    } finally {
        restoreEnv(backup);
    }
});

test('mergeMeetingInfo clears meeting fields for Physical events', () => {
    const previous = {
        streamUrl: 'https://meet.google.com/abc-defg-hij',
        meetingUrl: 'https://meet.google.com/abc-defg-hij',
        meetingProvider: 'googleMeet',
        meetingSpaceName: 'spaces/abc123',
        meetingProviderId: 'spaces/abc123',
        meetingCreatedAt: new Date().toISOString(),
        meetingStatus: 'created',
        meetingMetadata: { meetingCode: 'abc-defg-hij' }
    };
    const target = { eventType: 'Physical' };
    const meeting = { url: '', provider: 'internal', generated: false, changed: false };
    meetingService.mergeMeetingInfo(target, meeting, previous);
    assert.equal(target.meetingUrl, '');
    assert.equal(target.meetingSpaceName, '');
    assert.equal(target.meetingStatus, 'none');
    assert.equal(target.meetingProviderId, '');
});

test('mergeMeetingInfo persists real Google Meet metadata on create', () => {
    const target = { eventType: 'Online' };
    const resolved = {
        url: 'https://meet.google.com/xyz-uvw-rst',
        provider: 'googleMeet',
        generated: true,
        changed: true,
        meeting: {
            meetingUrl: 'https://meet.google.com/xyz-uvw-rst',
            meetingSpaceName: 'spaces/newspace',
            meetingProviderId: 'spaces/newspace',
            meetingCreatedAt: '2026-01-01T00:00:00.000Z',
            meetingMetadata: { meetingCode: 'xyz-uvw-rst', accessType: 'TRUSTED' }
        }
    };
    meetingService.mergeMeetingInfo(target, resolved, null);
    assert.equal(target.meetingUrl, 'https://meet.google.com/xyz-uvw-rst');
    assert.equal(target.streamUrl, 'https://meet.google.com/xyz-uvw-rst');
    assert.equal(target.meetingSpaceName, 'spaces/newspace');
    assert.equal(target.meetingProviderId, 'spaces/newspace');
    assert.equal(target.meetingStatus, 'created');
    assert.equal(target.meetingMetadata.meetingCode, 'xyz-uvw-rst');
});

test('mergeMeetingInfo preserves the same Google Meet space on edit', () => {
    const previous = {
        streamUrl: 'https://meet.google.com/abc-defg-hij',
        meetingUrl: 'https://meet.google.com/abc-defg-hij',
        meetingProvider: 'googleMeet',
        meetingSpaceName: 'spaces/original',
        meetingProviderId: 'spaces/original',
        meetingCreatedAt: '2026-01-01T00:00:00.000Z',
        meetingStatus: 'created',
        meetingMetadata: { meetingCode: 'abc-defg-hij' }
    };
    const target = { eventType: 'Online', title: 'Edited title' };
    const meeting = { url: 'https://meet.google.com/abc-defg-hij', provider: 'googleMeet', generated: false, changed: false };
    meetingService.mergeMeetingInfo(target, meeting, previous);
    assert.equal(target.meetingUrl, 'https://meet.google.com/abc-defg-hij');
    assert.equal(target.meetingSpaceName, 'spaces/original');
    assert.equal(target.meetingProviderId, 'spaces/original');
    assert.equal(target.meetingStatus, 'preserved');
});

test('isValidGoogleMeetUrl only accepts real meet.google.com links', () => {
    assert.equal(isValidGoogleMeetUrl('https://meet.google.com/abc-defg-hij'), true);
    assert.equal(isValidGoogleMeetUrl('https://meet.google.com/abc-defg-hij?authuser=0'), true);
    assert.equal(isValidGoogleMeetUrl('https://meet.google.com/live'), false);
    assert.equal(isValidGoogleMeetUrl('https://meet.google.com/ABC-DEFG-HIJ'), false);
    assert.equal(isValidGoogleMeetUrl('https://example.com/live'), false);
    assert.equal(isValidGoogleMeetUrl('https://meet.jit.si/abc'), false);
    assert.equal(isValidGoogleMeetUrl(''), false);
    assert.equal(isValidGoogleMeetUrl('not-a-url'), false);
});

test('resolveMeetingUrl rejects non-Google meet URLs when provider is googleMeet', async () => {
    const backup = saveEnv();
    delete process.env.GOOGLE_CLIENT_ID;
    delete process.env.GOOGLE_CLIENT_SECRET;
    delete process.env.GOOGLE_REDIRECT_URI;
    delete process.env.GOOGLE_REFRESH_TOKEN;
    try {
        await assert.rejects(
            () => resolveMeetingUrl({ eventType: 'Online', provider: 'googleMeet', supplied: 'https://meet.jit.si/abc' }),
            (err) => err.code === 'INVALID_MEETING_URL'
        );
        await assert.rejects(
            () => resolveMeetingUrl({ eventType: 'Online', provider: 'googleMeet', supplied: 'https://example.com/live' }),
            (err) => err.code === 'INVALID_MEETING_URL'
        );
        const ok = await resolveMeetingUrl({ eventType: 'Online', provider: 'googleMeet', supplied: 'https://meet.google.com/abc-defg-hij' });
        assert.equal(ok.provider, 'googleMeet');
        assert.equal(ok.url, 'https://meet.google.com/abc-defg-hij');
    } finally {
        restoreEnv(backup);
    }
});

test('calendar-backed Google Meet metadata is persisted with status created', () => {
    const target = { eventType: 'Online' };
    const resolved = {
        url: 'https://meet.google.com/xyz-uvw-rst',
        provider: 'googleMeet',
        generated: true,
        changed: true,
        meeting: {
            meetingUrl: 'https://meet.google.com/xyz-uvw-rst',
            meetingSpaceName: 'xyz-uvw-rst',
            meetingProviderId: 'cal-event-123',
            meetingCreatedAt: '2026-01-01T00:00:00.000Z',
            meetingMetadata: { calendarEventId: 'cal-event-123', conferenceId: 'xyz-uvw-rst', hangoutLink: 'https://meet.google.com/xyz-uvw-rst' }
        }
    };
    meetingService.mergeMeetingInfo(target, resolved, null);
    assert.equal(target.meetingUrl, 'https://meet.google.com/xyz-uvw-rst');
    assert.equal(target.meetingProviderId, 'cal-event-123');
    assert.equal(target.meetingStatus, 'created');
    assert.equal(target.meetingMetadata.calendarEventId, 'cal-event-123');
});