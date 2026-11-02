#!/usr/bin/env bash
# Run on a machine with an authenticated GitHub CLI. Never uploads signing material.
set -euo pipefail
cd "$(dirname "$0")/.."
REPO='ffactsui-rgb/Degustation'
command -v gh >/dev/null || { echo 'Install GitHub CLI: https://cli.github.com'; exit 1; }
gh auth status
[[ "$(gh api user --jq .login)" == 'ffactsui-rgb' ]] || { echo 'Sign in to GitHub CLI as ffactsui-rgb.'; exit 1; }
[[ -f output/Degustation-1.0.0.apk ]] || { echo 'Place the supplied APK in output/ or run scripts/build-apk.sh first.'; exit 1; }
if [[ ! -d .git ]]; then
    git init -b main
    git add .
    git commit -m 'Create Degustation Android application'
fi
[[ -z "$(git status --porcelain)" ]] || { echo 'Commit your project changes before publishing.'; exit 1; }
if gh repo view "$REPO" >/dev/null 2>&1; then
    if git remote get-url origin >/dev/null 2>&1; then
        case "$(git remote get-url origin)" in
            https://github.com/ffactsui-rgb/Degustation|https://github.com/ffactsui-rgb/Degustation.git|git@github.com:ffactsui-rgb/Degustation.git) ;;
            *) echo 'origin points to a different repository. Check it before publishing.'; exit 1 ;;
        esac
    else git remote add origin "https://github.com/$REPO.git"; fi
    git push -u origin main
else
    # A new repository starts private. Change visibility yourself if desired.
    gh repo create "$REPO" --private --description 'Дегустационный лист для Android и Android TV' --source=. --remote=origin --push
fi
if gh release view v1.0.0 --repo "$REPO" >/dev/null 2>&1; then
    echo 'Release v1.0.0 already exists; existing assets were left intact.'
else
    gh release create v1.0.0 output/Degustation-1.0.0.apk --repo "$REPO" --target "$(git rev-parse HEAD)" --title 'Дегустационный лист 1.0.0' --notes-file docs/RELEASE.md
fi
