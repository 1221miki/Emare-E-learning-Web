const { describe, test } = require('node:test');
const assert = require('node:assert');

const meetingService = require('../services/meetingService');

describe('meetingService unit tests (no DB, no network)', () => {
    test('normalizeProvider falls back to internal for unknown providers', () => {
        assert.strictEqual(meetingService.normalizeProvider('zoom'), 'zoom');
        assert.strictEqual(meetingService.normalizeProvider('microsoftTeams'), 'microsoftTeams');
        assert.strictEqual(meetingService.normalizeProvider('bogus-provider'), 'internal');
        assert.strictEqual(meetingService.normalizeProvider(undefined), 'internal');
    });

    test('isValidMeetingUrl accepts only full http(s) links', () => {
        assert.strictEqual(meetingService.isValidMeetingUrl('https://meet.jit.si/abc-defg'), true);
        assert.strictEqual(meetingService.isValidMeetingUrl('http://example.com/live'), true);
        assert.strictEqual(meetingService.isValidMeetingUrl('not a url'), false);
        assert.strictEqual(meetingService.isValidMeetingUrl(null), false);
        assert.strictEqual(meetingService.isValidMeetingUrl(''), false);
    });

    test('generateMeetingUrl for internal/jitsi returns real links without network', async () => {
        const internal = await meetingService.generateMeetingUrl({ provider: 'internal', slug: 'Freshman Orientation' });
        assert.strictEqual(internal.provider, 'internal');
        assert.match(internal.url, /^http(s)?:\/\//);

        const jitsi = await meetingService.generateMeetingUrl({ provider: 'jitsi', slug: 'Freshman Orientation' });
        assert.strictEqual(jitsi.provider, 'jitsi');
        assert.match(jitsi.url, /^https:\/\/meet\.jit\.si\//);
    });

    test('resolveMeetingUrl clears the link for Physical events', async () => {
        const resolved = await meetingService.resolveMeetingUrl({
            eventType: 'Physical',
            existing: 'https://meet.jit.si/abc-defg',
            supplied: '',
            provider: 'jitsi'
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

    test('resolveMeetingUrl rejects invalid manual URLs', async () => {
        await assert.rejects(
            () => meetingService.resolveMeetingUrl({ eventType: 'Online', supplied: 'not a url' }),
            (err) => err.code === 'INVALID_MEETING_URL'
        );
    });

    test('resolveMeetingUrl preserves an existing link on edits', async () => {
        const resolved = await meetingService.resolveMeetingUrl({
            eventType: 'Online',
            existing: 'https://meet.jit.si/abc-defg',
            supplied: '',
            provider: 'jitsi'
        });
        assert.strictEqual(resolved.changed, false);
        assert.strictEqual(resolved.url, 'https://meet.jit.si/abc-defg');
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

    test('fresh zoom resource is stored with status created', () => {
        const resolved = {
            url: 'https://us02web.zoom.us/j/123456789',
            provider: 'zoom',
            generated: true,
            changed: true,
            meeting: {
                meetingUrl: 'https://us02web.zoom.us/j/123456789',
                meetingSpaceName: 'Emare Meeting',
                meetingProviderId: 'zoom-123456789',
                meetingCreatedAt: new Date('2026-01-01T00:00:00Z'),
                meetingMetadata: { meetingId: '123456789' }
            }
        };
        const doc = mergeInto({ eventType: 'Online' }, resolved);
        assert.strictEqual(doc.meetingUrl, 'https://us02web.zoom.us/j/123456789');
        assert.strictEqual(doc.meetingSpaceName, 'Emare Meeting');
        assert.strictEqual(doc.meetingStatus, 'created');
        assert.strictEqual(doc.meetingProvider, 'zoom');
        assert.strictEqual(doc.streamUrl, 'https://us02web.zoom.us/j/123456789');
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
            meetingUrl: 'https://us02web.zoom.us/j/old-meeting',
            meetingSpaceName: 'Emare Meeting',
            meetingProviderId: 'zoom-old',
            meetingCreatedAt: new Date('2025-12-01T00:00:00Z'),
            meetingProvider: 'zoom'
        };
        const doc = mergeInto(
            { eventType: 'Online' },
            { url: 'https://us02web.zoom.us/j/old-meeting', provider: 'zoom', changed: false, meeting: null },
            prev
        );
        assert.strictEqual(doc.meetingUrl, 'https://us02web.zoom.us/j/old-meeting');
        assert.strictEqual(doc.meetingSpaceName, 'Emare Meeting');
        assert.strictEqual(doc.meetingStatus, 'preserved');
        assert.strictEqual(doc.meetingProvider, 'zoom');
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
