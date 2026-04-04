const BUILD_VERSION = '2026-04-04-b';
const APP_BASE_PATH = getAppBasePath();
const THEME_KEY = 'qrv_theme';
const LANG_KEY = 'qrv_lang';
const FORM_KEY = 'qrv_gh';

const I18N = {
  en: { app_title:'Quick Recipe Vault',app_subtitle:'Discover recipes in a friendly, visual feed.',theme_toggle:'🌙 Night mode',lucky_button:"🎲 I'm Feeling Hungry",create_recipe:'＋ Create Recipe',search_label:'Search',search_ph:'title / ingredient / instructions',tags_label:'Tags',tags_ph:'choose existing tags',cal_cap:'Calories cap',smart_ing:'Smart ingredient search',smart_ing_ph:'e.g. beef, 牛肉',citation:'Citation link',cal_ph:'e.g. 700',sort_label:'Sort by',sort_newest:'Newest in list',sort_cal_asc:'Calories: low to high',sort_cal_desc:'Calories: high to low',sort_title:'Title: A to Z',clear_filters:'Clear filters',recipe_feed:'Recipe Feed',ingredients:'Ingredients',instructions:'Instructions',close:'Close',create_recipe_title:'Create recipe',recipe_title:'Recipe title',calories:'Calories',tags:'Tags',ingredients_editor:'Ingredients',instructions_editor:'Instructions',demo_editor:'Final dish demo',cancel:'Cancel',create_pr:'Create Pull Request',result_word:'result',results_word:'results',tags_word:'Tags',no_match:'No recipes matched your filters.',untitled:'Untitled recipe',remove_image:'Remove image',edit_recipe:'Edit',github_settings:'GitHub PR settings' },
  zh: { app_title:'快捷菜谱库',app_subtitle:'用更友好的可视化方式发现菜谱。',theme_toggle:'☀️ 日间模式',lucky_button:'🎲 今天吃什么',create_recipe:'＋ 新建菜谱',search_label:'搜索',search_ph:'标题 / 食材 / 步骤',tags_label:'标签',tags_ph:'仅使用已有标签',cal_cap:'卡路里上限',smart_ing:'智能食材搜索',smart_ing_ph:'例如 牛肉',citation:'原菜谱引用链接',cal_ph:'例如 700',sort_label:'排序',sort_newest:'按列表顺序',sort_cal_asc:'卡路里：低到高',sort_cal_desc:'卡路里：高到低',sort_title:'标题：A 到 Z',clear_filters:'清空筛选',recipe_feed:'菜谱流',ingredients:'食材',instructions:'步骤',close:'关闭',create_recipe_title:'新建菜谱',recipe_title:'菜谱标题',calories:'卡路里',tags:'标签',ingredients_editor:'食材',instructions_editor:'步骤',demo_editor:'成品演示',cancel:'取消',create_pr:'创建 PR',result_word:'条结果',results_word:'条结果',tags_word:'标签',no_match:'没有匹配到菜谱。',untitled:'未命名菜谱',remove_image:'移除图片',edit_recipe:'编辑',github_settings:'GitHub PR 设置' }
};


const INGREDIENT_SYNONYMS = {
  beef: ['beef', 'wagyu', 'short rib', 'brisket', 'beef shank', '牛肉', '牛肋条', '和牛'],
  chicken: ['chicken', 'drumstick', 'thigh', '鸡肉', '鸡腿'],
  pork: ['pork', 'bacon', 'ham', '猪肉'],
  fish: ['fish', 'salmon', 'cod', '鱼', '三文鱼']
};

