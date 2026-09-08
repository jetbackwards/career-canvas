/*
 * Career Canvas — a private, self-hosted career evidence bank and CV builder.
 * Copyright (C) 2026 Thomas Johnson
 *
 * Licensed under AGPL-3.0-only with the additional attribution term in
 * ATTRIBUTION.md. See LICENSE and https://github.com/jetbackwards/career-canvas.
 */

const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const escapeHtml = (v = '') => String(v).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const id = () => crypto.randomUUID();
let data;
let editing = null;
let pendingImport = null;
let saveTimer;
let activeTag = 'all';
const edition = window.CareerCanvasEdition || {};

const tagLabels = { 
	clinical: 'Clinical', 
	medical: 'Medical', 
	leadership: 'Leadership', 
	education: 'Education', 
	qi: 'Quality improvement', 
	technical: 'Technical', 
	digital: 'Digital', 
	research: 'Research', 
	governance: 'Governance', 
	speaking: 'Speaking' 
};

const entryTypes = [
	'Role', 
	'Achievement', 
	'Project', 
	'Qualification', 
	'Education', 
	'Publication', 
	'Presentation', 
	'Committee', 
	'Skill'
];

const fontStacks = {
	modern: 'Aptos, Calibri, "Segoe UI", Arial, sans-serif',
	arial: 'Arial, Helvetica, sans-serif',
	tahoma: 'Tahoma, Verdana, "Segoe UI", sans-serif',
	century: '"Century Gothic", Futura, "Trebuchet MS", sans-serif',
	georgia: 'Georgia, "Times New Roman", serif',
	cambria: 'Cambria, Georgia, "Times New Roman", serif',
	garamond: 'Garamond, "EB Garamond", Georgia, serif',
	palatino: '"Palatino Linotype", Palatino, "Book Antiqua", Georgia, serif',
	baskerville: 'Baskerville, "Baskerville Old Face", "Times New Roman", serif',
	times: '"Times New Roman", Times, serif',
	trebuchet: '"Trebuchet MS", "Segoe UI", Arial, sans-serif'
};
const layouts = new Set(['classic', 'contemporary', 'centred', 'minimal']);

async function init() {
	data = await fetch('/api/data').then(r => { if (!r.ok) throw new Error('Could not load data'); return r.json(); });
	bind(); render();
	await edition.start?.({ getData: () => data, setData: next => { data = next; render(); queueSave(); }, render, showView, toast });
}

function bind() {
	$$('.nav').forEach(b => b.addEventListener('click', () => showView(b.dataset.view)));
	$('#addEntryBtn').onclick = () => editEntry();
	$('#addProfileBtn').onclick = () => editProfile();
	$('#searchInput').oninput = renderEntries;
	$('#printBtn').onclick = printCv;
	$('#printBtnSide').onclick = printCv;
	$('#backupBtn').onclick = () => $('#backupDialog').showModal();
	$('#importBtn').onclick = openImport;
	$$('.close-dialog').forEach(b => b.onclick = () => b.closest('dialog').close());
	$('#editorForm').onsubmit = saveEditor;
	$('#deleteBtn').onclick = deleteEditor;
	$('#exportBtn').onclick = exportData;
	$('#restoreInput').onchange = restoreData;
	$('#careerImportInput').onchange = previewImport;
	$('#confirmImportBtn').onclick = applyImport;
	$('#previewProfile').onchange = () => { loadDocumentControls(); renderPreview(); };
	$('#targetRole').oninput = renderPreview;
	$('#targetOrg').oninput = renderPreview;
	$('#detailRange').oninput = renderPreview;
	$('#cvAccent').oninput = updateDocumentStyle;
	$('#cvLayout').onchange = updateDocumentStyle;
	$('#cvFont').onchange = updateDocumentStyle;
	$('#textSizeRange').oninput = updateDocumentStyle;
	$('#paddingRange').oninput = updateDocumentStyle;
	$('#sectionSpacingRange').oninput = updateDocumentStyle;
	$('#itemSpacingRange').oninput = updateDocumentStyle;
	$('#paragraphSpacingRange').oninput = updateDocumentStyle;
	$('#lineHeightRange').oninput = updateDocumentStyle;
	document.addEventListener('keydown', e => { if ((e.ctrlKey || e.metaKey) && e.key === 'p') { e.preventDefault(); printCv(); } });
}

