<script setup>
import { computed, ref } from 'vue';
import { formatDateRange, tagLabels } from '../lib/career.js';
const props=defineProps({ data:Object }); const emit=defineEmits(['edit-identity','edit-entry','add-entry']);
const search=ref(''), activeTag=ref('all');
const tags=computed(()=>[...new Set(props.data.entries.flatMap(e=>e.tags||[]))].sort());
const rows=computed(()=>props.data.entries.filter(e=>(activeTag.value==='all'||(e.tags||[]).includes(activeTag.value))&&JSON.stringify(e).toLowerCase().includes(search.value.toLowerCase())).sort((a,b)=>(b.endDate||b.startDate||'').localeCompare(a.endDate||a.startDate||'')));
const initials=computed(()=>(props.data.profile.name||'You').split(/\s+/).map(x=>x[0]).slice(0,2).join(''));
</script>
<template><section class="view active">
	<div class="workspace-head"><div><p class="eyebrow">MASTER RECORD</p><h1>Your career evidence</h1><p>Capture each achievement once. Profiles decide what earns space in a CV.</p></div><button class="primary" @click="emit('add-entry')">+ Add evidence</button></div>
	<section class="profile-strip"><button class="identity-main" @click="emit('edit-identity')"><span class="avatar">{{ initials }}</span><span><strong>{{ data.profile.name||'Add your name and professional identity' }}</strong><small>{{ data.profile.headline||'Title, credentials and contact details' }}</small></span><span class="edit-link">Edit profile →</span></button><div class="stats"><span><strong>{{ data.entries.length }}</strong><small>evidence records</small></span><span><strong>{{ data.cvProfiles.length }}</strong><small>CV profiles</small></span></div></section>
	<div class="filter-row"><input v-model="search" type="search" placeholder="Search achievements, roles or tags…" aria-label="Search evidence"><div class="chips" aria-label="Filter by tag"><button v-for="tag in ['all',...tags]" :key="tag" class="chip" :class="{active:activeTag===tag}" @click="activeTag=tag">{{ tag==='all'?'All evidence':(tagLabels[tag]||tag) }}</button></div></div>
	<div class="entry-list"><button v-for="entry in rows" :key="entry.id" class="entry-card" @click="emit('edit-entry',entry.id)"><span class="entry-date">{{ formatDateRange(entry) }}</span><span class="entry-body"><span class="entry-top"><span class="type">{{ entry.type }}</span><span v-if="entry.featured" class="featured">Key evidence</span></span><strong>{{ entry.title }}</strong><small>{{ entry.organisation||entry.subtitle }}</small><span class="entry-summary">{{ entry.summary }}</span><span class="tag-row"><i v-for="tag in entry.tags||[]" :key="tag">{{ tagLabels[tag]||tag }}</i></span></span><span class="chevron">›</span></button>
		<div v-if="!rows.length" class="empty"><div class="empty-icon">＋</div><h3>{{ search||activeTag!=='all'?'No matching evidence':'Build your evidence bank' }}</h3><p>{{ search||activeTag!=='all'?'Try another search or filter.':'Add a role, achievement, project or qualification. You can decide later which CVs should use it.' }}</p></div></div>
</section></template>
