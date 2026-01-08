import type { INodeProperties } from 'n8n-workflow';

export const modelList: INodeProperties = {
	displayName: 'Model',
	name: 'model',
	type: 'options',
	default: '',
	description: 'Select a model provided by your Zenlayer AI Gateway',
	typeOptions: {
		loadOptions: {
			routing: {
				request: {
					method: 'GET',
					url: '/models',
				},
				output: {
					postReceive: [
						{
							type: 'rootProperty',
							properties: {
								property: 'data',
							},
						},
						{
							type: 'setKeyValue',
							properties: {
								//name: '={{$responseItem.owned_by + "/" + $responseItem.id}}',
								name: '={{$responseItem.id}}',
								value: '={{$responseItem.id}}',
							},
						},
						{ type: 'sort', properties: { key: 'name' } },
					],
				},
			},
		},
	},
};
