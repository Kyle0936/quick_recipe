const BUILD_VERSION = '2026-04-03-e';

const APP_BASE_PATH = getAppBasePath();

const gallery = document.getElementById('gallery');
const template = document.getElementById('card-template');
const resultCount = document.getElementById('result-count');
const chipBar = document.getElementById('tag-chip-bar');
const appVersion = document.getElementById('app-version');

const searchInput = document.getElementById('search-input');
const tagFilterInput = document.getElementById('tag-filter');
const calorieFilterInput = document.getElementById('calorie-filter');
const sortSelect = document.getElementById('sort-select');
const clearFiltersButton = document.getElementById('clear-filters');
const luckyButton = document.getElementById('lucky-button');

const detailModal = document.getElementById('recipe-detail-modal');
const closeDetailButton = document.getElementById('close-detail');
const detailTitle = document.getElementById('detail-title');
const detailMeta = document.getElementById('detail-meta');
const detailImages = document.getElementById('detail-images');
const detailIngredients = document.getElementById('detail-ingredients');
const detailInstructions = document.getElementById('detail-instructions');

const openModalButton = document.getElementById('open-modal');
const recipeModal = document.getElementById('recipe-modal');
const closeModalButton = document.getElementById('close-modal');
const packageModal = document.getElementById('package-modal');
const closePackageButton = document.getElementById('close-package');
const packageForm = document.getElementById('recipe-package-form');
const markdownDownload = document.getElementById('download-markdown');
const packagePreview = document.getElementById('package-preview');
const ingredientsEditor = document.getElementById('m-ingredients-editor');
const instructionsEditor = document.getElementById('m-instructions-editor');
const attachmentPreview = document.getElementById('attachment-preview');

const attachments = [];

let recipes = [];
let filteredRecipes = [];
let activeChip = '';

initialize();

async function initialize() {
  appVersion.textContent = `UI build ${BUILD_VERSION}`;
  recipes = await loadRecipesFromRepo();
  renderTagChips(recipes);
  applyFilters();
}

searchInput.addEventListener('input', applyFilters);
tagFilterInput.addEventListener('input', () => {
  activeChip = '';
  applyFilters();
});
calorieFilterInput.addEventListener('input', applyFilters);
sortSelect.addEventListener('change', applyFilters);

clearFiltersButton.addEventListener('click', () => {
  searchInput.value = '';
  tagFilterInput.value = '';
  calorieFilterInput.value = '';
  sortSelect.value = 'newest';
  activeChip = '';
  [...chipBar.children].forEach((chip) => chip.classList.remove('active'));
  applyFilters();
});

luckyButton.addEventListener('click', () => {
  if (!filteredRecipes.length) return;
  const picked = filteredRecipes[Math.floor(Math.random() * filteredRecipes.length)];
  const target = document.querySelector(`[data-recipe-id="${picked.id}"]`);
  if (!target) return;

  document.querySelectorAll('.recipe-card.highlight').forEach((node) => node.classList.remove('highlight'));
  target.classList.add('highlight');
  target.scrollIntoView({ behavior: 'smooth', block: 'center' });
  openRecipeDetail(picked);
});

closeDetailButton.addEventListener('click', () => detailModal.close());
openModalButton.addEventListener('click', () => recipeModal.showModal());
closeModalButton.addEventListener('click', () => recipeModal.close());
closePackageButton.addEventListener('click', () => packageModal.close());

ingredientsEditor.addEventListener('paste', (event) => handleEditorPaste(event, 'ingredients'));
instructionsEditor.addEventListener('paste', (event) => handleEditorPaste(event, 'instructions'));

packageForm.addEventListener('submit', (event) => {
  event.preventDefault();

  const title = getValue('m-title').trim();
  const slug = slugify(title);
  const calories = Number(getValue('m-calories'));
  const tags = parseTags(getValue('m-tags'));

  const ingredientLines = extractTextLinesFromEditor(ingredientsEditor);
  const instructionLines = extractTextLinesFromEditor(instructionsEditor);

  const attachmentPaths = attachments.map((item, idx) => `recipes/images/${slug}/${idx + 1}-${item.fileName}`);

  const markdown = buildMarkdown({
    title,
    calories,
    tags,
    ingredients: ingredientLines,
    instructions: instructionLines,
    imagePaths: attachmentPaths,
  });

  const blob = new Blob([markdown], { type: 'text/markdown' });
  markdownDownload.href = URL.createObjectURL(blob);
  markdownDownload.download = `${slug}.md`;
  markdownDownload.textContent = `Download ${slug}.md`;
  packagePreview.textContent = markdown;

  recipeModal.close();
  packageModal.showModal();
});

