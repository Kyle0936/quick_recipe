const BUILD_VERSION = '2026-04-03-f';
const APP_BASE_PATH = getAppBasePath();
const THEME_KEY = 'qrv_theme';
const LANG_KEY = 'qrv_lang';

const I18N = {
  en: {
    app_title: 'Quick Recipe Vault', app_subtitle: 'Discover recipes in a friendly, visual feed.',
    theme_toggle: '🌙 Night mode', lucky_button: "🎲 I'm Feeling Hungry", create_recipe: '＋ Create Recipe',
    search_label: 'Search', search_ph: 'title / ingredient / instructions',
    tags_label: 'Tags (comma separated)', tags_ph: 'bakery, low-calorie, hosting-event',
    cal_cap: 'Calories cap', cal_ph: 'e.g. 700', sort_label: 'Sort by', sort_newest: 'Newest in list',
    sort_cal_asc: 'Calories: low to high', sort_cal_desc: 'Calories: high to low', sort_title: 'Title: A to Z',
    clear_filters: 'Clear filters', recipe_feed: 'Recipe Feed', ingredients: 'Ingredients', instructions: 'Instructions',
    close: 'Close', create_recipe_title: 'Create recipe',
    create_recipe_hint: 'Paste text and images directly into the editors (Jira-like). Images become attachments.',
    recipe_title: 'Recipe title', calories: 'Calories', tags: 'Tags (comma-separated)',
    ingredients_editor: 'Ingredients editor (you can paste images)', instructions_editor: 'Instructions editor (you can paste images)',
    cancel: 'Cancel', generate_recipe_file: 'Generate recipe file', recipe_file_generated: 'Recipe file generated',
    result_word: 'result', results_word: 'results', tags_word: 'Tags', no_match: 'No recipes matched your filters.',
    untitled: 'Untitled recipe'
  },
  zh: {
    app_title: '快捷菜谱库', app_subtitle: '用更友好的可视化方式发现菜谱。',
    theme_toggle: '☀️ 日间模式', lucky_button: '🎲 今天吃什么', create_recipe: '＋ 新建菜谱',
    search_label: '搜索', search_ph: '标题 / 食材 / 步骤',
    tags_label: '标签（逗号分隔）', tags_ph: '烘焙, 低卡, 聚会大餐',
    cal_cap: '卡路里上限', cal_ph: '例如 700', sort_label: '排序', sort_newest: '按列表顺序',
    sort_cal_asc: '卡路里：低到高', sort_cal_desc: '卡路里：高到低', sort_title: '标题：A 到 Z',
    clear_filters: '清空筛选', recipe_feed: '菜谱流', ingredients: '食材', instructions: '步骤',
    close: '关闭', create_recipe_title: '新建菜谱',
    create_recipe_hint: '可直接在编辑框里粘贴文本和图片（类似 Jira），图片会作为附件。',
    recipe_title: '菜谱标题', calories: '卡路里', tags: '标签（逗号分隔）',
    ingredients_editor: '食材编辑框（可粘贴图片）', instructions_editor: '步骤编辑框（可粘贴图片）',
    cancel: '取消', generate_recipe_file: '生成菜谱文件', recipe_file_generated: '菜谱文件已生成',
    result_word: '条结果', results_word: '条结果', tags_word: '标签', no_match: '没有匹配到菜谱。',
    untitled: '未命名菜谱'
  }
};

const gallery = document.getElementById('gallery');
const template = document.getElementById('card-template');
const resultCount = document.getElementById('result-count');
const chipBar = document.getElementById('tag-chip-bar');
const appVersion = document.getElementById('app-version');
const langSwitch = document.getElementById('lang-switch');
const themeToggle = document.getElementById('theme-toggle');

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
let currentLang = localStorage.getItem(LANG_KEY) || 'en';
let recipes = [];
let filteredRecipes = [];
let activeChip = '';

initialize();

async function initialize() {
  appVersion.textContent = `UI build ${BUILD_VERSION}`;
  applyTheme(localStorage.getItem(THEME_KEY) || 'light');
  langSwitch.value = currentLang;
  applyLanguage();

  recipes = await loadRecipesFromRepo();
  renderTagChips(recipes);
  applyFilters();
}

langSwitch.addEventListener('change', () => {
  currentLang = langSwitch.value;
  localStorage.setItem(LANG_KEY, currentLang);
  applyLanguage();
  renderTagChips(recipes);
  applyFilters();
});

themeToggle.addEventListener('click', () => {
  const current = document.documentElement.dataset.theme || 'light';
  const next = current === 'light' ? 'dark' : 'light';
  applyTheme(next);
  localStorage.setItem(THEME_KEY, next);
});

searchInput.addEventListener('input', applyFilters);
tagFilterInput.addEventListener('input', () => { activeChip = ''; applyFilters(); });
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

  const markdown = buildMarkdown({ title, calories, tags, ingredients: ingredientLines, instructions: instructionLines, imagePaths: attachmentPaths });
  const blob = new Blob([markdown], { type: 'text/markdown' });
  markdownDownload.href = URL.createObjectURL(blob);
  markdownDownload.download = `${slug}.md`;
  markdownDownload.textContent = `Download ${slug}.md`;
  packagePreview.textContent = markdown;

  recipeModal.close();
  packageModal.showModal();
});

