const fs = require('fs');
const path = 'src/pages/student/DiscussionPage.jsx';
const lines = fs.readFileSync(path, 'utf8').split(/\r?\n/);
for (let i = 370; i <= 390; i++) {
  const line = lines[i-1] || '';
  console.log(`${i}: ${line}`);
}
