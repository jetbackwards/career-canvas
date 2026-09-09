<script setup>
defineProps({ activeView:String, saveState:String });
defineEmits(['view','import','backup','print']);
const views=[['evidence','Evidence bank'],['profiles','CV profiles'],['preview','Preview']];
</script>
<template>
	<header class="topbar">
		<a class="brand" href="#evidence" aria-label="Career Canvas home" @click.prevent="$emit('view','evidence')"><span class="brandmark">CC</span><span>Career Canvas</span></a>
		<nav aria-label="Main navigation"><button v-for="v in views" :key="v[0]" class="nav" :class="{active:activeView===v[0]}" @click="$emit('view',v[0])">{{ v[1] }}</button></nav>
		<div class="actions"><span class="save-state" :class="{saving:saveState==='Saving…'}">{{ saveState }}</span><button class="ghost" @click="$emit('import')">Import</button><button class="ghost" @click="$emit('backup')">Backup</button><button class="primary" @click="$emit('print')">Generate PDF</button></div>
	</header>
</template>