const q = (id) => document.getElementById(id);
const els = {
  gallery:q('gallery'), template:q('card-template'), resultCount:q('result-count'), chipBar:q('tag-chip-bar'), appVersion:q('app-version'), langSwitch:q('lang-switch'), themeToggle:q('theme-toggle'), search:q('search-input'), tagFilter:q('tag-filter'), calorie:q('calorie-filter'), smartIng:q('smart-ingredient-input'), sort:q('sort-select'), clear:q('clear-filters'), lucky:q('lucky-button'), detailModal:q('recipe-detail-modal'), closeDetail:q('close-detail'), detailTitle:q('detail-title'), detailMeta:q('detail-meta'), detailImages:q('detail-images'), detailIngredients:q('detail-ingredients'), detailInstructions:q('detail-instructions'), detailCitation:q('detail-citation'), detailCitationWrap:q('detail-citation-wrap'), openModal:q('open-modal'), modal:q('recipe-modal'), closeModal:q('close-modal'), form:q('recipe-form'), formTitle:q('form-mode-title'), status:q('form-status'), title:q('m-title'), calories:q('m-calories'), tags:q('m-tags'), citation:q('m-citation'), ing:q('m-ingredients-editor'), ins:q('m-instructions-editor'), demo:q('m-demo-editor'), attachPreview:q('attachment-preview'), knownTags:q('known-tags'), ghOwner:q('gh-owner'), ghRepo:q('gh-repo'), ghBase:q('gh-base'), ghToken:q('gh-token')
};

let currentLang = localStorage.getItem(LANG_KEY) || 'en';
let recipes = [];
let knownTags = [];
let filtered = [];
let attachments = [];
let editRecipe = null;

init();

async function init() {
  els.appVersion.textContent = `UI build ${BUILD_VERSION}`;
  applyTheme(localStorage.getItem(THEME_KEY) || 'light');
  els.langSwitch.value = currentLang;
  applyLanguage();
  loadGhDefaults();

  setupEditor(els.ing, 'ingredients');
  setupEditor(els.ins, 'instructions');
  setupEditor(els.demo, 'demo');
  preventEnterSubmit(els.form);

  const [loadedRecipes, metadataTags] = await Promise.all([loadRecipesFromRepo(), loadKnownTags()]);
  recipes = loadedRecipes;
  knownTags = metadataTags.length ? metadataTags : deriveTags(recipes);
  renderKnownTags();
  renderTagChips();
  applyFilters();
}

function preventEnterSubmit(form) {
  form.addEventListener('keydown', (e) => {
    const t = e.target;
    if (e.key === 'Enter' && t.tagName === 'INPUT') e.preventDefault();
  });
}

function setupEditor(editor, section) {
  editor.addEventListener('paste', (e) => pasteImages(e, section));
  editor.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-remove-attachment]');
    if (btn) removeAttachment(btn.dataset.removeAttachment);
  });
  new MutationObserver(syncAttachments).observe(editor, { childList: true, subtree: true });
}

els.langSwitch.addEventListener('change', () => { currentLang = els.langSwitch.value; localStorage.setItem(LANG_KEY,currentLang); applyLanguage(); renderTagChips(); applyFilters(); renderAttachments(); });
els.themeToggle.addEventListener('click', () => { const next = document.documentElement.dataset.theme === 'dark' ? 'light':'dark'; applyTheme(next); localStorage.setItem(THEME_KEY,next); });
els.search.addEventListener('input', applyFilters);
els.tagFilter.addEventListener('input', applyFilters);
els.calorie.addEventListener('input', applyFilters);
els.smartIng.addEventListener('input', applyFilters);
els.sort.addEventListener('change', applyFilters);
els.clear.addEventListener('click', () => { els.search.value=''; els.tagFilter.value=''; els.calorie.value=''; els.smartIng.value=''; els.sort.value='newest'; applyFilters(); });
els.lucky.addEventListener('click', pickLucky);
els.openModal.addEventListener('click', () => openCreateModal());
els.closeModal.addEventListener('click', () => els.modal.close());
els.closeDetail.addEventListener('click', () => els.detailModal.close());
els.attachPreview.addEventListener('click', (e) => { const b=e.target.closest('[data-remove-attachment]'); if (b) removeAttachment(b.dataset.removeAttachment); });
els.form.addEventListener('submit', submitRecipe);

