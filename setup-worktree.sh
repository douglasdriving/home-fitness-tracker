#!/usr/bin/env bash
# Setup script for new worktrees
# Run this once after creating a new worktree

set -e

echo "Setting up worktree..."

# Allow direnv for this directory
direnv allow

# Install npm dependencies using the flake environment
direnv exec . npm install

# Install git hooks (dead code scanner pre-commit hook)
echo "Installing git hooks..."
direnv exec . npm run hooks:install

echo ""
echo "Setup complete! Run 'npm run dev' to start the dev server."
