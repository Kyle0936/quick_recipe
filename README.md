# Quick Recipe Vault

Quick Recipe Vault is a static website that reads recipes from Markdown files in this repository (`/recipes`).
This makes the recipe collection publicly visible and collaboratively editable through GitHub commits/PRs.

## Features

- Public recipe storage in repo files instead of browser-local storage.
- Recipe format based on Markdown + frontmatter (`title`, `calories`, `tags`, `images`).
- Horizontal sliding gallery with search + tag filter + calorie cap filter.
- "🎲 I'm Feeling Hungry" button to jump to a random recipe from current filtered results.
- Modal-based upload/package generator for creating new recipe Markdown + multiple image references.

## Recipe file format

Each recipe is a Markdown file under `/recipes`, for example `recipes/my-recipe.md`:

```md
---
title: My Recipe
calories: 780
tags: hosting-event, dinner
images:
  - recipes/images/my-recipe/photo1.jpg
  - recipes/images/my-recipe/photo2.jpg
---

## Ingredients
- item 1
- item 2

## Instructions
1. Step one
2. Step two
```

## Add a new recipe publicly

1. Open the website and click **Add Recipe Package**.
2. Fill the form and upload one or more images.
3. Download the generated markdown file.
4. In this GitHub repo:
   - add the markdown file to `/recipes`
   - add the images to `/recipes/images/<slug>/`
   - append the recipe path to `recipes/index.json`
5. Commit + push (or open a PR).

## Run locally

Serve files from the repo root (required so `fetch("recipes/index.json")` works):

```bash
python -m http.server 8000
```

Then open: `http://localhost:8000`

## Host on GitHub Pages

1. Push this repository to GitHub.
2. Open **Settings → Pages**.
3. Set Source to **Deploy from a branch**.
4. Select branch **main** (or default) and folder **/ (root)**.
5. Save and wait for deployment.
6. Use the site URL shown by Pages (`https://<user>.github.io/<repo>/`).
