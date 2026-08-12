$tmp = Join-Path $env:TEMP 'upload_test_avatar.png'
[IO.File]::WriteAllBytes($tmp, [Convert]::FromBase64String('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMBAAFWU+OkAAAAAElFTkSuQmCC'))
$cookieJar = Join-Path $env:TEMP 'cookiejar.txt'
$login = & curl.exe -s -X POST -H "Content-Type: application/json" -d '{"accountEmail":"instructor@emare.com","password":"instructor12345"}' -c $cookieJar http://127.0.0.1:5000/api/auth/login
Write-Host "LOGIN: $login"
$upload = & curl.exe -s -X POST -F "file=@$tmp" -b $cookieJar http://127.0.0.1:5000/api/upload
Write-Host "UPLOAD: $upload"
try {
    $uploadObj = $upload | ConvertFrom-Json
} catch {
    Write-Error "Failed to parse upload response."
    exit 1
}
if (-not $uploadObj.success) {
    Write-Error "Upload endpoint failed"
    exit 1
}
$url = $uploadObj.data.url
Write-Host "UPLOAD_URL: $url"
$profileBody = "{\"avatarUrl\":\"$url\"}"
$profileUpdate = & curl.exe -s -X PATCH -H "Content-Type: application/json" -d $profileBody -b $cookieJar http://127.0.0.1:5000/api/users/profile
Write-Host "PROFILE_UPDATE: $profileUpdate"
try {
    $profileObj = $profileUpdate | ConvertFrom-Json
} catch {
    Write-Error "Failed to parse profile update response."
    exit 1
}
if (-not $profileObj.success) {
    Write-Error "Profile update failed"
    exit 1
}
Write-Host "AVATAR SAVED"
$courseBody = "{\"courseTitle\":\"Test Upload Course\",\"descriptionText\":\"Test upload course from Cloudinary fix\",\"technicalCategory\":\"Test\",\"price\":0,\"thumbnailUrl\":\"$url\"}"
$courseCreate = & curl.exe -s -X POST -H "Content-Type: application/json" -d $courseBody -b $cookieJar http://127.0.0.1:5000/api/courses
Write-Host "COURSE_CREATE: $courseCreate"
try {
    $courseObj = $courseCreate | ConvertFrom-Json
} catch {
    Write-Error "Failed to parse course creation response."
    exit 1
}
if (-not $courseObj.success) {
    Write-Error "Course create failed"
    exit 1
}
Write-Host "COURSE SAVED ID: $($courseObj.data._id)"
exit 0
