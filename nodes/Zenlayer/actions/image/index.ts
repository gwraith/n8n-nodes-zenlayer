import type { INodeProperties } from 'n8n-workflow';
import * as analyze from './analyze.operation';
import * as generate from './generate.operation';
export { analyze, generate };

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		options: [
			{
				name: 'Analyze Image',
				value: 'analyze',
				action: 'Analyze image',
				description: 'Analyze images and get descriptions or insights',
			},
			{
				name: 'Generate an Image',
				value: 'generate',
				action: 'Generate an image',
				description: 'Creates an image from a text prompt',
			},
		],
		default: 'analyze',
		displayOptions: {
			show: {
				resource: ['image'],
			},
		},
	},
	...generate.description,
	...analyze.description,
];
