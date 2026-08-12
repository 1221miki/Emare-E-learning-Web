@echo off
set tmp=%TEMP%\upload_test_avatar.png
powershell -command "[IO.File]::WriteAllBytes('%tmp%', [Convert]::FromBase64String('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMBAAFWU+OkAAAAAElFTkSuQmCC'))"
curl.exe -s -X POST -H "Content-Type: application/json" -d "{\"accountEmail\":\"instructor@emare.com\",\"password\":\"instructor12345\"}" -c "%TEMP%\cookiejar.txt" http://localhost:5000/api/auth/login
curl.exe -s -X POST -F "file=@%tmp%" -b "%TEMP%\cookiejar.txt" http://localhost:5000/api/upload
