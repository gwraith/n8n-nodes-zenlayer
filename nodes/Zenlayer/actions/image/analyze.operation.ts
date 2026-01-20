import {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
	updateDisplayOptions,
} from 'n8n-workflow';
import {
	ChatCompletionContentPartImage,
	ChatCompletionUserMessageParam,
	ModelCreateParamsBase,
	ResponseInputImage,
	EasyInputMessage,
} from '../../helpers/interfaces';
import { modelList } from '../descriptions';
import { apiRequest	} from "../../transport";
import {getBinaryDataFile} from "../../helpers/binary-data";

const properties: INodeProperties[] = [
	modelList(),
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
		displayName: 'Input Type',
		name: 'inputType',
		type: 'options',
		default: 'binary',
		options: [
			{
				name: 'Binary File(s)',
				value: 'binary',
			},
			{
				name: 'Image URL(s)',
				value: 'url',
			},
		],
	},
	{
		displayName: 'Input Data Field Name(s)',
		name: 'binaryPropertyName',
		type: 'string',
		default: 'data',
		placeholder: 'e.g. data',
		hint: 'The name of the input field containing the binary file data to be processed',
		description:
			'Name of the binary field(s) which contains the image(s), separate multiple field names with commas',
		displayOptions: {
			show: {
				inputType: ['binary'],
			},
		},
	},
	{
		displayName: 'URL(s)',
		name: 'imageUrls',
		type: 'string',
		placeholder: 'e.g. https://example.com/image.png',
		description: 'URL(s) of the image(s) to analyze, multiple URLs can be added separated by comma',
		default: '',
		displayOptions: {
			show: {
				inputType: ['url'],
			},
		},
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
	const model = this.getNodeParameter('model', i, '', { extractValue: true }) as string;
	const inputType = this.getNodeParameter('inputType', i, 'binary') as string;
	const options = this.getNodeParameter('options', i, {}) as ImageOptions;

	const body = await createImageRequestBody(this, i, inputType, model, requestMode, options);
	const endpoint = requestMode === 'chat' ? '/chat/completions' : '/responses';

	const responseData = await apiRequest.call(this, 'POST', endpoint, {
		body: body as unknown as IDataObject,
	});

	return [{ json: responseData, pairedItem: { item: i } }];
}

export async function getBase64ImageFromBinary(
	context: IExecuteFunctions,
	i: number,
	propertyName: string,
): Promise<string> {
	const { fileContent, contentType } = await getBinaryDataFile(context, i, propertyName);
	const imageBuffer = await context.helpers.binaryToBuffer(fileContent);
	const base64Image = imageBuffer.toString('base64');
	return `data:${contentType};base64,${base64Image}`;
}

export async function prepareChatContentImage(
	context: IExecuteFunctions,
	i: number,
	inputType: string,
	text: string,
	options: ImageOptions,
): Promise<ChatCompletionUserMessageParam[]> {
	const input: ChatCompletionUserMessageParam[] = [{ role: 'user', content: [{ type: 'text', text }] }];

	if (inputType === 'url') {
		const imageUrl = context.getNodeParameter('imageUrls', i) as string;
		const urls = imageUrl
			.split(',')
			.map((u) => u.trim())
			.filter(Boolean);

		for (const url of urls) {
			if (Array.isArray(input[0].content)) {
				const contentItem: ChatCompletionContentPartImage = {
					type: 'image_url' as const,
					image_url: {
						url: url,
						detail: options.detail as 'low' | 'high' | 'auto',
					},
				};
				input[0].content.push(contentItem);
			}
		}
	} else {
		const binaryPropertyName = context
			.getNodeParameter('binaryPropertyName', i)
			.split(',')
			.map((propertyName) => propertyName.trim());
		for (const propertyName of binaryPropertyName) {
			if (Array.isArray(input[0].content)) {
				const contentItem: ChatCompletionContentPartImage = {
					type: 'image_url' as const,
					image_url: {
						url: await getBase64ImageFromBinary(context, i, propertyName),
						detail: options.detail as 'low' | 'high' | 'auto',
					},
				}
				input[0].content.push(contentItem);
			}
		}
	}
	return input;
}

export async function prepareRespContentImage(
	context: IExecuteFunctions,
	i: number,
	inputType: string,
	text: string,
	options: ImageOptions,
): Promise<EasyInputMessage[]> {
	const input: EasyInputMessage[] = [{ role: 'user', content: [{ type: 'input_text', text }] }];

	if (inputType === 'url') {
		const imageUrl = context.getNodeParameter('imageUrls', i) as string;
		const urls = imageUrl
			.split(',')
			.map((u) => u.trim())
			.filter(Boolean);
		for (const url of urls) {
			if (Array.isArray(input[0].content)) {
				const contentItem: ResponseInputImage = {
					type: 'input_image' as const,
					detail: options.detail,
					image_url: url,
				}
				input[0].content.push(contentItem);
			}
		}
	} else {
		const binaryPropertyName = context
			.getNodeParameter('binaryPropertyName', i)
			.split(',')
			.map((propertyName) => propertyName.trim());
		for (const propertyName of binaryPropertyName) {
			if (Array.isArray(input[0].content)) {
				const contentItem: ResponseInputImage = {
					type: 'input_image' as const,
					detail: options.detail,
					image_url: await getBase64ImageFromBinary(context, i, propertyName),
				}
				input[0].content.push(contentItem);
			}
		}
	}
	return input;
}

export async function createImageRequestBody(
	context: IExecuteFunctions,
	i: number,
	inputType: string,
	model: string,
	mode: string,
	options: ImageOptions,
): Promise<ModelCreateParamsBase> {
	const text = context.getNodeParameter('imagePrompt', i) as string;
	if (mode === 'chat') {
		const messages = await prepareChatContentImage(context, i, inputType, text, options);
		return {
			model,
			messages,
			max_completion_tokens: options.maxTokens === -1 ? undefined : options.maxTokens,
		};
	} else {
		const input = await prepareRespContentImage(context, i, inputType, text, options);
		return {
			model,
			input,
			max_output_tokens: options.maxTokens === -1 ? undefined : options.maxTokens,
		};
	}
}