function applyLanguage() {
  const d = I18N[currentLang];
  document.querySelectorAll('[data-i18n]').forEach((n)=>{ const k=n.dataset.i18n; if(d[k]) n.childNodes[0].nodeValue=d[k]; });
  document.querySelectorAll('[data-i18n-placeholder]').forEach((n)=>{ const k=n.dataset.i18nPlaceholder; if(d[k]) n.placeholder=d[k]; });
  els.themeToggle.textContent = document.documentElement.dataset.theme === 'dark' ? (currentLang==='zh'?'🌙 夜间模式':'☀️ Light mode') : d.theme_toggle;
}

function applyTheme(theme){ document.documentElement.dataset.theme = theme; applyLanguage(); }

function renderKnownTags(){ els.knownTags.innerHTML=''; knownTags.forEach((t)=>{ const o=document.createElement('option'); o.value=t; els.knownTags.append(o); }); }
function deriveTags(rs){ return [...new Set(rs.flatMap((r)=>r.tags))].sort(); }

function renderTagChips(){
  els.chipBar.innerHTML='';
  knownTags.forEach((tag)=>{ const b=document.createElement('button'); b.type='button'; b.className='chip'; b.textContent=`#${tag}`; b.onclick=()=>{ els.tagFilter.value=tag; applyFilters(); }; els.chipBar.append(b); });
}

function normalizeTags(raw){ return raw.split(',').map((t)=>t.trim().toLowerCase()).filter((t)=>knownTags.includes(t)); }

function applyFilters(){
  const d = I18N[currentLang];
  const q = els.search.value.trim().toLowerCase();
  const required = normalizeTags(els.tagFilter.value);
  const cap = els.calorie.value ? Number(els.calorie.value) : null;
  const smartTerms = expandIngredientQuery(els.smartIng.value);
  filtered = recipes.filter((r)=>{
    const c = `${r.title}\n${r.ingredients}\n${r.instructions}\n${r.tags.join(' ')}`.toLowerCase();
    return (!q || c.includes(q)) && required.every((t)=>r.tags.includes(t)) && (cap===null || r.calories<=cap) && ingredientMatch(r, smartTerms);
  });
  filtered = sortRecipes(filtered, els.sort.value);
  renderGallery(filtered);
  els.resultCount.textContent = `${filtered.length} ${filtered.length===1?d.result_word:d.results_word}`;
}

function sortRecipes(list, mode){ const a=[...list]; if(mode==='calories_asc')return a.sort((x,y)=>x.calories-y.calories); if(mode==='calories_desc')return a.sort((x,y)=>y.calories-x.calories); if(mode==='title_asc')return a.sort((x,y)=>x.title.localeCompare(y.title)); return a; }

function renderGallery(list){
  const d=I18N[currentLang];
  els.gallery.innerHTML='';
  if(!list.length){ els.gallery.innerHTML=`<p class="muted">${d.no_match}</p>`; return; }
  list.forEach((r)=>{
    const n=els.template.content.firstElementChild.cloneNode(true);
    const imgs=r.images.length?r.images:[placeholder(r.title||d.untitled)];
    n.dataset.recipeId=r.id;
    n.querySelector('.cover').src=imgs[0];
    imgs.slice(1,5).forEach((s)=>{ const i=document.createElement('img'); i.src=s; n.querySelector('.thumbs').append(i); });
    n.querySelector('.title').textContent=r.title||d.untitled;
    n.querySelector('.meta').textContent=`${d.calories}: ${r.calories}`;
    n.querySelector('.tags').textContent=`${d.tags_word}: ${r.tags.join(', ')}`;
    n.querySelector('.edit-recipe').onclick=(e)=>{ e.stopPropagation(); openEditModal(r); };
    n.onclick=()=>openDetail(r);
    els.gallery.append(n);
  });
}

