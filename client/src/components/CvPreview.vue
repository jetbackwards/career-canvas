<script setup>
import { computed, reactive, watch } from 'vue';
import { documentStyle, fontOptions, fontStacks, formatDateRange, rankedEntries, safeColour, shorten } from '../lib/career.js';
const props=defineProps({data:Object,selectedId:String}); const emit=defineEmits(['select','changed']);
const controls=reactive({targetRole:'',targetOrg:'',detail:2});
const profile=computed(()=>props.data.cvProfiles.find(p=>p.id===props.selectedId)||props.data.cvProfiles[0]);
const style=computed(()=>documentStyle(profile.value));
const entries=computed(()=>rankedEntries(props.data.entries,profile.value));
const groups=computed(()=>entries.value.reduce((all,e)=>{const section=['Qualification','Education','Skill'].includes(e.type)?e.type:'Experience & impact';(all[section]||=[]).push(e);return all;},{}));
const paperStyle=computed(()=>{const s=style.value,scale=s.textSize/100;return {'--accent':safeColour(profile.value?.accent),'--cv-font':fontStacks[s.font],'--page-padding':`${s.padding}mm`,'--cv-name-size':`${29*scale}px`,'--cv-title-size':`${15*scale}px`,'--cv-section-size':`${12*scale}px`,'--cv-heading-size':`${11*scale}px`,'--cv-body-size':`${9.5*scale}px`,'--cv-profile-size':`${10.5*scale}px`,'--cv-meta-size':`${9*scale}px`,'--section-gap':`${s.sectionSpacing}px`,'--item-gap':`${s.itemSpacing}px`,'--paragraph-gap':`${s.paragraphSpacing}px`,'--line-height':s.lineHeight};});
function setStyle(key,value){if(!profile.value)return;if(key==='accent')profile.value.accent=safeColour(value);else profile.value.documentStyle={...style.value,[key]:typeof style.value[key]==='number'?Number(value):value};emit('changed');}
watch(()=>style.value.padding,p=>{const el=document.querySelector('#printPageStyle');if(el)el.textContent=`@media print { @page { size: A4; margin: ${p}mm; } }`;},{immediate:true});
</script>
<template><section class="view active preview-workspace">
	<aside class="preview-controls">
		<label>CV profile<select :value="profile?.id" @change="emit('select',$event.target.value)"><option v-for="p in data.cvProfiles" :key="p.id" :value="p.id">{{ p.name }}</option></select></label>
		<label>Target role<input v-model="controls.targetRole" placeholder="e.g. Clinical Product Advisor"></label><label>Target organisation<input v-model="controls.targetOrg" placeholder="e.g. Medical device company"></label>
		<label class="range-label">Detail level <span>{{ ['Concise','Balanced','Detailed'][controls.detail-1] }}</span><input v-model.number="controls.detail" type="range" min="1" max="3"></label><div class="control-divider"><span>Appearance</span></div>
		<label class="colour-label">Accent colour<input type="color" :value="safeColour(profile?.accent)" @input="setStyle('accent',$event.target.value)"></label>
		<label>Layout<select :value="style.layout" @change="setStyle('layout',$event.target.value)"><option value="classic">Classic</option><option value="contemporary">Contemporary</option><option value="centred">Centred</option><option value="minimal">Minimal</option></select></label>
		<label>Font<select :value="style.font" @change="setStyle('font',$event.target.value)"><option v-for="f in fontOptions" :key="f[0]" :value="f[0]">{{ f[1] }}</option></select></label>
		<label v-for="control in [{k:'textSize',l:'Text size',min:85,max:120,step:5,s:'%'},{k:'padding',l:'Page margins',min:10,max:25,step:1,s:' mm'},{k:'sectionSpacing',l:'Section spacing',min:6,max:30,step:1,s:' px'},{k:'itemSpacing',l:'Entry spacing',min:3,max:22,step:1,s:' px'},{k:'paragraphSpacing',l:'Paragraph spacing',min:0,max:14,step:1,s:' px'},{k:'lineHeight',l:'Line spacing',min:1.2,max:1.7,step:.05,s:''}]" :key="control.k" class="range-label">{{ control.l }} <span>{{ control.k==='lineHeight'?style[control.k].toFixed(2):style[control.k]+control.s }}</span><input type="range" :min="control.min" :max="control.max" :step="control.step" :value="style[control.k]" @input="setStyle(control.k,$event.target.value)"></label>
		<p class="hint">Use your browser’s “Save as PDF” destination. Turn off browser headers and footers for the cleanest result.</p><button class="primary full" @click="$emit('print')">Generate PDF</button>
	</aside>
	<article v-if="profile" class="cv-paper" :class="`layout-${style.layout}`" :style="paperStyle"><header class="cv-head"><div><h1>{{ data.profile.name||'Your name' }}</h1><p class="cv-title">{{ controls.targetRole||profile.title||data.profile.headline||profile.name }}</p><p v-if="controls.targetOrg" class="cv-target">Prepared for {{ controls.targetOrg }}</p></div><p class="cv-contact"><template v-for="(line,i) in [data.profile.postnominals,data.profile.location,data.profile.email,data.profile.phone,data.profile.links].filter(Boolean)" :key="line"><br v-if="i">{{ line }}</template></p></header>
		<section v-if="profile.summary||data.profile.summary" class="cv-intro"><h2>Profile</h2><p>{{ profile.summary||data.profile.summary }}</p></section>
		<template v-if="entries.length"><section v-for="(items,title) in groups" :key="title" class="cv-section"><h2>{{ title }}</h2><div v-for="entry in items" :key="entry.id" class="cv-item"><div class="cv-item-head"><h3>{{ entry.title }}</h3><time>{{ formatDateRange(entry) }}</time></div><p v-if="entry.organisation" class="cv-org">{{ entry.organisation }}</p><p v-if="entry.summary">{{ controls.detail===1?shorten(entry.summary,180):entry.summary }}</p><ul v-if="controls.detail>1&&entry.outcomes"><li v-for="outcome in entry.outcomes.split('\n').filter(Boolean)" :key="outcome">{{ outcome.replace(/^[•*-]\s*/,'') }}</li></ul></div></section></template>
		<div v-else class="cv-empty"><h2>Your tailored CV will appear here</h2><p>Add evidence and tag it to match this profile.</p></div>
	</article><article v-else class="cv-paper"><div class="empty">Create a CV profile first.</div></article>
</section></template>
