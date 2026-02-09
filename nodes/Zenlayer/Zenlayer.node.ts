import {
	IExecuteFunctions,
	INodeType, type INodeTypeDescription, NodeConnectionTypes,
} from 'n8n-workflow';
import { router } from './actions/router';
import { listSearch } from './methods';
import * as image from './actions/image';
import * as text from './actions/text';

export class Zenlayer implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Zenlayer',
		name: 'zenlayer',
		icon: 'file:../../icons/zenlayer.svg',
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

		inputs: [NodeConnectionTypes.Main],
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

	methods = {
		listSearch,
	};

	async execute(this: IExecuteFunctions) {
		return await router.call(this);
	}
}

