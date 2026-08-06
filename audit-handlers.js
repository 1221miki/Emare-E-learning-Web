const fs = require('fs');
const file = './client/src/pages/admin/AdminDashboard.jsx';
const content = fs.readFileSync(file, 'utf8');
const lines = content.split('\n');

console.log('=== Buttons/actions that only show notifications without API calls ===\n');

// Check for handler functions that only call showNotification without an API call
const handlerRegex = /(?:const|let)\s+(handle[A-Z]\w+)\s*=\s*(?:async\s*)?\(/g;
let match;
const handlers = [];
while ((match = handlerRegex.exec(content)) !== null) {
    handlers.push({ name: match[1], pos: match.index });
}

for (let i = 0; i < handlers.length; i++) {
    const start = handlers[i].pos;
    const end = i < handlers.length - 1 ? handlers[i + 1].pos : content.length;
    const body = content.substring(start, end);
    
    const hasApiCall = /await\s+\w+Service\./.test(body) || /fetch\(/.test(body);
    const hasShowNotification = /showNotification\(/.test(body);
    const hasAlert = /\balert\(/.test(body);
    const hasConfirm = /window\.confirm/.test(body);
    const hasSetState = /\bset[A-Z]/.test(body);
    
    // Find handlers that are stubs (only show notification/alert without API)
    if (!hasApiCall && (hasShowNotification || hasAlert)) {
        const lineNum = content.substring(0, start).split('\n').length;
        console.log(`Line ${lineNum}: ${handlers[i].name}`);
        // Get the first 200 chars of the body for context
        console.log('  Preview:', body.substring(0, 200).replace(/\n/g, ' ').trim());
        console.log('');
    }
}

console.log('\n=== onClick handlers that are empty or just console.log ===\n');

// Find onClick handlers that do nothing
const emptyOnClick = /onClick=\{[^}]*console\.log[^}]*\}/g;
while ((match = emptyOnClick.exec(content)) !== null) {
    const lineNum = content.substring(0, match.index).split('\n').length;
    console.log(`Line ${lineNum}: ${match[0].substring(0, 100)}`);
}

// Find onClick that calls undefined functions or is empty
const noopOnClick = /onClick=\{[^}]*\(\)\s*=>\s*\{\s*\}\s*\}/g;
while ((match = noopOnClick.exec(content)) !== null) {
    const lineNum = content.substring(0, match.index).split('\n').length;
    console.log(`Line ${lineNum}: Empty onClick: ${match[0]}`);
}
