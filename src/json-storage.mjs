/*
 * Career Canvas JSON storage adapter.
 * Copyright (C) 2026 Thomas Johnson
 *
 * Licensed under AGPL-3.0-only with the additional attribution term in
 * ATTRIBUTION.md. See LICENSE and https://github.com/jetbackwards/career-canvas.
 */

import { readFile, writeFile, mkdir, rename } from 'node:fs/promises';
import { dirname } from 'node:path';

export async function createStorage({ dataFile, emptyData }) {
	async function save(_actor, data) {
		await mkdir(dirname(dataFile), { recursive: true });
		const temp = `${dataFile}.tmp`;
		await writeFile(temp, JSON.stringify(data, null, 2), 'utf8');
		await rename(temp, dataFile);
	}

	async function load(actor) {
		try {
			return JSON.parse(await readFile(dataFile, 'utf8'));
		} catch (error) {
			if (error.code !== 'ENOENT') throw error;
			const data = emptyData();
			await save(actor, data);
			return data;
		}
	}

	return { load, save };
}
