const fs = require('fs');
const path = require('path');
const fetch = globalThis.fetch;
const FormData = globalThis.FormData;
(async () => {
  const tmp = path.join(process.cwd(), 'upload_test_avatar.png');
  fs.writeFileSync(tmp, Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMBAAFWU+OkAAAAAElFTkSuQmCC', 'base64'));
  const fd = new FormData();
  fd.append('image', fs.createReadStream(tmp));
  const res = await fetch('http://localhost:5000/api/media/test-image', { method: 'POST', body: fd });
  console.log('STATUS', res.status);
  console.log(await res.text());
})();