function showView(name) {
	$$('.nav').forEach(b => b.classList.toggle('active', b.dataset.view === name));
	$$('.view').forEach(v => v.classList.remove('active'));
	$(`#${name}View`).classList.add('active');
	if (name === 'preview') renderPreview();
}

function render() {
	renderIdentity(); renderFilters(); renderEntries(); renderProfiles();
	const selected = $('#previewProfile').value;
	$('#previewProfile').innerHTML = data.cvProfiles.map(p => `<option value="${p.id}">${escapeHtml(p.name)}</option>`).join('');
	if (data.cvProfiles.some(p => p.id === selected)) $('#previewProfile').value = selected;
	loadDocumentControls();
	renderPreview();
	edition.afterRender?.({ data });
}

function renderIdentity() {
	const p = data.profile;
	$('#identityCard').innerHTML = `<button class="identity-main" id="editIdentity"><span class="avatar">${escapeHtml((p.name || 'You').split(/\s+/).map(x=>x[0]).slice(0,2).join(''))}</span><span><strong>${escapeHtml(p.name || 'Add your name and professional identity')}</strong><small>${escapeHtml(p.headline || 'Title, credentials and contact details')}</small></span><span class="edit-link">Edit profile →</span></button><div class="stats"><span><strong>${data.entries.length}</strong><small>evidence records</small></span><span><strong>${data.cvProfiles.length}</strong><small>CV profiles</small></span></div>`;
	$('#editIdentity').onclick = editIdentity;
}

function allTags() { return [...new Set(data.entries.flatMap(e => e.tags || []))].sort(); }
function renderFilters() {
	const tags = allTags();
	if (activeTag !== 'all' && !tags.includes(activeTag)) activeTag = 'all';
	$('#tagFilters').innerHTML = ['all', ...tags].map(t => `<button class="chip ${activeTag===t?'active':''}" data-tag="${escapeHtml(t)}">${escapeHtml(t === 'all' ? 'All evidence' : (tagLabels[t] || t))}</button>`).join('');
	$$('.chip', $('#tagFilters')).forEach(b => b.onclick = () => { activeTag = b.dataset.tag; renderFilters(); renderEntries(); });
}

function renderEntries() {
	const q = ($('#searchInput').value || '').toLowerCase();
	const rows = data.entries.filter(e => (activeTag === 'all' || (e.tags||[]).includes(activeTag)) && JSON.stringify(e).toLowerCase().includes(q)).sort((a,b) => (b.endDate||b.startDate||'').localeCompare(a.endDate||a.startDate||''));
	$('#entryList').innerHTML = rows.length ? rows.map(e => `<button class="entry-card" data-id="${e.id}"><span class="entry-date">${escapeHtml(formatDateRange(e))}</span><span class="entry-body"><span class="entry-top"><span class="type">${escapeHtml(e.type)}</span>${e.featured?'<span class="featured">Key evidence</span>':''}</span><strong>${escapeHtml(e.title)}</strong><small>${escapeHtml(e.organisation || e.subtitle || '')}</small><span class="entry-summary">${escapeHtml(e.summary || '')}</span><span class="tag-row">${(e.tags||[]).map(t=>`<i>${escapeHtml(tagLabels[t]||t)}</i>`).join('')}</span></span><span class="chevron">›</span></button>`).join('') : `<div class="empty"><div class="empty-icon">＋</div><h3>${q || activeTag !== 'all' ? 'No matching evidence' : 'Build your evidence bank'}</h3><p>${q || activeTag !== 'all' ? 'Try another search or filter.' : 'Add a role, achievement, project or qualification. You can decide later which CVs should use it.'}</p></div>`;
	$$('.entry-card').forEach(b => b.onclick = () => editEntry(b.dataset.id));
}