function openDetail(r){ const d=I18N[currentLang]; els.detailTitle.textContent=r.title; els.detailMeta.textContent=`${d.calories}: ${r.calories} • ${d.tags_word}: ${r.tags.join(', ')}`; els.detailIngredients.textContent=r.ingredients; els.detailInstructions.textContent=r.instructions;
  if (r.citation) { els.detailCitation.textContent = r.citation; els.detailCitation.href = r.citation; els.detailCitationWrap.style.display='block'; } else { els.detailCitationWrap.style.display='none'; }
  els.detailImages.innerHTML=''; (r.images.length?r.images:[placeholder(r.title)]).forEach((s)=>{ const i=document.createElement('img'); i.src=s; els.detailImages.append(i); }); els.detailModal.showModal(); }
function pickLucky(){ if(!filtered.length) return; openDetail(filtered[Math.floor(Math.random()*filtered.length)]); }

function openCreateModal(){ editRecipe=null; els.formTitle.textContent=I18N[currentLang].create_recipe_title; resetForm(); els.modal.showModal(); }
function openEditModal(r){ editRecipe=r; resetForm(); els.formTitle.textContent=`${I18N[currentLang].edit_recipe}: ${r.title}`; els.title.value=r.title; els.calories.value=r.calories; els.tags.value=r.tags.join(', '); els.citation.value=r.citation || ''; els.ing.innerText=r.ingredients; els.ins.innerText=r.instructions; els.demo.innerText=''; els.modal.showModal(); }
function resetForm(){ els.form.reset(); els.ing.innerHTML=''; els.ins.innerHTML=''; els.demo.innerHTML=''; attachments=[]; renderAttachments(); els.status.textContent=''; }

function pasteImages(e, section){
  const items=[...(e.clipboardData?.items||[])].filter((i)=>i.type.startsWith('image/'));
  if(!items.length) return;
  e.preventDefault();
  items.forEach((item,idx)=>{ const f=item.getAsFile(); if(!f) return; const id=`${Date.now()}-${idx}-${Math.random().toString(16).slice(2)}`; const rd=new FileReader(); rd.onload=()=>{ const dataUrl=String(rd.result||''); attachments.push({id,dataUrl,fileName:f.name||`${section}-${id}.png`,section}); insertInlineAttachment(e.target,{id,dataUrl,fileName:f.name||'image.png'}); renderAttachments(); }; rd.readAsDataURL(f); });
}

function insertInlineAttachment(editor,a){ const w=document.createElement('div'); w.className='inline-attachment'; w.dataset.attachmentId=a.id; w.innerHTML=`<img class="inline-image" src="${a.dataUrl}" alt="${a.fileName}" /><button type="button" class="inline-remove" data-remove-attachment="${a.id}">×</button>`; editor.append(w); }
function syncAttachments(){ const ids=new Set([...document.querySelectorAll('[data-attachment-id]')].map((n)=>n.dataset.attachmentId)); attachments=attachments.filter((a)=>ids.has(a.id)); renderAttachments(); }
function removeAttachment(id){ attachments=attachments.filter((a)=>a.id!==id); document.querySelectorAll(`[data-attachment-id="${id}"]`).forEach((n)=>n.remove()); renderAttachments(); }
function renderAttachments(){ els.attachPreview.innerHTML=''; attachments.forEach((a,idx)=>{ const c=document.createElement('div'); c.className='attachment-chip'; c.innerHTML=`<img src="${a.dataUrl}" /><span>${idx+1}. ${a.fileName}</span><small>${a.section}</small><button type="button" class="clear small" data-remove-attachment="${a.id}">${I18N[currentLang].remove_image}</button>`; els.attachPreview.append(c); }); }

