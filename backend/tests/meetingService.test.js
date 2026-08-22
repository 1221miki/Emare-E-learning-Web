const { describe, test } = require('node:test');
const assert = require('node:assert');

const meetingService = require('../services/meetingService');
const googleMeetService = require('../services/googleMeetService');

describe('meetingService unit tests (no DB, no network)', () => {
    test('normalizeProvider falls back to internal for unknown providers', () => {
        assert.strictEqual(meetingService.normalizeProvider('googleMeet'), 'googleMeet');
        assert.strictEqual(meetingService.normalizeProvider('zoom'), 'zoom');
        assert.strictEqual(meetingService.normalizeProvider('bogus-provider'), 'internal');
        assert.strictEqual(meetingService.normalizeProvider(undefined), 'internal');
    });

    test('isValidMeetingUrl accepts only full http(s) links', () => {
        assert.strictEqual(meetingService.isValidMeetingUrl('https://meet.google.com/abc-defg-hij'), true);
        assert.strictEqual(meetingService.isValidMeetingUrl('http://example.com/live'), true);
        assert.strictEqual(meetingService.isValidMeetingUrl('not a url'), false);
        assert.strictEqual(meetingService.isValidMeetingUrl(null), false);
        assert.strictEqual(meetingService.isValidMeetingUrl(''), false);
    });

    test('googleMeetService reports not configured without env vars', () => {
        const status = googleMeetService.getStatus();
        assert.strictEqual(status.provider, 'googleMeet');
        assert.strictEqual(status.connected, false);
        assert.ok(Array.isArray(status.missingEnv));
        assert.ok(status.missingEnv.includes('GOOGLE_CLIENT_ID'));
        assert.strictEqual(googleMeetService.isConfigured(), false);
    });

    test('connectStatus alias returns the same safe shape', () => {
        const status = googleMeetService.connectStatus();
        assert.deepStrictEqual(status, googleMeetService.getStatus());
    });

    test('providerConfigured googleMeet is false without credentials', () => {
        assert.strictEqual(meetingService.providerConfigured('googleMeet'), false);
    });

    test('missingEnvMessage for googleMeet names the required env vars', () => {
        const message = meetingService.missingEnvMessage('googleMeet') || '';
        assert.ok(message.includes('GOOGLE_CLIENT_ID'));
        assert.ok(message.includes('GOOGLE_CLIENT_SECRET'));
        assert.ok(message.includes('GOOGLE_REDIRECT_URI'));
    });

    test('generateMeetingUrl for internal/jitsi returns real links without network', async () => {
        const internal = await meetingService.generateMeetingUrl({ provider: 'internal', slug: 'Freshman Orientation' });
        assert.strictEqual(internal.provider, 'internal');
        assert.match(internal.url, /^http(s)?:\/\//);

        const jitsi = await meetingService.generateMeetingUrl({ provider: 'jitsi', slug: 'Freshman Orientation' });
        assert.strictEqual(jitsi.provider, 'jitsi');
        assert.match(jitsi.url, /^https:\/\/meet\.jit\.si\//);
    });

    test('generateMeetingUrl for googleMeet falls back to Jitsi when not connected', async () => {
        if (googleMeetService.getStatus().connected) {
            return; // real credentials present — do not hit the live API in unit tests
        }
        const result = await meetingService.generateMeetingUrl({ provider: 'googleMeet', title: 'Test' });
        assert.strictEqual(result.provider, 'jitsi');
        assert.match(result.url, /^https:\/\/meet\.jit\.si\//);
    });

    test('resolveMeetingUrl clears the link for Physical events', async () => {
        const resolved = await meetingService.resolveMeetingUrl({
            eventType: 'Physical',
            existing: 'https://meet.google.com/abc-defg-hij',
            supplied: '',
            provider: 'googleMeet'
        });
        assert.strictEqual(resolved.url, '');
        assert.strictEqual(resolved.changed, true);
    });

    test('resolveMeetingUrl accepts a valid manual URL as custom provider', async () => {
        const resolved = await meetingService.resolveMeetingUrl({
            eventType: 'Online',
            supplied: 'https://zoom.us/j/123456789',
            provider: 'custom'
        });
        assert.strictEqual(resolved.provider, 'custom');
        assert.strictEqual(resolved.url, 'https://zoom.us/j/123456789');
    });

    test('resolveMeetingUrl rejects non-Google URLs when the provider is googleMeet', async () => {
        await assert.rejects(
            () => meetingService.resolveMeetingUrl({
                eventType: 'Online',
                supplied: 'https://zoom.us/j/123456789',
                provider: 'googleMeet'
            }),
            (err) => err.code === 'INVALID_MEETING_URL'
        );
        await assert.rejects(
            () => meetingService.resolveMeetingUrl({
                eventType: 'Online',
                supplied: 'https://meet.google.com/live',
                provider: 'googleMeet'
            }),
            (err) => err.code === 'INVALID_MEETING_URL'
        );
    });

    test('resolveMeetingUrl rejects invalid manual URLs', async () => {
        await assert.rejects(
            () => meetingService.resolveMeetingUrl({ eventType: 'Online', supplied: 'not a url' }),
            (err) => err.code === 'INVALID_MEETING_URL'
        );
    });

    test('resolveMeetingUrl preserves an existing link on edits', async () => {
        const resolved = await meetingService.resolveMeetingUrl({
            eventType: 'Online',
            existing: 'https://meet.google.com/abc-defg-hij',
            supplied: '',
            provider: 'googleMeet'
        });
        assert.strictEqual(resolved.changed, false);
        assert.strictEqual(resolved.url, 'https://meet.google.com/abc-defg-hij');
        assert.strictEqual(resolved.meeting, null);
    });
});

describe('mergeMeetingInfo unit tests', () => {
    test('Physical event clears all meeting fields', () => {
        const doc = mergeInto({ eventType: 'Physical' }, { url: '', provider: 'internal', changed: true });
        assert.strictEqual(doc.meetingUrl, '');
        assert.strictEqual(doc.meetingStatus, 'none');
        assert.strictEqual(doc.meetingProvider, 'internal');
        assert.strictEqual(doc.streamUrl, '');
    });

    test('fresh googleMeet resource is stored with status created', () => {
        const resolved = {
            url: 'https://meet.google.com/abc-defg-hij',
            provider: 'googleMeet',
            generated: true,
            changed: true,
            meeting: {
                meetingUrl: 'https://meet.google.com/abc-defg-hij',
                meetingSpaceName: 'spaces/abc-defg-hij',
                meetingProviderId: 'spaces/abc-defg-hij',
                meetingCreatedAt: new Date('2026-01-01T00:00:00Z'),
                meetingMetadata: { meetingCode: 'abc-defg-hij' }
            }
        };
        const doc = mergeInto({ eventType: 'Online' }, resolved);
        assert.strictEqual(doc.meetingUrl, 'https://meet.google.com/abc-defg-hij');
        assert.strictEqual(doc.meetingSpaceName, 'spaces/abc-defg-hij');
        assert.strictEqual(doc.meetingStatus, 'created');
        assert.strictEqual(doc.meetingProvider, 'googleMeet');
        assert.strictEqual(doc.streamUrl, 'https://meet.google.com/abc-defg-hij');
    });

    test('manual URL is stored as custom without provider metadata', () => {
        const doc = mergeInto({ eventType: 'Online' }, { url: 'https://zoom.us/j/123', provider: 'custom', changed: true });
        assert.strictEqual(doc.meetingProvider, 'custom');
        assert.strictEqual(doc.meetingStatus, 'none');
        assert.strictEqual(doc.meetingSpaceName, '');
        assert.strictEqual(doc.streamUrl, 'https://zoom.us/j/123');
    });

    test('existing provider resource is preserved with status preserved', () => {
        const prev = {
            eventType: 'Online',
            meetingUrl: 'https://meet.google.com/old-space',
            meetingSpaceName: 'spaces/old-space',
            meetingProviderId: 'spaces/old-space',
            meetingCreatedAt: new Date('2025-12-01T00:00:00Z'),
            meetingProvider: 'googleMeet'
        };
        const doc = mergeInto(
            { eventType: 'Online' },
            { url: 'https://meet.google.com/old-space', provider: 'googleMeet', changed: false, meeting: null },
            prev
        );
        assert.strictEqual(doc.meetingUrl, 'https://meet.google.com/old-space');
        assert.strictEqual(doc.meetingSpaceName, 'spaces/old-space');
        assert.strictEqual(doc.meetingStatus, 'preserved');
        assert.strictEqual(doc.meetingProvider, 'googleMeet');
    });

    test('plain internal/jitsi link is stored without provider metadata', () => {
        const doc = mergeInto({ eventType: 'Online' }, { url: 'https://meet.jit.si/freshman', provider: 'jitsi', generated: true });
        assert.strictEqual(doc.meetingProvider, 'jitsi');
        assert.strictEqual(doc.meetingStatus, 'none');
        assert.strictEqual(doc.meetingUrl, 'https://meet.jit.si/freshman');
    });
});

function mergeInto(doc, resolved, prev) {
    return meetingService.mergeMeetingInfo({ ...doc }, resolved, prev || null);
}