function renderProfiles() {
	$('#profileGrid').innerHTML = data.cvProfiles.map(p => {
		const count = rankedEntries(p).length;
		return `<article class="profile-card" style="--accent:${safeColour(p.accent)}"><div class="profile-accent"></div><div class="profile-card-head"><span class="profile-icon">${escapeHtml(p.name.slice(0,1))}</span><button class="more" data-edit-profile="${p.id}" aria-label="Edit ${escapeHtml(p.name)}">•••</button></div><h2>${escapeHtml(p.name)}</h2><p>${escapeHtml(p.summary || 'Define the audience and emphasis for this CV.')}</p><div class="tag-row">${(p.tags||[]).map(t=>`<i>${escapeHtml(tagLabels[t]||t)}</i>`).join('')}</div><footer><span>${count} relevant records</span><button data-preview-profile="${p.id}">Preview →</button></footer></article>`;
	}).join('');
	$$('[data-edit-profile]').forEach(b => b.onclick = () => editProfile(b.dataset.editProfile));
	$$('[data-preview-profile]').forEach(b => b.onclick = () => { $('#previewProfile').value=b.dataset.previewProfile; loadDocumentControls(); showView('preview'); });
}

function rankedEntries(profile) {
	const tags = profile?.tags || [];
	return data.entries.map(e => ({...e, score:(e.featured?5:0)+(e.tags||[]).filter(t=>tags.includes(t)).length*3+(e.profiles||[]).includes(profile?.id)*8})).filter(e => e.score > 0 || !tags.length).sort((a,b)=>b.score-a.score || (b.endDate||'').localeCompare(a.endDate||''));
}

function selectedProfile() {
	return data.cvProfiles.find(p => p.id === $('#previewProfile').value) || data.cvProfiles[0];
}

function documentStyle(profile) {
	const style = profile?.documentStyle || {};
	return {
		layout: layouts.has(style.layout) ? style.layout : 'classic',
		font: fontStacks[style.font] ? style.font : 'modern',
		textSize: Math.min(120, Math.max(85, Number(style.textSize) || 100)),
		padding: Math.min(25, Math.max(10, Number(style.padding) || 16)),
		sectionSpacing: Math.min(30, Math.max(6, Number(style.sectionSpacing) || 14)),
		itemSpacing: Math.min(22, Math.max(3, Number(style.itemSpacing) || 10)),
		paragraphSpacing: Math.min(14, Math.max(0, Number.isFinite(Number(style.paragraphSpacing)) ? Number(style.paragraphSpacing) : 3)),
		lineHeight: Math.min(1.7, Math.max(1.2, Number(style.lineHeight) || 1.4))
	};
}

function loadDocumentControls() {
	const profile = selectedProfile();
	if (!profile) return;
	const style = documentStyle(profile);
	$('#cvAccent').value = safeColour(profile.accent);
	$('#cvLayout').value = style.layout;
	$('#cvFont').value = style.font;
	$('#textSizeRange').value = style.textSize;
	$('#paddingRange').value = style.padding;
	$('#sectionSpacingRange').value = style.sectionSpacing;
	$('#itemSpacingRange').value = style.itemSpacing;
	$('#paragraphSpacingRange').value = style.paragraphSpacing;
	$('#lineHeightRange').value = style.lineHeight;
	updateStyleLabels(style);
}

function updateStyleLabels(style) {
	$('#textSizeValue').textContent = `${style.textSize}%`;
	$('#paddingValue').textContent = `${style.padding} mm`;
	$('#sectionSpacingValue').textContent = `${style.sectionSpacing} px`;
	$('#itemSpacingValue').textContent = `${style.itemSpacing} px`;
	$('#paragraphSpacingValue').textContent = `${style.paragraphSpacing} px`;
	$('#lineHeightValue').textContent = style.lineHeight.toFixed(2);
}

