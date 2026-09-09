/*
 * Career Canvas community edition adapter.
 * Copyright (C) 2026 Thomas Johnson
 *
 * Licensed under AGPL-3.0-only with the additional attribution term in
 * ATTRIBUTION.md. See LICENSE and https://github.com/jetbackwards/career-canvas.
 */

export async function createEdition() {
	return {
		id: 'community',
		capabilities: ['single-user', 'json-storage'],

		publicConfig() {
			return {
				id: this.id,
				capabilities: this.capabilities
			};
		},

		async authenticate() {
			return { subject: 'local-user' };
		},

		async handleRequest() {
			return false;
		}
	};
}
