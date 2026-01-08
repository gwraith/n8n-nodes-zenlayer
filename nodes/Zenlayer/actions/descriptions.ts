import type { INodeProperties } from 'n8n-workflow';

export const modelList = (searchListMethod: string = 'modelSearch'): INodeProperties => ({
	displayName: 'Model',
	name: 'model',
	type: 'resourceLocator',
	default: { mode: 'list', value: '' },
	required: true,
	modes: [
		{
			displayName: 'From List',
			name: 'list',
			type: 'list',
			typeOptions: {
				searchListMethod,
				searchable: true,
			},
		},
		{
			displayName: 'ID',
			name: 'id',
			type: 'string',
			placeholder: 'e.g. gpt-4o, deepseek-r1',
		},
	],
});