function handleEditorPaste(event, section) {
  const items = [...(event.clipboardData?.items || [])];
  const imageItems = items.filter((item) => item.type.startsWith('image/'));
  if (!imageItems.length) return;

  event.preventDefault();

  imageItems.forEach((item) => {
    const file = item.getAsFile();
    if (!file) return;

    const fileName = file.name || `${section}-${Date.now()}.png`;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || '');
      attachments.push({ dataUrl, fileName, section });
      injectInlineImage(event.target, dataUrl, fileName);
      renderAttachmentPreview();
    };
    reader.readAsDataURL(file);
  });
}

function injectInlineImage(editor, src, name) {
  const image = document.createElement('img');
  image.src = src;
  image.alt = name;
  image.className = 'inline-image';

  const lineBreak = document.createElement('div');
  lineBreak.append(image);
  editor.append(lineBreak);
}

function renderAttachmentPreview() {
  attachmentPreview.innerHTML = '';
  attachments.forEach((file, idx) => {
    const tag = document.createElement('div');
    tag.className = 'attachment-chip';
    tag.innerHTML = `<img src="${file.dataUrl}" alt="${file.fileName}" /><span>${idx + 1}. ${file.fileName}</span><small>${file.section}</small>`;
    attachmentPreview.append(tag);
  });
}

function extractTextLinesFromEditor(editor) {
  return editor.innerText
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

function renderTagChips(recipeList) {
  const tagCounts = new Map();
  recipeList.forEach((recipe) => recipe.tags.forEach((tag) => tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1)));

  const popularTags = [...tagCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([tag]) => tag);

  chipBar.innerHTML = '';
  popularTags.forEach((tag) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'chip';
    button.textContent = `#${tag}`;

    button.addEventListener('click', () => {
      activeChip = activeChip === tag ? '' : tag;
      tagFilterInput.value = activeChip;
      applyFilters();
      [...chipBar.children].forEach((chip) => chip.classList.remove('active'));
      if (activeChip) button.classList.add('active');
    });

    chipBar.append(button);
  });
}

function applyFilters() {
  const query = searchInput.value.trim().toLowerCase();
  const requiredTags = parseTags(tagFilterInput.value);
  const maxCaloriesRaw = calorieFilterInput.value.trim();
  const maxCalories = maxCaloriesRaw ? Number(maxCaloriesRaw) : null;

  filteredRecipes = recipes.filter((recipe) => {
    const content = `${recipe.title}\n${recipe.ingredients}\n${recipe.instructions}\n${recipe.tags.join(' ')}`.toLowerCase();
    const inText = query.length === 0 || content.includes(query);
    const tagMatch = requiredTags.every((tag) => recipe.tags.includes(tag));
    const calorieMatch = maxCalories === null || recipe.calories <= maxCalories;
    return inText && tagMatch && calorieMatch;
  });

  filteredRecipes = sortRecipes(filteredRecipes, sortSelect.value);
  renderGallery(filteredRecipes);
  resultCount.textContent = `${filteredRecipes.length} result${filteredRecipes.length === 1 ? '' : 's'}`;
}

function sortRecipes(list, mode) {
  const copy = [...list];
  if (mode === 'calories_asc') return copy.sort((a, b) => a.calories - b.calories);
  if (mode === 'calories_desc') return copy.sort((a, b) => b.calories - a.calories);
  if (mode === 'title_asc') return copy.sort((a, b) => a.title.localeCompare(b.title));
  return copy;
}

function renderGallery(list) {
  gallery.innerHTML = '';

  if (!list.length) {
    gallery.innerHTML = '<p class="muted">No recipes matched your filters.</p>';
    return;
  }

  list.forEach((recipe) => {
    const node = template.content.firstElementChild.cloneNode(true);
    node.dataset.recipeId = recipe.id;

    const cover = node.querySelector('.cover');
    const thumbs = node.querySelector('.thumbs');
    const title = recipe.title || 'Untitled recipe';
    const imageUrls = recipe.images.length ? recipe.images : [placeholder(title)];

    cover.src = imageUrls[0];
    cover.alt = title;

    imageUrls.slice(1, 5).forEach((src) => {
      const thumb = document.createElement('img');
      thumb.src = src;
      thumb.alt = title;
      thumbs.append(thumb);
    });

    node.querySelector('.title').textContent = title;
    node.querySelector('.meta').textContent = `Calories: ${Number.isFinite(recipe.calories) ? recipe.calories : 0}`;
    node.querySelector('.tags').textContent = `Tags: ${recipe.tags.join(', ') || 'none'}`;

    node.addEventListener('click', () => openRecipeDetail(recipe));
    node.addEventListener('keypress', (event) => {
      if (event.key === 'Enter') openRecipeDetail(recipe);
    });

    gallery.append(node);
  });
}