function updateDocumentStyle() {
	const profile = selectedProfile();
	if (!profile) return;
	profile.accent = safeColour($('#cvAccent').value);
	profile.documentStyle = {
		layout: $('#cvLayout').value,
		font: $('#cvFont').value,
		textSize: Number($('#textSizeRange').value),
		padding: Number($('#paddingRange').value),
		sectionSpacing: Number($('#sectionSpacingRange').value),
		itemSpacing: Number($('#itemSpacingRange').value),
		paragraphSpacing: Number($('#paragraphSpacingRange').value),
		lineHeight: Number($('#lineHeightRange').value)
	};
	updateStyleLabels(documentStyle(profile));
	renderProfiles(); renderPreview(); queueSave();
}

function applyDocumentStyle(profile) {
	const style = documentStyle(profile);
	const scale = style.textSize / 100;
	const paper = $('#cvPaper');
	paper.className = `cv-paper layout-${style.layout}`;
	paper.style.setProperty('--accent', safeColour(profile.accent));
	paper.style.setProperty('--cv-font', fontStacks[style.font]);
	paper.style.setProperty('--page-padding', `${style.padding}mm`);
	paper.style.setProperty('--cv-name-size', `${29 * scale}px`);
	paper.style.setProperty('--cv-title-size', `${15 * scale}px`);
	paper.style.setProperty('--cv-section-size', `${12 * scale}px`);
	paper.style.setProperty('--cv-heading-size', `${11 * scale}px`);
	paper.style.setProperty('--cv-body-size', `${9.5 * scale}px`);
	paper.style.setProperty('--cv-profile-size', `${10.5 * scale}px`);
	paper.style.setProperty('--cv-meta-size', `${9 * scale}px`);
	paper.style.setProperty('--section-gap', `${style.sectionSpacing}px`);
	paper.style.setProperty('--item-gap', `${style.itemSpacing}px`);
	paper.style.setProperty('--paragraph-gap', `${style.paragraphSpacing}px`);
	paper.style.setProperty('--line-height', style.lineHeight);
	$('#printPageStyle').textContent = `@media print { @page { size: A4; margin: ${style.padding}mm; } }`;
}

function renderPreview() {
	if (!data) return;
	const profile = selectedProfile();
	const level = Number($('#detailRange').value);
	$('#detailValue').textContent = ['Concise','Balanced','Detailed'][level-1];
	if (!profile) { $('#cvPaper').innerHTML='<div class="empty">Create a CV profile first.</div>'; return; }
	const entries = rankedEntries(profile);
	const target = $('#targetRole').value.trim();
	const org = $('#targetOrg').value.trim();
	const summary = profile.summary || data.profile.summary;
	const grouped = entries.reduce((groups, entry) => {
		const section = ['Qualification','Education','Skill'].includes(entry.type) ? entry.type : 'Experience & impact';
		(groups[section] ||= []).push(entry);
		return groups;
	}, {});
	const sections = Object.entries(grouped).map(([title, items]) => `<section class="cv-section"><h2>${escapeHtml(title)}</h2>${items.map(e => `<div class="cv-item"><div class="cv-item-head"><h3>${escapeHtml(e.title)}</h3><time>${escapeHtml(formatDateRange(e))}</time></div>${e.organisation?`<p class="cv-org">${escapeHtml(e.organisation)}</p>`:''}${e.summary?`<p>${escapeHtml(level===1?shorten(e.summary,180):e.summary)}</p>`:''}${level>1&&e.outcomes?`<ul>${e.outcomes.split('\n').filter(Boolean).map(x=>`<li>${escapeHtml(x.replace(/^[•*-]\s*/,''))}</li>`).join('')}</ul>`:''}</div>`).join('')}</section>`).join('');
	const p = data.profile;
	applyDocumentStyle(profile);
	$('#cvPaper').innerHTML = `<header class="cv-head"><div><h1>${escapeHtml(p.name || 'Your name')}</h1><p class="cv-title">${escapeHtml(target || profile.title || p.headline || profile.name)}</p>${org?`<p class="cv-target">Prepared for ${escapeHtml(org)}</p>`:''}</div><p class="cv-contact">${[p.postnominals,p.location,p.email,p.phone,p.links].filter(Boolean).map(escapeHtml).join('<br>')}</p></header>${summary?`<section class="cv-intro"><h2>Profile</h2><p>${escapeHtml(summary)}</p></section>`:''}${sections || '<div class="cv-empty"><h2>Your tailored CV will appear here</h2><p>Add evidence and tag it to match this profile.</p></div>'}`;
}

