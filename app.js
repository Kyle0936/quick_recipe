const BUILD_VERSION = '2026-04-04-g';
const APP_BASE_PATH = getAppBasePath();
const THEME_KEY = 'qrv_theme';
const LANG_KEY = 'qrv_lang';

const I18N = {
  en: { app_title:'Quick Recipe Vault',app_subtitle:'Discover recipes in a friendly, visual feed.',theme_toggle:'🌙 Night mode',lucky_button:"🎲 I'm Feeling Hungry",create_recipe:'＋ Create Recipe',search_label:'Search',search_ph:'title / ingredient / instructions',tags_label:'Tags (comma separated)',tags_ph:'bakery, low-calorie, hosting-event',cal_cap:'Calories cap',cal_ph:'e.g. 700',sort_label:'Sort by',sort_newest:'Newest in list',sort_cal_asc:'Calories: low to high',sort_cal_desc:'Calories: high to low',sort_title:'Title: A to Z',clear_filters:'Clear filters',recipe_feed:'Recipe Feed',ingredients:'Ingredients',instructions:'Instructions',close:'Close',create_recipe_title:'Create recipe',create_recipe_hint:'Paste text and images directly into the editors (Jira-like). Images become attachments.',recipe_title:'Recipe title',calories:'Calories',tags:'Tags (comma-separated)',ingredients_editor:'Ingredients editor (you can paste images)',instructions_editor:'Instructions editor (you can paste images)',demo_editor:'Final dish demo (paste images)',cancel:'Cancel',generate_recipe_file:'Generate recipe file',recipe_file_generated:'Recipe file generated',result_word:'result',results_word:'results',tags_word:'Tags',no_match:'No recipes matched your filters.',untitled:'Untitled recipe',remove_image:'Remove image' },
  zh: { app_title:'快捷菜谱库',app_subtitle:'用更友好的可视化方式发现菜谱。',theme_toggle:'☀️ 日间模式',lucky_button:'🎲 今天吃什么',create_recipe:'＋ 新建菜谱',search_label:'搜索',search_ph:'标题 / 食材 / 步骤',tags_label:'标签（逗号分隔）',tags_ph:'烘焙, 低卡, 聚会大餐',cal_cap:'卡路里上限',cal_ph:'例如 700',sort_label:'排序',sort_newest:'按列表顺序',sort_cal_asc:'卡路里：低到高',sort_cal_desc:'卡路里：高到低',sort_title:'标题：A 到 Z',clear_filters:'清空筛选',recipe_feed:'菜谱流',ingredients:'食材',instructions:'步骤',close:'关闭',create_recipe_title:'新建菜谱',create_recipe_hint:'可直接在编辑框里粘贴文本和图片（类似 Jira），图片会作为附件。',recipe_title:'菜谱标题',calories:'卡路里',tags:'标签（逗号分隔）',ingredients_editor:'食材编辑框（可粘贴图片）',instructions_editor:'步骤编辑框（可粘贴图片）',demo_editor:'成品演示（可粘贴图片）',cancel:'取消',generate_recipe_file:'生成菜谱文件',recipe_file_generated:'菜谱文件已生成',result_word:'条结果',results_word:'条结果',tags_word:'标签',no_match:'没有匹配到菜谱。',untitled:'未命名菜谱',remove_image:'移除图片' }
};

const el = (id) => document.getElementById(id);
const gallery = el('gallery');
const template = el('card-template');
const resultCount = el('result-count');
const chipBar = el('tag-chip-bar');
const appVersion = el('app-version');
const langSwitch = el('lang-switch');
const themeToggle = el('theme-toggle');
const searchInput = el('search-input');
const tagFilterInput = el('tag-filter');
const calorieFilterInput = el('calorie-filter');
const sortSelect = el('sort-select');
const clearFiltersButton = el('clear-filters');
const luckyButton = el('lucky-button');
const detailModal = el('recipe-detail-modal');
const closeDetailButton = el('close-detail');
const detailTitle = el('detail-title');
const detailMeta = el('detail-meta');
const detailImages = el('detail-images');
const detailIngredients = el('detail-ingredients');
const detailInstructions = el('detail-instructions');
const openModalButton = el('open-modal');
const recipeModal = el('recipe-modal');
const closeModalButton = el('close-modal');
const packageModal = el('package-modal');
const closePackageButton = el('close-package');
const packageForm = el('recipe-package-form');
const markdownDownload = el('download-markdown');
const packagePreview = el('package-preview');
const ingredientsEditor = el('m-ingredients-editor');
const instructionsEditor = el('m-instructions-editor');
const demoEditor = el('m-demo-editor');
const attachmentPreview = el('attachment-preview');

