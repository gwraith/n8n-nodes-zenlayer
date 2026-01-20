import type { ILoadOptionsFunctions, INodeListSearchResult } from 'n8n-workflow';
import { apiRequest } from '../transport';

interface Model {
	id: string;
	object: 'model';
	owned_by: string;
}

interface ModelResponse {
	object: 'list';
	data: Model[];
}

export async function modelSearch(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	const response: ModelResponse = await apiRequest.call(this, 'GET', '/models');
	let models = response.data;

	if (filter) {
		models = models.filter((model) => model.id.toLowerCase().includes(filter.toLowerCase()));
	} else {
		models = models.slice().sort((a, b) => a.id.localeCompare(b.id));
	}

	return {
		results: models.map((model) => ({ name: model.id, value: model.id })),
	};
}