function field(label, name, value='', type='text', extra='') {
	if (type === 'textarea') return `<label class="span-2">${label}<textarea name="${name}" ${extra}>${escapeHtml(value)}</textarea></label>`;
	return `<label>${label}<input name="${name}" type="${type}" value="${escapeHtml(value)}" ${extra}></label>`;
}

function editIdentity() {
	editing = { kind:'identity' }; const p=data.profile;
	$('#dialogEyebrow').textContent='MASTER PROFILE'; $('#dialogTitle').textContent='Professional identity'; $('#deleteBtn').hidden=true;
	$('#editorFields').innerHTML = field('Full name','name',p.name)+field('Postnominals','postnominals',p.postnominals)+field('Professional headline','headline',p.headline)+field('Location','location',p.location)+field('Email','email',p.email,'email')+field('Phone','phone',p.phone)+field('Links','links',p.links)+field('Master summary','summary',p.summary,'textarea','rows="5"');
	$('#editorDialog').showModal();
}

function editEntry(entryId) {
	const e = data.entries.find(x=>x.id===entryId) || { id:id(), type:'Achievement', title:'', subtitle:'', organisation:'', startDate:'', endDate:'', current:false, summary:'', outcomes:'', tags:[], featured:false, profiles:[] };
	editing={kind:'entry',id:e.id,isNew:!entryId}; $('#dialogEyebrow').textContent='EVIDENCE'; $('#dialogTitle').textContent=entryId?'Edit evidence':'Add evidence'; $('#deleteBtn').hidden=!entryId;
	$('#editorFields').innerHTML = `<label>Type<select name="type">${entryTypes.map(t=>`<option ${e.type===t?'selected':''}>${t}</option>`).join('')}</select></label>`+field('Title','title',e.title,'text','required')+field('Organisation','organisation',e.organisation)+field('Supporting line','subtitle',e.subtitle)+field('Start date','startDate',e.startDate,'month')+field('End date','endDate',e.endDate,'month',`${e.current?'disabled':''}`)+`<label class="check span-2"><input name="current" type="checkbox" ${e.current?'checked':''}>This is current — show the end date as Present</label>`+field('Summary','summary',e.summary,'textarea','rows="4"')+field('Outcomes — one per line','outcomes',e.outcomes,'textarea','rows="4"')+`<label class="span-2">Tags<input name="tags" value="${escapeHtml((e.tags||[]).join(', '))}" placeholder="clinical, leadership, technical"></label><label class="check span-2"><input name="featured" type="checkbox" ${e.featured?'checked':''}>Treat as key evidence across profiles</label>`;
	$('[name=current]', $('#editorForm')).onchange = event => {
		const endDate = $('[name=endDate]', $('#editorForm'));
		endDate.disabled = event.target.checked;
		if (event.target.checked) endDate.value = '';
	};
	$('#editorDialog').showModal();
}

function editProfile(profileId) {
	const p=data.cvProfiles.find(x=>x.id===profileId)||{id:id(),name:'',title:'',summary:'',accent:'#2563eb',tags:[],maxPages:2};
	editing={kind:'profile',id:p.id,isNew:!profileId}; $('#dialogEyebrow').textContent='CV PROFILE'; $('#dialogTitle').textContent=profileId?'Edit CV profile':'New CV profile'; $('#deleteBtn').hidden=!profileId;
	$('#editorFields').innerHTML=field('Profile name','name',p.name,'text','required')+field('Default CV title','title',p.title)+field('Accent colour','accent',p.accent,'color')+field('Target pages','maxPages',p.maxPages,'number','min="1" max="5"')+field('Profile summary','summary',p.summary,'textarea','rows="5"')+`<label class="span-2">Priority tags<input name="tags" value="${escapeHtml((p.tags||[]).join(', '))}" placeholder="technical, digital, leadership"></label>`;
	$('#editorDialog').showModal();
}

