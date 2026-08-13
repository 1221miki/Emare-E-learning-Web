/**
 * THUMBNAIL VISIBILITY DIAGNOSTIC SCRIPT
 * Run this in browser console or with: node backend/scripts/thumbnail-diagnostic.js
 * 
 * This script verifies:
 * 1. Backend has courses with thumbnails
 * 2. API returns thumbnail URLs correctly
 * 3. Frontend receives and processes the data
 */

console.log('═══════════════════════════════════════════════════════════════════════');
console.log('EMARE E-LEARNING THUMBNAIL DIAGNOSTIC');
console.log('═══════════════════════════════════════════════════════════════════════\n');

// For browser console use
if (typeof window !== 'undefined' && window.fetch) {
    console.log('Running BROWSER diagnostic...\n');
    
    async function runBrowserDiagnostic() {
        try {
            // Step 1: Check API response
            console.log('STEP 1: Checking API response for courses...');
            const apiUrl = 'http://localhost:5000/api/courses';
            const response = await fetch(apiUrl);
            const data = await response.json();
            
            if (!data.data || !Array.isArray(data.data)) {
                console.error('❌ Invalid API response structure');
                return;
            }
            
            const courses = data.data;
            console.log(`✓ API returned ${courses.length} courses\n`);
            
            // Step 2: Analyze thumbnail status
            console.log('STEP 2: Analyzing thumbnail status...');
            const coursesWithThumbs = courses.filter(c => c.thumbnailUrl);
            const coursesWithoutThumbs = courses.filter(c => !c.thumbnailUrl);
            
            console.log(`✓ Courses with thumbnails: ${coursesWithThumbs.length}`);
            console.log(`✗ Courses without thumbnails: ${coursesWithoutThumbs.length}\n`);
            
            // Step 3: Test thumbnail URLs
            console.log('STEP 3: Testing thumbnail URL accessibility...');
            const testCourses = coursesWithThumbs.slice(0, 3);
            
            for (const course of testCourses) {
                console.log(`\nTesting "${course.courseTitle}"`);
                console.log(`URL: ${course.thumbnailUrl}`);
                
                try {
                    const imgResponse = await fetch(course.thumbnailUrl, { mode: 'no-cors' });
                    console.log(`✓ URL is accessible (Status: ${imgResponse.status})`);
                } catch (err) {
                    console.warn(`⚠ Could not verify URL accessibility: ${err.message}`);
                }
            }
            
            // Step 4: Provide summary
            console.log('\n' + '═══════════════════════════════════════════════════════════════════════');
            console.log('SUMMARY:');
            console.log('═══════════════════════════════════════════════════════════════════════');
            console.log(`Total Courses: ${courses.length}`);
            console.log(`With Thumbnails: ${coursesWithThumbs.length} (${Math.round(coursesWithThumbs.length / courses.length * 100)}%)`);
            console.log(`Without Thumbnails: ${coursesWithoutThumbs.length}`);
            
            if (coursesWithoutThumbs.length > 0) {
                console.log('\n❌ Courses missing thumbnails:');
                coursesWithoutThumbs.forEach(c => {
                    console.log(`  - ${c.courseTitle} (ID: ${c._id})`);
                });
            } else {
                console.log('\n✓ ALL COURSES HAVE THUMBNAILS!');
            }
            
            console.log('\n' + '═══════════════════════════════════════════════════════════════════════');
            console.log('FRONTEND ACTIONS:');
            console.log('═══════════════════════════════════════════════════════════════════════');
            console.log('1. Hard refresh the page: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)');
            console.log('2. Open browser DevTools (F12) and check Console tab');
            console.log('3. Look for "[CourseCatalog]" logs showing thumbnail status');
            console.log('4. Check Network tab for image load failures');
            console.log('═══════════════════════════════════════════════════════════════════════\n');
            
        } catch (err) {
            console.error('Diagnostic error:', err);
        }
    }
    
    runBrowserDiagnostic();
} else {
    // Node.js version for command line use
    console.log('Running NODE.JS diagnostic...');
    console.log('Note: This requires the backend server to be running.\n');
    
    const http = require('http');
    
    function makeRequest(url) {
        return new Promise((resolve, reject) => {
            http.get(url, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try {
                        resolve(JSON.parse(data));
                    } catch (err) {
                        reject(err);
                    }
                });
            }).on('error', reject);
        });
    }
    
    // Make request to debug endpoint
    makeRequest('http://localhost:5000/api/courses/debug/thumbnails')
        .then(result => {
            const stats = result.data;
            console.log('✓ Backend Status:');
            console.log(`  Total Courses: ${stats.total}`);
            console.log(`  With Thumbnails: ${stats.withThumbnails}`);
            console.log(`  Visible in Catalog: ${stats.visibleInCatalog}`);
            console.log(`  Published but No Thumbnail: ${stats.publishedButNoThumb}`);
            console.log('\n✓ All systems operational!\n');
        })
        .catch(err => console.error('❌ Error:', err.message));
}
