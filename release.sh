#!/bin/bash

set -e

# Spinner function
spin() {
  local pid=$1
  local msg=$2
  local spinchars='|/-\'
  local i=0
  while kill -0 "$pid" 2>/dev/null; do
    printf "\r%s %c" "$msg" "${spinchars:i++%4:1}"
    sleep 0.1
  done
  printf "\r%s done\n" "$msg"
}

# Fetch latest from remote
git fetch &>/dev/null &
spin $! "Fetching from remote..."

# Check if branch is behind remote
LOCAL=$(git rev-parse @)
REMOTE=$(git rev-parse @{u})
BASE=$(git merge-base @ @{u})

if [[ "$LOCAL" != "$REMOTE" ]]; then
  if [[ "$LOCAL" == "$BASE" ]]; then
    echo "Your branch is behind the remote. Please pull the latest changes first."
  else
    echo "Your branch has diverged from the remote. Please resolve this first."
  fi
  exit 1
fi

# Get current version from package.json
CURRENT_VERSION=$(jq -r '.version' package.json)

echo "Current version: $CURRENT_VERSION"

# Parse version components
IFS='.' read -r MAJOR MINOR PATCH <<< "$CURRENT_VERSION"

# Calculate next patch version
NEXT_PATCH="$MAJOR.$MINOR.$((PATCH + 1))"

# Prompt for new version
echo "Enter new version (or press Enter for $NEXT_PATCH):"
read -r INPUT

# Determine new version
if [[ -z "$INPUT" ]]; then
  NEW_VERSION="$NEXT_PATCH"
elif [[ "$INPUT" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  NEW_VERSION="$INPUT"
else
  echo "Invalid version: $INPUT"
  echo "Please enter a semver like X.Y.Z"
  exit 1
fi

echo "New version: $NEW_VERSION"

# Update package.json
jq --arg v "$NEW_VERSION" '.version = $v' package.json > package.json.tmp && mv package.json.tmp package.json

# Update manifest.json
jq --arg v "$NEW_VERSION" '.version = $v' manifest.json > manifest.json.tmp && mv manifest.json.tmp manifest.json

echo "Updated package.json and manifest.json to version $NEW_VERSION"

# Git operations
git add package.json manifest.json
git commit -m "chore: bump version to $NEW_VERSION"
git tag "v$NEW_VERSION"

echo "Created commit and tag v$NEW_VERSION"

# Push commit and tag
git push && git push origin "v$NEW_VERSION"

echo "Pushed commit and tag to remote"
echo "Done! Version bumped to $NEW_VERSION"