function formObject(form) { const f=new FormData(form); return Object.fromEntries(f.entries()); }
function saveEditor(event) {
	event.preventDefault(); const value=formObject(event.target);
	if (editing.kind==='identity') data.profile={...data.profile,...value};
	if (editing.kind==='entry') {
		value.id=editing.id; value.tags=parseTags(value.tags); value.featured=$('[name=featured]',event.target).checked; value.current=$('[name=current]',event.target).checked; if (value.current) value.endDate='';
		const i=data.entries.findIndex(e=>e.id===editing.id); i<0?data.entries.push(value):data.entries[i]=value;
	}
	if (editing.kind==='profile') {
		value.id=editing.id; value.tags=parseTags(value.tags); value.maxPages=Number(value.maxPages)||2;
		const i=data.cvProfiles.findIndex(p=>p.id===editing.id); i<0?data.cvProfiles.push(value):data.cvProfiles[i]=value;
	}
	$('#editorDialog').close(); render(); queueSave();
}

function deleteEditor() {
	if (!confirm('Delete this record? This cannot be undone after it is saved.')) return;
	if (editing.kind==='entry') data.entries=data.entries.filter(e=>e.id!==editing.id);
	if (editing.kind==='profile') data.cvProfiles=data.cvProfiles.filter(p=>p.id!==editing.id);
	$('#editorDialog').close(); render(); queueSave();
}

