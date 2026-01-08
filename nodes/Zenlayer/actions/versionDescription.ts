import { NodeConnectionTypes, type INodeTypeDescription } from 'n8n-workflow';

import * as image from './image';
import * as text from './text';

export const versionDescription: INodeTypeDescription = {
	displayName: 'Zenlayer',
	name: 'zenlayer',
	icon: 'file:../../../icons/zenlayer.svg',
	group: ['transform'],
	version: [1],
	description: 'For advanced usage with an AI Gateway from Zenlayer',
	subtitle: '={{ $parameter["operation"] + ": " + $parameter["resource"] }}',
	defaults: {
		name: 'Zenlayer',
	},
	usableAsTool: true,
	codex: {
		alias: ['LangChain', 'image', 'vision', 'AI'],
		categories: ['AI'],
		subcategories: {
			AI: ['Agents', 'Miscellaneous', 'Root Nodes'],
		},
	},

	inputs: `={{
		(() => {
			const resource = $parameter.resource;
	  		const operation = $parameter.operation;
			if (resource === 'text' && operation === 'message') {
				return [{ type: 'main' }, { type: 'ai_tool', displayName: 'Tools' }];
			}

			return ['main'];
		})()
	}}`,
	outputs: [NodeConnectionTypes.Main],

	credentials: [
		{
			name: 'zenlayerApi',
			required: true,
		},
	],

	requestDefaults: {
		baseURL: '={{ $credentials.url }}',
	},
	properties: [
		{
			displayName: 'Resource',
			name: 'resource',
			type: 'options',
			noDataExpression: true,
			options: [
				{
					name: 'Image',
					value: 'image',
				},
				{
					name: 'Text',
					value: 'text',
				},
			],
			default: 'text',
		},
		...image.description,
		...text.description,
	],
};