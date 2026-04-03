const BUILD_VERSION = '2026-04-03-b';

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
const previewImages = document.getElementById('m-preview-images');
const modalImagesInput = document.getElementById('m-images');

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

modalImagesInput.addEventListener('change', () => {
  previewImages.innerHTML = '';
  [...modalImagesInput.files].forEach((file) => {
    const image = document.createElement('img');
    image.src = URL.createObjectURL(file);
    image.alt = file.name;
    previewImages.append(image);
  });
});

packageForm.addEventListener('submit', (event) => {
  event.preventDefault();

  const title = getValue('m-title').trim();
  const slug = slugify(title);
  const calories = Number(getValue('m-calories'));
  const tags = parseTags(getValue('m-tags'));
  const ingredients = linesFromTextarea(getValue('m-ingredients'));
  const instructions = linesFromTextarea(getValue('m-instructions'));
  const imagePaths = [...modalImagesInput.files].map((file) => `recipes/images/${slug}/${file.name}`);

  const markdown = buildMarkdown({ title, calories, tags, ingredients, instructions, imagePaths });
  const blob = new Blob([markdown], { type: 'text/markdown' });

  markdownDownload.href = URL.createObjectURL(blob);
  markdownDownload.download = `${slug}.md`;
  markdownDownload.textContent = `Download ${slug}.md`;
  packagePreview.textContent = markdown;

  recipeModal.close();
  packageModal.showModal();
});

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
    const imageUrls = recipe.images.length ? recipe.images : [placeholder(recipe.title)];

    cover.src = imageUrls[0];
    cover.alt = recipe.title;

    imageUrls.slice(1, 5).forEach((src) => {
      const thumb = document.createElement('img');
      thumb.src = src;
      thumb.alt = recipe.title;
      thumbs.append(thumb);
    });

    node.querySelector('.title').textContent = recipe.title;
    node.querySelector('.meta').textContent = `Calories: ${recipe.calories}`;
    node.querySelector('.tags').textContent = `Tags: ${recipe.tags.join(', ') || 'none'}`;

    node.addEventListener('click', () => openRecipeDetail(recipe));
    node.addEventListener('keypress', (event) => {
      if (event.key === 'Enter') openRecipeDetail(recipe);
    });

    gallery.append(node);
  });
}

function openRecipeDetail(recipe) {
  detailTitle.textContent = recipe.title;
  detailMeta.textContent = `Calories: ${recipe.calories} • Tags: ${recipe.tags.join(', ')}`;
  detailIngredients.textContent = recipe.ingredients;
  detailInstructions.textContent = recipe.instructions;

  detailImages.innerHTML = '';
  const imageUrls = recipe.images.length ? recipe.images : [placeholder(recipe.title)];
  imageUrls.forEach((src) => {
    const image = document.createElement('img');
    image.src = src;
    image.alt = recipe.title;
    detailImages.append(image);
  });

  detailModal.showModal();
}

async function loadRecipesFromRepo() {
  const index = await fetch('recipes/index.json').then((response) => response.json());
  const items = await Promise.all(index.map((path) => fetch(path).then((response) => response.text())));
  return items.map((text, idx) => parseRecipeMarkdown(text, idx));
}

function parseRecipeMarkdown(markdown, index) {
  const [, rawFrontmatter = '', body = ''] = markdown.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/) || [];

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
    values.push(line.replace('- ', '').trim());
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
${imagePaths.map((path) => `  - ${path}`).join('\n') || '  - https://placehold.co/1200x800?text=Add+an+image'}
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

function linesFromTextarea(raw) {
  return raw
    .split('\n')
    .map((line) => line.replace(/^[-\d.\s]+/, '').trim())
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
