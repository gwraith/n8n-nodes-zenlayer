import {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
	NodeOperationError,
	updateDisplayOptions,
} from 'n8n-workflow';
import {
	ImageInputMessage,
	ModelRequestBody,
} from '../../helpers';
import { modelList } from '../descriptions';
import { apiRequest	} from "../../transport";

const properties: INodeProperties[] = [
	modelList,
	{
		displayName: 'Request Mode',
		name: 'requestMode',
		type: 'options',
		default: 'chat',
		options: [
			{ name: 'Chat Completions', value: 'chat' },
			{ name: 'Responses API', value: 'responses' },
		],
		description: 'Choose which Zenlayer endpoint to call',
	},
	{
		displayName: 'Text Input',
		name: 'imagePrompt',
		type: 'string',
		typeOptions: {
			rows: 4,
		},
		default: "What's in this image?",
	},
	{
		displayName: 'URL(s)',
		name: 'imageUrls',
		type: 'string',
		default: '',
		placeholder: 'e.g. https://example.com/image.jpeg',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		default: {},
		options: [
			{
				displayName: 'Detail',
				name: 'detail',
				type: 'options',
				default: 'auto',
				options: [
					{
						name: 'Auto',
						value: 'auto',
						description:
							'Model will look at the image input size and decide if it should use the low or high setting',
					},
					{
						name: 'Low',
						value: 'low',
						description: 'Return faster responses and consume fewer tokens',
					},
					{
						name: 'High',
						value: 'high',
						description: 'Return more detailed responses, consumes more tokens',
					},
				],
			},
			{
				displayName: 'Length of Description (Max Tokens)',
				description: 'Fewer tokens will result in shorter, less detailed image description',
				name: 'maxTokens',
				type: 'number',
				default: -1,
			},
		],
	},
];

interface ImageOptions {
	detail?: 'low' | 'high' | 'auto';
	maxTokens?: number;
}

const displayOptions = {
	show: {
		operation: ['analyze'],
		resource: ['image'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	const requestMode = this.getNodeParameter('requestMode', i, 'chat') as string;
	const model = this.getNodeParameter('model', i) as string;
	const options = this.getNodeParameter('options', i, {}) as ImageOptions;

	const body = await handleImageResource(this, i, model, requestMode, options);
	const endpoint = requestMode === 'chat' ? '/chat/completions' : '/responses';

	const responseData = await apiRequest.call(this, 'POST', endpoint, {
		body: body as unknown as IDataObject,
	});

	return [{ json: responseData }];
}

export async function handleImageResource(
	context: IExecuteFunctions,
	i: number,
	model: string,
	mode: string,
	options: ImageOptions,
): Promise<ModelRequestBody> {
	const operation = context.getNodeParameter('zenOperation', i, 'analyze') as string;
	if (operation === 'analyze') {
		const imagePrompt = context.getNodeParameter('imagePrompt', i) as string;
		const imageUrl = context.getNodeParameter('imageUrls', i) as string;

		const input: ImageInputMessage[] = [
			{
				role: 'user',
				content: [{ type: mode === 'chat' ? 'text' : 'input_text', text: imagePrompt }],
			},
		];

		const urls = imageUrl
			.split(',')
			.map((u) => u.trim())
			.filter(Boolean);
		for (const url of urls) {
			if (mode === 'chat') {
				const content  = {
					type: 'image_url' as const,
					image_url: {
						url: url,
						detail: options.detail
					},
				}
				input[0].content.push(content);
			} else {
				const content = {
					type: 'input_image' as const,
					detail: options.detail,
					image_url: url,
				};
				input[0].content.push(content);
			}
		}

		if (mode === 'chat') {
			return {
				model,
				messages: input,
				max_completion_tokens: options.maxTokens === -1 ? undefined : options.maxTokens,
			};
		} else {
			return {
				model,
				input: input,
				max_output_tokens: options.maxTokens === -1 ? undefined : options.maxTokens,
			};
		}
	}
	throw new NodeOperationError(context.getNode(), 'Unsupported image operation.');
}