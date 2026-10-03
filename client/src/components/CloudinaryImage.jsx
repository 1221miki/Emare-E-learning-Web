import React from 'react';

/**
 * CloudinaryImage - Wrapper for Cloudinary-hosted images
 * Adds crossorigin="anonymous" to prevent tracking prevention warnings
 * and ensure images load without credentialed requests.
 */
export default function CloudinaryImage({ src, alt = '', crossorigin = 'anonymous', ...props }) {
    if (!src || !src.includes('res.cloudinary.com')) {
        return <img src={src} alt={alt} {...props} />;
    }
    return <img src={src} alt={alt} crossOrigin={crossorigin} {...props} />;
}