let attachments = [];
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

  setupEditor(ingredientsEditor, 'ingredients');
  setupEditor(instructionsEditor, 'instructions');
  setupEditor(demoEditor, 'demo');

  recipes = await loadRecipesFromRepo();
  renderTagChips(recipes);
  applyFilters();
}

function setupEditor(editor, section) {
  editor.addEventListener('paste', (event) => handleEditorPaste(event, section));
  editor.addEventListener('click', (event) => {
    const btn = event.target.closest('[data-remove-attachment]');
    if (!btn) return;
    const id = btn.getAttribute('data-remove-attachment');
    removeAttachment(id);
  });
  new MutationObserver(() => syncAttachmentsFromEditors()).observe(editor, { childList: true, subtree: true });
}

langSwitch.addEventListener('change', () => { currentLang = langSwitch.value; localStorage.setItem(LANG_KEY, currentLang); applyLanguage(); renderTagChips(recipes); applyFilters(); renderAttachmentPreview(); });
themeToggle.addEventListener('click', () => { const next = (document.documentElement.dataset.theme || 'light') === 'light' ? 'dark' : 'light'; applyTheme(next); localStorage.setItem(THEME_KEY, next); });
searchInput.addEventListener('input', applyFilters);
tagFilterInput.addEventListener('input', () => { activeChip = ''; applyFilters(); });
calorieFilterInput.addEventListener('input', applyFilters);
sortSelect.addEventListener('change', applyFilters);
clearFiltersButton.addEventListener('click', () => { searchInput.value=''; tagFilterInput.value=''; calorieFilterInput.value=''; sortSelect.value='newest'; activeChip=''; [...chipBar.children].forEach((chip)=>chip.classList.remove('active')); applyFilters(); });

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
attachmentPreview.addEventListener('click', (event) => {
  const btn = event.target.closest('[data-remove-attachment]');
  if (!btn) return;
  removeAttachment(btn.getAttribute('data-remove-attachment'));
});

