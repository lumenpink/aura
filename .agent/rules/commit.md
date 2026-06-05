# Git Commit Rules

## Scope
When generating git commit messages, you must only analyze changes that are staged (equivalent to `git diff --cached`). Ignore any unstaged modifications in the working directory.

## Style and Gitmoji
- You must start every commit message with exactly one relevant Gitmoji.
- Follow the official Gitmoji guide (e.g., :sparkles: for new features, :bug: for bug fixes, :recycle: for refactoring, :art: for UI/style changes).
- Keep the commit message concise and in the imperative mood.
