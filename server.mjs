/*
 * Career Canvas — a private, self-hosted career evidence bank and CV builder.
 * Copyright (C) 2026 Thomas Johnson
 *
 * Licensed under AGPL-3.0-only with the additional attribution term in
 * ATTRIBUTION.md. See LICENSE and https://github.com/jetbackwards/career-canvas.
 */

import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { randomUUID } from 'node:crypto';

const port = Number(process.env.PORT || 3000);
const dataFile = process.env.DATA_FILE || './data/career-canvas.json';
const publicRoot = new URL('./public/', import.meta.url).pathname;
const bodyLimit = 2 * 1024 * 1024;
const editionModuleUrl = new URL(process.env.CAREER_CANVAS_EDITION_MODULE || './src/community-edition.mjs', import.meta.url);
const storageModuleUrl = new URL(process.env.CAREER_CANVAS_STORAGE_MODULE || './src/json-storage.mjs', import.meta.url);

const emptyData = () => ({
	version: 1,
	profile: { name: '', postnominals: '', headline: '', email: '', phone: '', location: '', links: '', summary: '' },
	entries: [],
	cvProfiles: [
		{ id: randomUUID(), name: 'Medical', accent: '#0f766e', tags: ['clinical', 'medical'], title: '', summary: '', maxPages: 2 },
		{ id: randomUUID(), name: 'Leadership', accent: '#7c3aed', tags: ['leadership', 'education', 'qi'], title: '', summary: '', maxPages: 2 },
		{ id: randomUUID(), name: 'Technical', accent: '#2563eb', tags: ['technical', 'digital'], title: '', summary: '', maxPages: 2 }
	]
});

const { createEdition } = await import(editionModuleUrl);
const { createStorage } = await import(storageModuleUrl);
const edition = await createEdition();
const storage = await createStorage({ dataFile, emptyData });

function validate(data) {
	if (!data || typeof data !== 'object' || !data.profile || !Array.isArray(data.entries) || !Array.isArray(data.cvProfiles)) return false;
	if (data.entries.length > 5000 || data.cvProfiles.length > 100) return false;
	return JSON.stringify(data).length <= bodyLimit;
}

function json(res, status, value) {
	res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
	res.end(JSON.stringify(value));
}

async function readBody(req) {
	let body = '';
	for await (const chunk of req) {
		body += chunk;
		if (body.length > bodyLimit) throw Object.assign(new Error('Request too large'), { status: 413 });
	}
	return JSON.parse(body || '{}');
}

async function serveStatic(pathname, res) {
	const requested = pathname === '/' ? 'index.html' : pathname.slice(1);
	const safe = normalize(requested).replace(/^(\.\.(\/|\\|$))+/, '');
	const file = join(publicRoot, safe);
	if (!file.startsWith(publicRoot)) return false;
	try {
		const info = await stat(file);
		if (!info.isFile()) return false;
		const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml' };
		res.writeHead(200, { 'content-type': types[extname(file)] || 'application/octet-stream', 'cache-control': 'no-cache' });
		res.end(await readFile(file));
		return true;
	} catch { return false; }
}

const server = http.createServer(async (req, res) => {
	try {
		const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

		if (url.pathname === '/api/health') return json(res, 200, { ok: true, edition: edition.id });
		if (url.pathname === '/api/config' && req.method === 'GET') {
			const config = await edition.publicConfig?.();
			return json(res, 200, config || { id: edition.id, capabilities: edition.capabilities || [] });
		}

		let actor = null;
		if (url.pathname.startsWith('/api/')) actor = await edition.authenticate(req, { url });
		const context = { url, actor, json: (status, value) => json(res, status, value), readBody: () => readBody(req) };
		if (await edition.handleRequest(req, context)) return;

		if (url.pathname === '/api/data' && req.method === 'GET') return json(res, 200, await storage.load(actor));
		if (url.pathname === '/api/data' && req.method === 'PUT') {
			const body = await readBody(req);
			if (!validate(body)) return json(res, 400, { error: 'Invalid Career Canvas data' });
			await storage.save(actor, { ...body, version: 1 });
			return json(res, 200, { saved: true, at: new Date().toISOString() });
		}
		if (await serveStatic(url.pathname, res)) return;
		res.writeHead(404); res.end('Not found');
	} catch (error) {
		json(res, error.status || 500, { error: error.status ? error.message : 'Unexpected server error' });
	}
});

server.listen(port, '0.0.0.0', () => console.log(`Career Canvas (${edition.id}) listening on ${port}`));