function applyLanguage() {
  const dict = I18N[currentLang];
  document.documentElement.lang = currentLang === 'zh' ? 'zh-CN' : 'en';
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.dataset.i18n;
    if (dict[key]) el.childNodes[0].nodeValue = dict[key];
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
    const key = el.dataset.i18nPlaceholder;
    if (dict[key]) el.placeholder = dict[key];
  });
  themeToggle.textContent = (document.documentElement.dataset.theme || 'light') === 'light' ? dict.theme_toggle : (currentLang === 'zh' ? '🌙 夜间模式' : '☀️ Light mode');
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  applyLanguage();
}

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
  return editor.innerText.split('\n').map((line) => line.trim()).filter(Boolean);
}

function renderTagChips(recipeList) {
  const tagCounts = new Map();
  recipeList.forEach((recipe) => recipe.tags.forEach((tag) => tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1)));

  const popularTags = [...tagCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12).map(([tag]) => tag);
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
  const dict = I18N[currentLang];
  const query = searchInput.value.trim().toLowerCase();
  const requiredTags = parseTags(tagFilterInput.value);
  const maxCaloriesRaw = calorieFilterInput.value.trim();
  const maxCalories = maxCaloriesRaw ? Number(maxCaloriesRaw) : null;

  filteredRecipes = recipes.filter((recipe) => {
    const content = `${recipe.title}\n${recipe.ingredients}\n${recipe.instructions}\n${recipe.tags.join(' ')}`.toLowerCase();
    return (query.length === 0 || content.includes(query)) && requiredTags.every((tag) => recipe.tags.includes(tag)) && (maxCalories === null || recipe.calories <= maxCalories);
  });

  filteredRecipes = sortRecipes(filteredRecipes, sortSelect.value);
  renderGallery(filteredRecipes);
  resultCount.textContent = `${filteredRecipes.length} ${filteredRecipes.length === 1 ? dict.result_word : dict.results_word}`;
}

function sortRecipes(list, mode) {
  const copy = [...list];
  if (mode === 'calories_asc') return copy.sort((a, b) => a.calories - b.calories);
  if (mode === 'calories_desc') return copy.sort((a, b) => b.calories - a.calories);
  if (mode === 'title_asc') return copy.sort((a, b) => a.title.localeCompare(b.title));
  return copy;
}

function renderGallery(list) {
  const dict = I18N[currentLang];
  gallery.innerHTML = '';
  if (!list.length) {
    gallery.innerHTML = `<p class="muted">${dict.no_match}</p>`;
    return;
  }

  list.forEach((recipe) => {
    const node = template.content.firstElementChild.cloneNode(true);
    node.dataset.recipeId = recipe.id;
    const cover = node.querySelector('.cover');
    const thumbs = node.querySelector('.thumbs');
    const title = recipe.title || dict.untitled;
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
    node.querySelector('.meta').textContent = `${I18N[currentLang].calories}: ${Number.isFinite(recipe.calories) ? recipe.calories : 0}`;
    node.querySelector('.tags').textContent = `${I18N[currentLang].tags_word}: ${recipe.tags.join(', ') || 'none'}`;

    node.addEventListener('click', () => openRecipeDetail(recipe));
    node.addEventListener('keypress', (event) => { if (event.key === 'Enter') openRecipeDetail(recipe); });
    gallery.append(node);
  });
}

function openRecipeDetail(recipe) {
  detailTitle.textContent = recipe.title || I18N[currentLang].untitled;
  detailMeta.textContent = `${I18N[currentLang].calories}: ${recipe.calories} • ${I18N[currentLang].tags_word}: ${recipe.tags.join(', ')}`;
  detailIngredients.textContent = recipe.ingredients;
  detailInstructions.textContent = recipe.instructions;
  detailImages.innerHTML = '';

  const imageUrls = recipe.images.length ? recipe.images : [placeholder(recipe.title || 'recipe')];
  imageUrls.forEach((src) => {
    const image = document.createElement('img');
    image.src = src;
    image.alt = recipe.title;
    image.loading = 'lazy';
    detailImages.append(image);
  });

  detailModal.showModal();
}

async function loadRecipesFromRepo() {
  const indexUrl = resolveRepoUrl('recipes/index.json');
  const index = await fetch(indexUrl).then((response) => response.json());
  const items = await Promise.all(index.map((path) => fetch(resolveRepoUrl(path)).then((response) => response.text())));
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
  if (lastPart.includes('.')) return pathname.slice(0, pathname.lastIndexOf('/') + 1);
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

  return { id: `${slugify(title)}-${index}`, title, calories, tags, images, ingredients: extractSection(body, 'Ingredients'), instructions: extractSection(body, 'Instructions') };
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
  return `---\ntitle: ${title}\ncalories: ${calories}\ntags: ${tags.join(', ')}\nimages:\n${imagePaths.map((path) => `  - ${path}`).join('\n') || '  - https://placehold.co/1200x800?text=Paste+Images+Here'}\n---\n\n## Ingredients\n${ingredients.map((line) => `- ${line}`).join('\n')}\n\n## Instructions\n${instructions.map((line, idx) => `${idx + 1}. ${line}`).join('\n')}\n`;
}

function parseTags(raw) {
  return raw.split(',').map((tag) => tag.trim().toLowerCase()).filter(Boolean);
}

function getValue(id) { return document.getElementById(id).value; }
function slugify(value) { return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80); }
function placeholder(name) { return `https://placehold.co/1200x800?text=${encodeURIComponent(name)}`; }