function openRecipeDetail(recipe) {
  detailTitle.textContent = recipe.title || 'Untitled recipe';
  detailMeta.textContent = `Calories: ${recipe.calories} • Tags: ${recipe.tags.join(', ')}`;
  detailIngredients.textContent = recipe.ingredients;
  detailInstructions.textContent = recipe.instructions;

  detailImages.innerHTML = '';
  const imageUrls = recipe.images.length ? recipe.images : [placeholder(recipe.title || 'recipe')];
  imageUrls.forEach((src) => {
    const image = document.createElement('img');
    image.src = src;
    image.alt = recipe.title;
    detailImages.append(image);
  });

  detailModal.showModal();
}

async function loadRecipesFromRepo() {
  const indexUrl = resolveRepoUrl('recipes/index.json');
  const index = await fetch(indexUrl).then((response) => response.json());

  const items = await Promise.all(
    index.map((path) => fetch(resolveRepoUrl(path)).then((response) => response.text()))
  );

  return items.map((text, idx) => parseRecipeMarkdown(text, idx));
}

function resolveRepoUrl(path) {
  const cleaned = path.replace(/^\.\//, '').replace(/^\//, '');
  return `${window.location.origin}${APP_BASE_PATH}${cleaned}`;
}

function getAppBasePath() {
  const pathname = window.location.pathname;
  if (pathname.endsWith('/')) return pathname;

  const lastPart = pathname.split('/').pop() || '';
  if (lastPart.includes('.')) {
    return pathname.slice(0, pathname.lastIndexOf('/') + 1);
  }

  return `${pathname}/`;
}

function parseRecipeMarkdown(markdown, index) {
  const normalized = markdown.replace(/\r\n/g, '\n');
  const match = normalized.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  const rawFrontmatter = match ? match[1] : '';
  const body = match ? match[2] : normalized;

  const title = getFrontmatterValue(rawFrontmatter, 'title') || `Recipe ${index + 1}`;
  const calories = Number(getFrontmatterValue(rawFrontmatter, 'calories') || 0);
  const tags = parseTags(getFrontmatterValue(rawFrontmatter, 'tags') || '');
  const images = parseFrontmatterArray(rawFrontmatter, 'images');

  return {
    id: `${slugify(title)}-${index}`,
    title,
    calories,
    tags,
    images,
    ingredients: extractSection(body, 'Ingredients'),
    instructions: extractSection(body, 'Instructions'),
  };
}

function getFrontmatterValue(frontmatter, key) {
  const match = frontmatter.match(new RegExp(`^${key}:\\s*(.*)$`, 'm'));
  return match ? match[1].trim() : '';
}

function parseFrontmatterArray(frontmatter, key) {
  const lines = frontmatter.split('\n');
  const start = lines.findIndex((line) => line.trim() === `${key}:`);
  if (start === -1) return [];

  const values = [];
  for (let i = start + 1; i < lines.length; i += 1) {
    const line = lines[i].trim();
    if (!line.startsWith('- ')) break;
    values.push(line.slice(2).trim());
  }
  return values;
}

function extractSection(markdownBody, sectionName) {
  const pattern = new RegExp(`##\\s+${sectionName}\\n([\\s\\S]*?)(?=\\n##\\s+|$)`);
  const match = markdownBody.match(pattern);
  return (match ? match[1] : '').trim();
}

function buildMarkdown({ title, calories, tags, ingredients, instructions, imagePaths }) {
  return `---
title: ${title}
calories: ${calories}
tags: ${tags.join(', ')}
images:
${imagePaths.map((path) => `  - ${path}`).join('\n') || '  - https://placehold.co/1200x800?text=Paste+Images+Here'}
---

## Ingredients
${ingredients.map((line) => `- ${line}`).join('\n')}

## Instructions
${instructions.map((line, idx) => `${idx + 1}. ${line}`).join('\n')}
`;
}

function parseTags(raw) {
  return raw
    .split(',')
    .map((tag) => tag.trim().toLowerCase())
    .filter(Boolean);
}

function getValue(id) {
  return document.getElementById(id).value;
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
}

function placeholder(name) {
  return `https://placehold.co/1200x800?text=${encodeURIComponent(name)}`;
}
