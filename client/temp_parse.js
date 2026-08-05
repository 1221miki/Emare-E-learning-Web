const fs = require('fs');
const parser = require('@babel/parser');
const path = 'src/pages/student/DiscussionPage.jsx';
const src = fs.readFileSync(path, 'utf8');
try {
  parser.parse(src, { sourceType: 'module', plugins: ['jsx'] });
  console.log('PARSED OK');
} catch (err) {
  console.error('ERROR', err.message);
  if (err.loc) console.error('LINE', err.loc.line, 'COL', err.loc.column);
  if (err.codeFrame) console.error(err.codeFrame);
}
