# Run this AFTER signing in with:  & 'C:\Program Files\GitHub CLI\gh.exe' auth login --web
# Creates github.com/NafisBhuiyan1/connected (public, so hackathon judges can see it) and pushes everything.
$gh = 'C:\Program Files\GitHub CLI\gh.exe'
Set-Location $PSScriptRoot
& $gh auth setup-git
git add -A
git commit -m "Latest Connected work" 2>$null
$exists = & $gh repo view NafisBhuiyan1/connected 2>$null
if ($LASTEXITCODE -ne 0) {
  & $gh repo create NafisBhuiyan1/connected --public --source . --remote origin --push --description "Connected - AI team formation for CrownHacks 2026"
} else {
  if (-not (git remote | Select-String origin)) { git remote add origin https://github.com/NafisBhuiyan1/connected.git }
  git push -u origin main
}
Write-Host "Done: https://github.com/NafisBhuiyan1/connected"