function parseTags(value='') { return [...new Set(value.split(',').map(t=>t.trim().toLowerCase()).filter(Boolean))]; }
function safeColour(value='') { return /^#[0-9a-f]{6}$/i.test(value)?value:'#2563eb'; }
function formatDate(value) { if(!value)return ''; const [y,m]=value.split('-'); return m?new Date(Date.UTC(+y,+m-1,1)).toLocaleDateString('en-GB',{month:'short',year:'numeric'}):y; }
function formatDateRange(e) { const start=formatDate(e.startDate), end=e.current?'Present':formatDate(e.endDate); return start&&end?`${start} – ${end}`:end||start||''; }
function shorten(s,n){ return s.length>n?s.slice(0,n).replace(/\s+\S*$/,'')+'…':s; }

function queueSave() {
	clearTimeout(saveTimer); $('#saveState').textContent='Saving…'; $('#saveState').classList.add('saving');
	saveTimer=setTimeout(async()=>{ try { const r=await fetch('/api/data',{method:'PUT',headers:{'content-type':'application/json'},body:JSON.stringify(data)}); if(!r.ok)throw new Error(); $('#saveState').textContent='Saved'; $('#saveState').classList.remove('saving'); } catch { $('#saveState').textContent='Save failed'; toast('Could not save. Download a backup before closing.'); } },400);
}

function printCv() { showView('preview'); requestAnimationFrame(()=>window.print()); }
function exportData() { const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'})); a.download=`career-canvas-${new Date().toISOString().slice(0,10)}.json`; a.click(); URL.revokeObjectURL(a.href); }
async function restoreData(event) { const file=event.target.files[0]; if(!file)return; try { const incoming=JSON.parse(await file.text()); if(!incoming.profile||!Array.isArray(incoming.entries)||!Array.isArray(incoming.cvProfiles))throw new Error(); if(!confirm(`Restore ${incoming.entries.length} evidence records and replace the current data?`))return; data=incoming; render(); queueSave(); $('#backupDialog').close(); toast('Backup restored'); } catch { toast('That file is not a valid Career Canvas backup.'); } finally { event.target.value=''; } }

function openImport() {
	pendingImport = null;
	$('#careerImportInput').value = '';
	$('#importPreview').hidden = true;
	$('#importOptions').hidden = true;
	$('#confirmImportBtn').disabled = true;
	$('#importDialog').showModal();
}

function validateImportFile(raw) {
	if (raw?.kind !== 'career-canvas-import' || raw?.schemaVersion !== 1 || !raw.payload) throw new Error('Unsupported import format');
	const payload = raw.payload;
	if (payload.profile && typeof payload.profile !== 'object') throw new Error('Invalid profile');
	if (payload.cvProfiles && !Array.isArray(payload.cvProfiles)) throw new Error('Invalid CV profiles');
	if (payload.entries && !Array.isArray(payload.entries)) throw new Error('Invalid evidence records');
	if (!payload.profile && !payload.cvProfiles?.length && !payload.entries?.length) throw new Error('The import contains no data');
	for (const item of [...(payload.cvProfiles || []), ...(payload.entries || [])]) {
		if (!item || typeof item !== 'object' || typeof item.id !== 'string' || !item.id.trim()) throw new Error('Every imported record needs an ID');
	}
	if (JSON.stringify(raw).length > 2 * 1024 * 1024) throw new Error('The import file is too large');
	return payload;
}

async function previewImport(event) {
	const file = event.target.files[0];
	if (!file) return;
	try {
		const raw = JSON.parse(await file.text());
		const payload = validateImportFile(raw);
		pendingImport = { raw, payload };
		const source = raw.metadata?.source ? `<p>Source: ${escapeHtml(raw.metadata.source)}</p>` : '';
		$('#importPreview').innerHTML = `<strong>${escapeHtml(raw.metadata?.title || file.name)}</strong>${source}<dl><div><dt>${payload.profile ? 1 : 0}</dt><dd>identity</dd></div><div><dt>${payload.cvProfiles?.length || 0}</dt><dd>CV profiles</dd></div><div><dt>${payload.entries?.length || 0}</dt><dd>evidence records</dd></div></dl>`;
		$('#importPreview').hidden = false;
		$('#importOptions').hidden = false;
		$('#importIdentity').disabled = !payload.profile;
		$('#importProfiles').disabled = !payload.cvProfiles?.length;
		$('#importEntries').disabled = !payload.entries?.length;
		$('#confirmImportBtn').disabled = false;
	} catch (error) {
		pendingImport = null;
		$('#importPreview').innerHTML = `<strong>Unable to use this file</strong><p>${escapeHtml(error.message || 'Invalid JSON file')}</p>`;
		$('#importPreview').hidden = false;
		$('#importOptions').hidden = true;
		$('#confirmImportBtn').disabled = true;
	}
}

function mergeById(current, incoming, replace) {
	const result = [...current];
	let added = 0, updated = 0, skipped = 0;
	for (const item of incoming || []) {
		const index = result.findIndex(existing => existing.id === item.id);
		if (index < 0) { result.push(item); added += 1; }
		else if (replace) { result[index] = item; updated += 1; }
		else skipped += 1;
	}
	return { result, added, updated, skipped };
}

function applyImport() {
	if (!pendingImport) return;
	const payload = pendingImport.payload;
	const replace = $('#importConflict').value === 'replace';
	const totals = { added: 0, updated: 0, skipped: 0 };
	if ($('#importIdentity').checked && payload.profile) {
		for (const [key, value] of Object.entries(payload.profile)) {
			if (replace || !data.profile[key]) data.profile[key] = value;
		}
	}
	if ($('#importProfiles').checked) {
		const merged = mergeById(data.cvProfiles, payload.cvProfiles, replace);
		data.cvProfiles = merged.result;
		totals.added += merged.added; totals.updated += merged.updated; totals.skipped += merged.skipped;
	}
	if ($('#importEntries').checked) {
		const merged = mergeById(data.entries, payload.entries, replace);
		data.entries = merged.result;
		totals.added += merged.added; totals.updated += merged.updated; totals.skipped += merged.skipped;
	}
	render(); queueSave(); $('#importDialog').close();
	toast(`Import complete: ${totals.added} added, ${totals.updated} updated${totals.skipped ? `, ${totals.skipped} kept` : ''}.`);
}
function toast(message){ const t=$('#toast');t.textContent=message;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),3500); }

init().catch(()=>{ document.body.innerHTML='<main class="fatal"><h1>Career Canvas could not start</h1><p>Check that the server can write to its data volume, then reload.</p></main>'; });
