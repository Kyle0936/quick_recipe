# Quick Recipe Vault

A lightweight browser-based recipe app for:

- Saving recipes with screenshot/photo, ingredients, instructions, calories, and tags.
- Organizing by custom tags such as `bakery`, `low-calorie`, or `hosting-event`.
- Picking a random recipe with optional filters (required tags + max calories).
- Adding recipe images either by file upload or quick copy/paste directly from clipboard.

## Run locally

Open `index.html` in a browser.

No build step or backend is required. Data is stored in browser `localStorage`.

## Host on GitHub Pages

Use these steps to publish this repo as a website:

1. Push this repository to GitHub.
2. In GitHub, open **Settings** for the repository.
3. Go to **Pages** in the left sidebar.
4. Under **Build and deployment**:
   - Set **Source** to **Deploy from a branch**.
   - Choose branch **main** (or your default branch).
   - Choose folder **/ (root)**.
   - Click **Save**.
5. Wait for deployment (usually 1-2 minutes).
6. Open the published URL shown in Pages, usually:
   - `https://<your-github-username>.github.io/<repo-name>/`

### GitHub Pages notes

- Keep `index.html` at repo root so Pages can serve it as the default page.
- Any update pushed to the selected branch/folder will redeploy automatically.