packageForm.addEventListener('submit', (event) => {
  event.preventDefault();
  syncAttachmentsFromEditors();
  const title = getValue('m-title').trim();
  const slug = slugify(title);
  const markdown = buildMarkdown({
    title,
    calories: Number(getValue('m-calories')),
    tags: parseTags(getValue('m-tags')),
    ingredients: extractTextLinesFromEditor(ingredientsEditor),
    instructions: extractTextLinesFromEditor(instructionsEditor),
    demo: extractTextLinesFromEditor(demoEditor),
    imagePaths: attachments.map((item, idx) => `recipes/images/${slug}/${idx + 1}-${item.fileName}`),
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
  const imageItems = [...(event.clipboardData?.items || [])].filter((item) => item.type.startsWith('image/'));
  if (!imageItems.length) return;
  event.preventDefault();
  imageItems.forEach((item, idx) => {
    const file = item.getAsFile();
    if (!file) return;
    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}-${idx}`;
    const fileName = file.name || `${section}-${id}.png`;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || '');
      attachments.push({ id, dataUrl, fileName, section });
      insertAttachmentNode(event.target, { id, dataUrl, fileName });
      renderAttachmentPreview();
    };
    reader.readAsDataURL(file);
  });
}

function insertAttachmentNode(editor, attachment) {
  const wrap = document.createElement('div');
  wrap.className = 'inline-attachment';
  wrap.dataset.attachmentId = attachment.id;
  wrap.innerHTML = `<img class="inline-image" src="${attachment.dataUrl}" alt="${attachment.fileName}" /><button type="button" class="inline-remove" data-remove-attachment="${attachment.id}">×</button>`;
  editor.append(wrap);
}

function syncAttachmentsFromEditors() {
  const ids = new Set([...document.querySelectorAll('[data-attachment-id]')].map((n) => n.dataset.attachmentId));
  attachments = attachments.filter((a) => ids.has(a.id));
  renderAttachmentPreview();
}

function removeAttachment(id) {
  attachments = attachments.filter((item) => item.id !== id);
  document.querySelectorAll(`[data-attachment-id="${id}"]`).forEach((node) => node.remove());
  renderAttachmentPreview();
}

function renderAttachmentPreview() {
  attachmentPreview.innerHTML = '';
  attachments.forEach((file, idx) => {
    const card = document.createElement('div');
    card.className = 'attachment-chip';
    card.innerHTML = `<img src="${file.dataUrl}" alt="${file.fileName}" /><span>${idx + 1}. ${file.fileName}</span><small>${file.section}</small><button type="button" class="clear small" data-remove-attachment="${file.id}">${I18N[currentLang].remove_image}</button>`;
    attachmentPreview.append(card);
  });
}

function applyLanguage() {
  const dict = I18N[currentLang];
  document.documentElement.lang = currentLang === 'zh' ? 'zh-CN' : 'en';
  document.querySelectorAll('[data-i18n]').forEach((node) => {
    const key = node.dataset.i18n;
    if (dict[key]) node.childNodes[0].nodeValue = dict[key];
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach((node) => {
    const key = node.dataset.i18nPlaceholder;
    if (dict[key]) node.placeholder = dict[key];
  });
  themeToggle.textContent = (document.documentElement.dataset.theme || 'light') === 'light' ? dict.theme_toggle : (currentLang === 'zh' ? '🌙 夜间模式' : '☀️ Light mode');
}

function applyTheme(theme) { document.documentElement.dataset.theme = theme; applyLanguage(); }

function extractTextLinesFromEditor(editor) {
  const clone = editor.cloneNode(true);
  clone.querySelectorAll('.inline-remove').forEach((n) => n.remove());
  return clone.innerText.split('\n').map((line) => line.trim()).filter((line) => line && line !== '×');
}

function renderTagChips(recipeList) {
  const counts = new Map();
  recipeList.forEach((r) => r.tags.forEach((t) => counts.set(t, (counts.get(t) || 0) + 1)));
  chipBar.innerHTML = '';
  [...counts.entries()].sort((a,b)=>b[1]-a[1]).slice(0,12).forEach(([tag]) => {
    const btn = document.createElement('button');
    btn.type = 'button'; btn.className = 'chip'; btn.textContent = `#${tag}`;
    btn.addEventListener('click', () => { activeChip = activeChip===tag?'':tag; tagFilterInput.value = activeChip; applyFilters(); [...chipBar.children].forEach((c)=>c.classList.remove('active')); if (activeChip) btn.classList.add('active'); });
    chipBar.append(btn);
  });
}

function applyFilters() {
  const d = I18N[currentLang];
  const query = searchInput.value.trim().toLowerCase();
  const requiredTags = parseTags(tagFilterInput.value);
  const maxCalories = calorieFilterInput.value.trim() ? Number(calorieFilterInput.value.trim()) : null;
  filteredRecipes = sortRecipes(recipes.filter((r) => {
    const c = `${r.title}\n${r.ingredients}\n${r.instructions}\n${r.tags.join(' ')}`.toLowerCase();
    return (query.length===0 || c.includes(query)) && requiredTags.every((t)=>r.tags.includes(t)) && (maxCalories===null || r.calories<=maxCalories);
  }), sortSelect.value);
  renderGallery(filteredRecipes);
  resultCount.textContent = `${filteredRecipes.length} ${filteredRecipes.length===1?d.result_word:d.results_word}`;
}

function sortRecipes(list, mode) {
  const copy = [...list];
  if (mode==='calories_asc') return copy.sort((a,b)=>a.calories-b.calories);
  if (mode==='calories_desc') return copy.sort((a,b)=>b.calories-a.calories);
  if (mode==='title_asc') return copy.sort((a,b)=>a.title.localeCompare(b.title));
  return copy;
}

function renderGallery(list) {
  const d = I18N[currentLang];
  gallery.innerHTML = '';
  if (!list.length) { gallery.innerHTML = `<p class="muted">${d.no_match}</p>`; return; }
  list.forEach((r) => {
    const node = template.content.firstElementChild.cloneNode(true);
    node.dataset.recipeId = r.id;
    const imgs = r.images.length ? r.images : [placeholder(r.title || d.untitled)];
    node.querySelector('.cover').src = imgs[0];
    node.querySelector('.cover').alt = r.title || d.untitled;
    imgs.slice(1,5).forEach((src)=>{ const t=document.createElement('img'); t.src=src; t.alt=r.title||d.untitled; node.querySelector('.thumbs').append(t); });
    node.querySelector('.title').textContent = r.title || d.untitled;
    node.querySelector('.meta').textContent = `${d.calories}: ${Number.isFinite(r.calories)?r.calories:0}`;
    node.querySelector('.tags').textContent = `${d.tags_word}: ${r.tags.join(', ') || 'none'}`;
    node.addEventListener('click', ()=>openRecipeDetail(r));
    node.addEventListener('keypress', (e)=>{ if (e.key==='Enter') openRecipeDetail(r); });
    gallery.append(node);
  });
}

function openRecipeDetail(r) {
  const d = I18N[currentLang];
  detailTitle.textContent = r.title || d.untitled;
  detailMeta.textContent = `${d.calories}: ${r.calories} • ${d.tags_word}: ${r.tags.join(', ')}`;
  detailIngredients.textContent = r.ingredients;
  detailInstructions.textContent = r.instructions;
  detailImages.innerHTML = '';
  (r.images.length?r.images:[placeholder(r.title||'recipe')]).forEach((src)=>{ const i=document.createElement('img'); i.src=src; i.alt=r.title; i.loading='lazy'; detailImages.append(i); });
  detailModal.showModal();
}

async function loadRecipesFromRepo() {
  const index = await fetch(resolveRepoUrl('recipes/index.json')).then((r)=>r.json());
  const items = await Promise.all(index.map((p)=>fetch(resolveRepoUrl(p)).then((r)=>r.text())));
  return items.map((t,idx)=>parseRecipeMarkdown(t,idx));
}

function resolveRepoUrl(path) { return `${window.location.origin}${APP_BASE_PATH}${path.replace(/^\.\//,'').replace(/^\//,'')}`; }
function getAppBasePath() { const p=window.location.pathname; if (p.endsWith('/')) return p; const last=p.split('/').pop()||''; return last.includes('.')?p.slice(0,p.lastIndexOf('/')+1):`${p}/`; }

function parseRecipeMarkdown(markdown, index) {
  const normalized = markdown.replace(/\r\n/g, '\n');
  const m = normalized.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  const fm = m?m[1]:''; const body = m?m[2]:normalized;
  const title = getFrontmatterValue(fm,'title') || `Recipe ${index+1}`;
  return { id:`${slugify(title)}-${index}`, title, calories:Number(getFrontmatterValue(fm,'calories')||0), tags:parseTags(getFrontmatterValue(fm,'tags')||''), images:parseFrontmatterArray(fm,'images'), ingredients:extractSection(body,'Ingredients'), instructions:extractSection(body,'Instructions') };
}
function getFrontmatterValue(fm,key){ const m=fm.match(new RegExp(`^${key}:\\s*(.*)$`,'m')); return m?m[1].trim():''; }
function parseFrontmatterArray(fm,key){ const lines=fm.split('\n'); const start=lines.findIndex((l)=>l.trim()===`${key}:`); if(start===-1)return[]; const v=[]; for(let i=start+1;i<lines.length;i+=1){const line=lines[i].trim(); if(!line.startsWith('- ')) break; v.push(line.slice(2).trim());} return v; }
function extractSection(body,name){ const m=body.match(new RegExp(`##\\s+${name}\\n([\\s\\S]*?)(?=\\n##\\s+|$)`)); return (m?m[1]:'').trim(); }
function buildMarkdown({ title, calories, tags, ingredients, instructions, demo, imagePaths }) {
  return `---\ntitle: ${title}\ncalories: ${calories}\ntags: ${tags.join(', ')}\nimages:\n${imagePaths.map((p)=>`  - ${p}`).join('\n')||'  - https://placehold.co/1200x800?text=Paste+Images+Here'}\n---\n\n## Ingredients\n${ingredients.map((l)=>`- ${l}`).join('\n')}\n\n## Instructions\n${instructions.map((l,i)=>`${i+1}. ${l}`).join('\n')}\n\n## 成品演示\n${demo.map((l)=>`- ${l}`).join('\n')}\n`;
}
function parseTags(raw){ return raw.split(',').map((t)=>t.trim().toLowerCase()).filter(Boolean); }
function getValue(id){ return el(id).value; }
function slugify(v){ return v.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,80); }
function placeholder(n){ return `https://placehold.co/1200x800?text=${encodeURIComponent(n)}`; }
