const STORAGE_KEY = 'quick_recipe_vault_v1';

const form = document.getElementById('recipe-form');
const imageInput = document.getElementById('image');
const pasteArea = document.getElementById('paste-area');
const pastedPreview = document.getElementById('pasted-preview');
const recipesList = document.getElementById('recipes-list');
const template = document.getElementById('recipe-card-template');
const result = document.getElementById('random-result');
const randomButton = document.getElementById('pick-random');

const state = {
  recipes: loadRecipes(),
  pastedImageDataUrl: '',
};

renderRecipes();

form.addEventListener('submit', async (event) => {
  event.preventDefault();

  const fileImage = await readImageAsDataUrl(imageInput.files[0]);

  const recipe = {
    id: crypto.randomUUID(),
    name: getValue('name').trim(),
    calories: Number(getValue('calories')),
    tags: parseTags(getValue('tags')),
    ingredients: getValue('ingredients').trim(),
    instructions: getValue('instructions').trim(),
    imageDataUrl: fileImage || state.pastedImageDataUrl,
    createdAt: new Date().toISOString(),
  };

  state.recipes.unshift(recipe);
  saveRecipes();
  renderRecipes();
  clearPastedImage();
  form.reset();

  showResult(`Saved "${recipe.name}" successfully.`);
});

imageInput.addEventListener('change', async () => {
  if (!imageInput.files[0]) {
    return;
  }

  state.pastedImageDataUrl = await readImageAsDataUrl(imageInput.files[0]);
  showPastedPreview(state.pastedImageDataUrl);
});

pasteArea.addEventListener('paste', (event) => {
  const imageFile = extractImageFromPaste(event.clipboardData);
  if (!imageFile) {
    showResult('Clipboard does not contain an image.');
    return;
  }

  event.preventDefault();

  const reader = new FileReader();
  reader.onload = () => {
    state.pastedImageDataUrl = String(reader.result || '');
    showPastedPreview(state.pastedImageDataUrl);
    showResult('Image pasted successfully.');
  };
  reader.readAsDataURL(imageFile);
});

pasteArea.addEventListener('click', () => {
  pasteArea.focus();
});

randomButton.addEventListener('click', () => {
  const requiredTags = parseTags(getValue('filter-tags'));
  const maxCaloriesRaw = getValue('filter-max-calories').trim();
  const maxCalories = maxCaloriesRaw ? Number(maxCaloriesRaw) : null;

  const matches = state.recipes.filter((recipe) => {
    const tagsMatch = requiredTags.every((tag) => recipe.tags.includes(tag));
    const caloriesMatch = maxCalories === null || recipe.calories <= maxCalories;
    return tagsMatch && caloriesMatch;
  });

  if (matches.length === 0) {
    showResult('No matching recipes found. Try fewer filters.');
    return;
  }

  const picked = matches[Math.floor(Math.random() * matches.length)];
  showResult(
    [
      `🎲 ${picked.name}`,
      `Calories: ${picked.calories}`,
      `Tags: ${picked.tags.join(', ') || 'none'}`,
      '',
      'Ingredients:',
      picked.ingredients,
      '',
      'Instructions:',
      picked.instructions,
    ].join('\n')
  );
});

function renderRecipes() {
  recipesList.innerHTML = '';

  if (state.recipes.length === 0) {
    recipesList.innerHTML = '<p>No recipes saved yet.</p>';
    return;
  }

  state.recipes.forEach((recipe) => {
    const node = template.content.firstElementChild.cloneNode(true);
    const image = node.querySelector('.recipe-image');
    image.src = recipe.imageDataUrl || placeholderFor(recipe.name);

    node.querySelector('.recipe-title').textContent = recipe.name;
    node.querySelector('.recipe-meta').textContent = `Calories: ${recipe.calories}`;
    node.querySelector('.recipe-tags').textContent = `Tags: ${recipe.tags.join(', ') || 'none'}`;
    node.querySelector('.recipe-ingredients').textContent = recipe.ingredients;
    node.querySelector('.recipe-instructions').textContent = recipe.instructions;

    node.querySelector('.delete-recipe').addEventListener('click', () => {
      state.recipes = state.recipes.filter((item) => item.id !== recipe.id);
      saveRecipes();
      renderRecipes();
      showResult(`Deleted "${recipe.name}".`);
    });

    recipesList.append(node);
  });
}

function loadRecipes() {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    if (!Array.isArray(data)) return [];
    return data;
  } catch {
    return [];
  }
}

function saveRecipes() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.recipes));
}

function getValue(id) {
  return document.getElementById(id).value;
}

function parseTags(raw) {
  return raw
    .split(',')
    .map((tag) => tag.trim().toLowerCase())
    .filter(Boolean);
}

function showResult(text) {
  result.textContent = text;
  result.classList.remove('empty');
}

function placeholderFor(name) {
  return `https://placehold.co/600x380?text=${encodeURIComponent(name)}`;
}

function readImageAsDataUrl(file) {
  if (!file) return Promise.resolve('');

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function extractImageFromPaste(clipboardData) {
  const items = clipboardData?.items || [];
  for (const item of items) {
    if (item.type.startsWith('image/')) {
      return item.getAsFile();
    }
  }
  return null;
}

function showPastedPreview(dataUrl) {
  if (!dataUrl) {
    clearPastedImage();
    return;
  }

  pastedPreview.src = dataUrl;
  pastedPreview.classList.remove('hidden');
}

function clearPastedImage() {
  state.pastedImageDataUrl = '';
  pastedPreview.src = '';
  pastedPreview.classList.add('hidden');
}