async function submitRecipe(e){
  e.preventDefault();
  syncAttachments();
  const title=els.title.value.trim();
  const tags=normalizeTags(els.tags.value);
  if(!title){ els.status.textContent='Title is required'; return; }
  if(!tags.length){ els.status.textContent=currentLang==='zh'?'标签必须从已有标签中选择':'Tags must be chosen from existing tags'; return; }

  const owner=els.ghOwner.value.trim(); const repo=els.ghRepo.value.trim(); const base=els.ghBase.value.trim()||'main'; const token=els.ghToken.value.trim();
  if(!owner || !repo || !token){ els.status.textContent=currentLang==='zh'?'请填写 GitHub 信息和 token':'Please fill GitHub settings and token'; return; }
  saveGhDefaults();

  const fileName=toRecipeFileName(title)+'.md';
  const recipePath = editRecipe?.path || `recipes/${fileName}`;
  const slug = toRecipeFileName(title);
  const markdown = buildMarkdown({
    title, calories:Number(els.calories.value||0), tags, citation: els.citation.value.trim(),
    ingredients:extractLines(els.ing), instructions:extractLines(els.ins), demo:extractLines(els.demo),
    imagePaths:attachments.map((a,idx)=>`recipes/images/${slug}/${idx+1}-${a.fileName}`)
  });

  els.status.textContent = currentLang==='zh'?'正在创建 PR...':'Creating PR...';
  try {
    const prUrl = await createRecipePr({ owner, repo, token, base, recipePath, markdown, editPath: !!editRecipe });
    els.status.innerHTML = `<a href="${prUrl}" target="_blank">PR created: ${prUrl}</a>`;
    recipes = await loadRecipesFromRepo(); knownTags = (await loadKnownTags()).length ? await loadKnownTags() : deriveTags(recipes); renderKnownTags(); renderTagChips(); applyFilters();
  } catch(err){ els.status.textContent = `Error: ${err.message}`; }
}

