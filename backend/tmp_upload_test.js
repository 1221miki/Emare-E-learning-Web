const fs = require("fs");
const path = require("path");
const FormData = globalThis.FormData;
const fetch = globalThis.fetch;
(async () => {
  const tmp = path.join(process.cwd(), "upload_test_avatar.png");
  fs.writeFileSync(tmp, Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMBAAFWU+OkAAAAAElFTkSuQmCC", "base64"));
  const login = await fetch("http://localhost:5000/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ accountEmail: "instructor@emare.com", password: "instructor12345" }) });
  console.log("LOGIN", login.status);
  console.log(await login.text());
  const cookie = login.headers.get("set-cookie");
  console.log("COOKIE", cookie);
  if (!cookie) return;
  const fd = new FormData();
  fd.append("file", fs.createReadStream(tmp));
  const upload = await fetch("http://localhost:5000/api/upload", { method: "POST", headers: { cookie: cookie.split(";")[0] }, body: fd });
  console.log("UPLOAD", upload.status);
  console.log(await upload.text());
})();
