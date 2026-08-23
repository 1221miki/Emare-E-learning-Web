const fs = require('fs');
const axios = require('axios');

const BUNNY_VIDEO_BASE_URL = 'https://video.bunnycdn.com';
const DEFAULT_BUNNY_API_KEY = '4b01e04c-779b-46a5-9d98700cee34-adf0-4224';
const DEFAULT_BUNNY_LIBRARY_ID = '735143';

const getBunnyApiKey = () => {
    const apiKey = process.env.BUNNY_STREAM_API_KEY || process.env.BUNNY_API_KEY || process.env.BUNNY_STORAGE_API_KEY || DEFAULT_BUNNY_API_KEY;
    return apiKey && String(apiKey).trim() ? String(apiKey).trim() : null;
};

const getBunnyLibraryId = () => process.env.BUNNY_VIDEO_LIBRARY_ID || DEFAULT_BUNNY_LIBRARY_ID;
// Pull Zone CDN hostname (e.g. vz-ece4d3e6-807.b-cdn.net) used for video playback
const getBunnyStorageDomain = () => process.env.BUNNY_STORAGE_DOMAIN || 'vz-ece4d3e6-807.b-cdn.net';
// Storage zone regional endpoint (Falcon/DE region zones use a region subdomain)
const getBunnyStorageEndpoint = () => process.env.BUNNY_STORAGE_ENDPOINT || 'https://storage.bunnycdn.com';

const toErrorString = (value) => {
    if (value == null) return 'Unknown Bunny upload error';
    if (typeof value === 'string') return value;
    if (typeof value === 'object') {
        try {
            return JSON.stringify(value);
        } catch (error) {
            return String(value);
        }
    }
    return String(value);
};

const createVideo = async (title = 'emare-upload-video') => {
    const apiKey = getBunnyApiKey();
    const libraryId = getBunnyLibraryId();

    if (!apiKey) {
        throw new Error('Bunny.net API key is missing. Set BUNNY_API_KEY in the backend environment.');
    }

    if (!libraryId) {
        throw new Error('Bunny.net library ID is missing. Set BUNNY_VIDEO_LIBRARY_ID in the backend environment.');
    }

    try {
        const response = await axios.post(
            `${BUNNY_VIDEO_BASE_URL}/library/${libraryId}/videos`,
            { title },
            {
                headers: {
                    AccessKey: apiKey,
                    'Content-Type': 'application/json'
                },
                timeout: 600000
            }
        );

        const payload = response.data || {};
        const videoId = payload.guid || payload.videoId || payload.id || payload.VideoGuid;

        if (!videoId) {
            throw new Error('Bunny Stream create-video response did not include a valid video GUID.');
        }

        return {
            success: true,
            guid: videoId,
            videoId,
            response: payload
        };
    } catch (error) {
        console.error('Bunny Upload Error:', error.response?.data || error);
        const responseMessage = toErrorString(error.response?.data?.Message || error.response?.data || error.message || 'Bunny.net create-video failed');
        throw new Error(responseMessage);
    }
};

const uploadVideo = async (filePayload, fileName = 'emare-upload.mp4', mimeType = 'video/mp4') => {
    const apiKey = getBunnyApiKey();
    const libraryId = getBunnyLibraryId();

    if (!apiKey) {
        throw new Error('Bunny.net API key is missing. Set BUNNY_API_KEY in the backend environment.');
    }

    if (!libraryId) {
        throw new Error('Bunny.net library ID is missing. Set BUNNY_VIDEO_LIBRARY_ID in the backend environment.');
    }

    const createdVideo = await createVideo(fileName);
    const videoId = createdVideo.guid || createdVideo.videoId;

    let uploadPayload = filePayload;
    let contentLength;

    if (typeof filePayload === 'string') {
        if (!fs.existsSync(filePayload)) {
            throw new Error(`Bunny.net upload failed: file path not found: ${filePayload}`);
        }
        uploadPayload = fs.createReadStream(filePayload);
        contentLength = fs.statSync(filePayload).size;
    } else if (filePayload && typeof filePayload === 'object' && typeof filePayload.path === 'string') {
        const filePath = filePayload.path;
        if (!fs.existsSync(filePath)) {
            throw new Error(`Bunny.net upload failed: file path not found: ${filePath}`);
        }
        uploadPayload = fs.createReadStream(filePath);
        contentLength = fs.statSync(filePath).size;
    } else if (Buffer.isBuffer(filePayload)) {
        contentLength = filePayload.length;
    }

    try {
        const headers = {
            AccessKey: apiKey,
            'Content-Type': 'application/octet-stream'
        };
        if (contentLength != null) {
            headers['Content-Length'] = contentLength;
        }

        const response = await axios.put(
            `${BUNNY_VIDEO_BASE_URL}/library/${libraryId}/videos/${videoId}`,
            uploadPayload,
            {
                headers,
                maxBodyLength: Infinity,
                maxContentLength: Infinity,
                timeout: 600000
            }
        );

        const embedUrl = `https://iframe.mediadelivery.net/embed/${libraryId}/${videoId}`;
        const directUrl = `https://${getBunnyStorageDomain()}/${videoId}/play_480p.mp4`;

        return {
            success: true,
            guid: videoId,
            videoId,
            url: embedUrl,
            embedUrl,
            directUrl,
            streamUrl: directUrl,
            publicUrl: embedUrl,
            response: response.data || {},
            bunnyType: 'video'
        };
    } catch (error) {
        console.error('Bunny Upload Error:', error.response?.data || error);
        const responseMessage = toErrorString(error.response?.data?.Message || error.response?.data || error.message || 'Bunny.net binary upload failed');
        throw new Error(responseMessage);
    }
};

const uploadFileToStorage = async (buffer, fileName = 'emare-upload', mimeType = 'application/octet-stream', folder = 'media') => {
    const storageApiKey = process.env.BUNNY_STORAGE_API_KEY;
    const storageZoneName = process.env.BUNNY_STORAGE_ZONE_NAME;

    if (!storageApiKey) {
        throw new Error('Bunny.net Storage API key is missing. Set BUNNY_STORAGE_API_KEY in the backend environment.');
    }

    if (!storageZoneName) {
        throw new Error('Bunny.net storage zone name is missing. Set BUNNY_STORAGE_ZONE_NAME in the backend environment.');
    }

    const storagePath = `${folder}/${fileName}`.replace(/\/+/g, '/');
    const uploadUrl = `${getBunnyStorageEndpoint()}/${storageZoneName}/${storagePath}`;

    try {
        const response = await axios.put(uploadUrl, buffer, {
            headers: {
                AccessKey: storageApiKey,
                'Content-Type': mimeType || 'application/octet-stream',
                'Content-Length': buffer.length,
                Accept: 'application/json'
            },
            maxBodyLength: Infinity,
            maxContentLength: Infinity,
            timeout: 600000
        });

        return {
            success: true,
            storagePath,
            storageUrl: `https://${getBunnyStorageDomain()}/${storagePath}`,
            cdnUrl: `https://${getBunnyStorageDomain()}/${storagePath}`,
            bunnyType: 'storage',
            response: response.data || {}
        };
    } catch (error) {
        console.error('Bunny Storage Upload Error:', error.response?.data || error.message);
        const responseMessage = toErrorString(error.response?.data?.Message || error.response?.data || error.message || 'Bunny.net storage upload failed');
        throw new Error(responseMessage);
    }
};

module.exports = {
    uploadVideo,
    uploadFileToStorage,
    createVideo,
    getBunnyApiKey,
    getBunnyLibraryId,
    getBunnyStorageDomain,
    getBunnyStorageEndpoint
};