async function createRecipePr({ owner, repo, token, base, recipePath, markdown, editPath }) {
  const api = (p) => `https://api.github.com/repos/${owner}/${repo}${p}`;
  const headers = { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' };

  const baseRef = await fetch(api(`/git/ref/heads/${base}`), { headers }).then(r => r.json());
  const sha = baseRef.object.sha;
  const branch = `recipe-${Date.now()}`;
  await fetch(api('/git/refs'), { method:'POST', headers:{...headers,'Content-Type':'application/json'}, body:JSON.stringify({ ref:`refs/heads/${branch}`, sha }) });

  const indexMeta = await getContent(api('/contents/recipes/index.json'), headers, branch);
  const list = JSON.parse(atob(indexMeta.content));
  if (!list.includes(recipePath)) list.push(recipePath);

  const recipeExisting = await getContent(api(`/contents/${recipePath}`), headers, branch, true);
  await putContent(api(`/contents/${recipePath}`), headers, branch, `Save recipe ${recipePath}`, markdown, recipeExisting?.sha);
  await putContent(api('/contents/recipes/index.json'), headers, branch, 'Update recipe index', JSON.stringify(list, null, 2) + '\n', indexMeta.sha);

  const pr = await fetch(api('/pulls'), { method:'POST', headers:{...headers,'Content-Type':'application/json'}, body:JSON.stringify({ title: editPath ? `Edit recipe: ${recipePath}` : `Add recipe: ${recipePath}`, head:branch, base, body:'Recipe update from Quick Recipe Vault UI.' }) }).then(r=>r.json());
  return pr.html_url;
}

async function getContent(url, headers, branch, allow404=false) {
  const res = await fetch(`${url}?ref=${branch}`, { headers });
  if (allow404 && res.status === 404) return null;
  if (!res.ok) throw new Error(`GitHub content fetch failed: ${res.status}`);
  return res.json();
}
async function putContent(url, headers, branch, message, text, sha) {
  const body = { message, content: btoa(unescape(encodeURIComponent(text))), branch };
  if (sha) body.sha = sha;
  const res = await fetch(url, { method:'PUT', headers:{...headers,'Content-Type':'application/json'}, body:JSON.stringify(body) });
  if (!res.ok) throw new Error(`GitHub content update failed: ${res.status}`);
  return res.json();
}

function extractLines(editor){ const c=editor.cloneNode(true); c.querySelectorAll('.inline-remove').forEach((n)=>n.remove()); return c.innerText.split('\n').map((s)=>s.trim()).filter(Boolean); }
function buildMarkdown({ title, calories, tags, citation, ingredients, instructions, demo, imagePaths }){ return `---\ntitle: ${title}\ncalories: ${calories}\ntags: ${tags.join(', ')}\ncitation: ${citation || ''}\nimages:\n${imagePaths.map((p)=>`  - ${p}`).join('\n')||'  - https://placehold.co/1200x800?text=Recipe'}\n---\n\n## Ingredients\n${ingredients.map((x)=>`- ${x}`).join('\n')}\n\n## Instructions\n${instructions.map((x,i)=>`${i+1}. ${x}`).join('\n')}\n\n## 成品演示\n${demo.map((x)=>`- ${x}`).join('\n')}\n`; }
function toRecipeFileName(title){ return title.trim().replace(/\s+/g,'-').replace(/[\\/:*?"<>|]/g,'').toLowerCase(); }

async function loadKnownTags(){ try { return (await fetch(resolveRepoUrl('recipes/metadata.json')).then(r=>r.json())).tags || []; } catch { return []; } }
async function loadRecipesFromRepo(){ const index = await fetch(resolveRepoUrl('recipes/index.json')).then(r=>r.json()); const items = await Promise.all(index.map((p)=>fetch(resolveRepoUrl(p)).then(r=>r.text()))); return items.map((t,i)=>parseRecipeMarkdown(t,i,index[i])); }
function parseRecipeMarkdown(md, idx, path){ const m=md.replace(/\r\n/g,'\n').match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/); const fm=m?m[1]:''; const body=m?m[2]:md; const title=getFm(fm,'title')||`Recipe ${idx+1}`; return { id:`${idx}-${title}`, path, title, calories:Number(getFm(fm,'calories')||0), tags:getFm(fm,'tags').split(',').map(s=>s.trim().toLowerCase()).filter(Boolean), citation:getFm(fm,'citation'), images:getArrayFm(fm,'images'), ingredients:getSec(body,'Ingredients'), instructions:getSec(body,'Instructions') }; }
function getFm(fm,key){ const m=fm.match(new RegExp(`^${key}:\\s*(.*)$`,'m')); return m?m[1].trim():''; }
function getArrayFm(fm,key){ const l=fm.split('\n'); const s=l.findIndex((x)=>x.trim()===`${key}:`); if(s===-1)return[]; const v=[]; for(let i=s+1;i<l.length;i++){const t=l[i].trim(); if(!t.startsWith('- '))break; v.push(t.slice(2).trim());} return v; }
function getSec(body,name){ const m=body.match(new RegExp(`##\\s+${name}\\n([\\s\\S]*?)(?=\\n##\\s+|$)`)); return (m?m[1]:'').trim(); }

function expandIngredientQuery(raw) {
  const q = raw.trim().toLowerCase();
  if (!q) return [];
  const direct = [q];
  for (const [key, values] of Object.entries(INGREDIENT_SYNONYMS)) {
    if (key === q || values.some((v) => q.includes(v) || v.includes(q))) return [key, ...values];
  }
  return direct;
}

function ingredientMatch(recipe, smartTerms) {
  if (!smartTerms.length) return true;
  const haystack = `${recipe.ingredients} ${recipe.instructions} ${recipe.title}`.toLowerCase();
  return smartTerms.some((term) => haystack.includes(term));
}

function resolveRepoUrl(path){ return `${window.location.origin}${APP_BASE_PATH}${path.replace(/^\.\//,'').replace(/^\//,'')}`; }
function getAppBasePath(){ const p=window.location.pathname; if(p.endsWith('/')) return p; const last=p.split('/').pop()||''; return last.includes('.')?p.slice(0,p.lastIndexOf('/')+1):`${p}/`; }
function placeholder(n){ return `https://placehold.co/1200x800?text=${encodeURIComponent(n)}`; }
function loadGhDefaults(){ try { const v=JSON.parse(localStorage.getItem(FORM_KEY)||'{}'); els.ghOwner.value=v.owner||''; els.ghRepo.value=v.repo||''; els.ghBase.value=v.base||'main'; } catch {} }
function saveGhDefaults(){ localStorage.setItem(FORM_KEY, JSON.stringify({ owner:els.ghOwner.value.trim(), repo:els.ghRepo.value.trim(), base:els.ghBase.value.trim()||'main' })); }
