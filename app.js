const gallery = document.getElementById('gallery');
const template = document.getElementById('card-template');

const searchInput = document.getElementById('search-input');
const tagFilterInput = document.getElementById('tag-filter');
const calorieFilterInput = document.getElementById('calorie-filter');
const luckyButton = document.getElementById('lucky-button');

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

initialize();

async function initialize() {
  recipes = await loadRecipesFromRepo();
  applyFilters();
}

searchInput.addEventListener('input', applyFilters);
tagFilterInput.addEventListener('input', applyFilters);
calorieFilterInput.addEventListener('input', applyFilters);

luckyButton.addEventListener('click', () => {
  if (!filteredRecipes.length) return;
  const picked = filteredRecipes[Math.floor(Math.random() * filteredRecipes.length)];
  const target = document.querySelector(`[data-recipe-id="${picked.id}"]`);
  if (!target) return;

  document.querySelectorAll('.card.highlight').forEach((node) => node.classList.remove('highlight'));
  target.classList.add('highlight');
  target.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
});

openModalButton.addEventListener('click', () => recipeModal.showModal());
closeModalButton.addEventListener('click', () => recipeModal.close());
closePackageButton.addEventListener('click', () => packageModal.close());

modalImagesInput.addEventListener('change', () => {
  previewImages.innerHTML = '';
  for (const file of modalImagesInput.files) {
    const img = document.createElement('img');
    img.src = URL.createObjectURL(file);
    img.alt = file.name;
    previewImages.append(img);
  }
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

function applyFilters() {
  const query = searchInput.value.trim().toLowerCase();
  const requiredTags = parseTags(tagFilterInput.value);
  const maxCaloriesRaw = calorieFilterInput.value.trim();
  const maxCalories = maxCaloriesRaw ? Number(maxCaloriesRaw) : null;

  filteredRecipes = recipes.filter((recipe) => {
    const inText =
      query.length === 0 ||
      `${recipe.title}\n${recipe.ingredients}\n${recipe.instructions}\n${recipe.tags.join(' ')}`
        .toLowerCase()
        .includes(query);

    const tagMatch = requiredTags.every((tag) => recipe.tags.includes(tag));
    const calorieMatch = maxCalories === null || recipe.calories <= maxCalories;

    return inText && tagMatch && calorieMatch;
  });

  renderGallery(filteredRecipes);
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

    const imagesNode = node.querySelector('.card-images');
    const imageUrls = recipe.images.length ? recipe.images : [placeholder(recipe.title)];
    imageUrls.forEach((src) => {
      const img = document.createElement('img');
      img.src = src;
      img.alt = recipe.title;
      imagesNode.append(img);
    });

    node.querySelector('.title').textContent = recipe.title;
    node.querySelector('.meta').textContent = `Calories: ${recipe.calories}`;
    node.querySelector('.tags').textContent = `Tags: ${recipe.tags.join(', ') || 'none'}`;
    node.querySelector('.ingredients').textContent = recipe.ingredients;
    node.querySelector('.instructions').textContent = recipe.instructions;

    gallery.append(node);
  });
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

  const ingredients = extractSection(body, 'Ingredients');
  const instructions = extractSection(body, 'Instructions');

  return {
    id: `${slugify(title)}-${index}`,
    title,
    calories,
    tags,
    images,
    ingredients,
    instructions,
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
