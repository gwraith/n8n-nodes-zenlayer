import {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
	jsonParse,
	NodeOperationError,
	updateDisplayOptions,
} from 'n8n-workflow';
import {
	ChatCompletion,
	ChatCompletionCreateParamsBase,
	ChatCompletionMessageFunctionToolCall,
	ModelCreateParamsBase,
	ModelResponse,
	Response,
	ResponseCreateParamsBase,
	ResponseFunctionToolCall,
	ResponseOutputItem,
	ResponseTextConfig,
} from '../../helpers/interfaces';
import {modelList} from '../descriptions';
import {apiRequest} from '../../transport';
import {executeTool, getConnectedTools} from '../../helpers/utils';

const jsonSchemaExample = `{
  "type": "object",
  "properties": {
    "message": {
      "type": "string"
    }
  },
  "additionalProperties": false,
  "required": ["message"]
}`;

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
		displayName: 'Prompt',
		name: 'prompt',
		type: 'fixedCollection',
		typeOptions: {
			sortable: true,
			multipleValues: true,
		},
		placeholder: 'Add Messages',
		default: {},
		options: [
			{
				displayName: 'Messages',
				name: 'messages',
				values: [
					{
						displayName: 'Role',
						name: 'role',
						type: 'options',
						options: [
							{
								name: 'Assistant',
								value: 'assistant',
							},
							{
								name: 'System',
								value: 'system',
							},
							{
								name: 'User',
								value: 'user',
							},
						],
						default: 'user',
					},
					{
						displayName: 'Content',
						name: 'content',
						type: 'string',
						default: '',
					},
				],
			},
		],
		routing: {
			send: {
				type: 'body',
				property: 'messages',
				value: '={{ $value.messages }}',
			},
		},
	},
	{
		displayName: 'Options',
		name: 'options',
		placeholder: 'Add Option',
		type: 'collection',
		default: {},
		options: [
			{
				displayName: 'Background Mode',
				name: 'backgroundMode',
				type: 'fixedCollection',
				default: { values: [{ backgroundMode: true }] },
				options: [
					{
						displayName: 'Background',
						name: 'values',
						values: [
							{
								displayName: 'Background Mode',
								name: 'enabled',
								type: 'boolean',
								default: false,
								description:
									'Whether to run the model in background mode. If true, the model will run in background mode.',
							},
							{
								displayName: 'Timeout',
								name: 'timeout',
								type: 'number',
								default: 300,
								description:
									'The timeout for the background mode in seconds. If 0, the timeout is infinite.',
								typeOptions: {
									minValue: 0,
									maxValue: 3600,
								},
							},
						],
					},
				],
				displayOptions: {
					hide: {
						// API Gateway does not support background mode for now.
						'/requestMode': ['responses', 'chat'],
					},
				},
			},
			{
				displayName: 'Instructions',
				name: 'instructions',
				type: 'string',
				default: '',
				description: 'Instructions for the model to follow',
				typeOptions: {
					rows: 2,
				},
				displayOptions: {
					show: {
						'/requestMode': ['responses'],
					},
				},
			},
			{
				displayName: 'Max Built-in Tool Calls',
				name: 'maxToolCalls',
				type: 'number',
				default: 15,
				description:
					'The maximum number of total calls to built-in tools that can be processed in a response. This maximum number applies across all built-in tool calls, not per individual tool. Any further attempts to call a tool by the model will be ignored.',
				displayOptions: {
					show: {
						'/requestMode': ['responses'],
					},
				},
			},
			{
				displayName: 'Max Tokens',
				name: 'maxTokens',
				type: 'number',
				default: -1,
				description:
					'The maximum number of tokens to generate in the completion. -1 for no limit.',
			},
			{
				displayName: 'Parallel Tool Calls',
				name: 'parallelToolCalls',
				type: 'boolean',
				default: true,
				description:
					'Whether to allow parallel tool calls. If true, the model can call multiple tools at once.',
			},
			{
				displayName: 'Response Format',
				name: 'responseFormat',
				type: 'fixedCollection',
				default: { textOptions: [{ type: 'text' }] },
				options: [
					{
						displayName: 'Text',
						name: 'textOptions',
						values: [
							{
								displayName: 'Description',
								name: 'description',
								type: 'string',
								default: '',
								description: 'The description of the response format',
								displayOptions: {
									show: {
										type: ['json_schema'],
									},
								},
							},
							{
								displayName: 'Name',
								name: 'name',
								type: 'string',
								default: 'my_schema',
								description:
									'The name of the response format. Must be a-z, A-Z, 0-9, or contain underscores and dashes, with a maximum length of 64.',
								displayOptions: {
									show: {
										type: ['json_schema'],
									},
								},
							},
							{
								displayName: 'Schema',
								name: 'schema',
								type: 'json',
								default: jsonSchemaExample,
								description: 'The schema of the response format',
								displayOptions: {
									show: {
										type: ['json_schema'],
									},
								},
							},
							{
								displayName: 'Strict',
								name: 'strict',
								type: 'boolean',
								default: false,
								description:
									'Whether to require that the AI will always generate responses that match the provided JSON Schema',
								displayOptions: {
									show: {
										type: ['json_schema'],
									},
								},
							},
							{
								displayName: 'Type',
								name: 'type',
								type: 'options',
								default: 'text',
								options: [
									{ name: 'Text', value: 'text' },
									{ name: 'JSON Schema', value: 'json_schema' },
									{ name: 'JSON Object', value: 'json_object' },
								],
							},
							{
								displayName: 'Verbosity',
								name: 'verbosity',
								type: 'options',
								default: 'medium',
								options: [
									{ name: 'Low', value: 'low' },
									{ name: 'Medium', value: 'medium' },
									{ name: 'High', value: 'high' },
								],
								displayOptions: {
									show: {
										'/requestMode': ['responses'],
									},
								},
							},
						],
					},
				],
			},
			{
				displayName: 'Store',
				name: 'store',
				type: 'boolean',
				default: false,
				description: 'Whether to store the response in the server (only for Responses API)',
			},
			{
				displayName: 'Temperature',
				name: 'temperature',
				type: 'number',
				default: 0.7,
				typeOptions: { maxValue: 2, minValue: 0, numberPrecision: 1 },
			},
			{
				displayName: 'Tool Choice',
				name: 'toolChoice',
				type: 'options',
				default: 'auto',
				options: [
					{ name: 'Auto', value: 'auto' },
					{ name: 'None', value: 'none' },
				],
				description: 'Preference for tool usage during inference',
			},
			{
				displayName: 'Top P',
				name: 'topP',
				type: 'number',
				default: 1,
				typeOptions: { maxValue: 1, minValue: 0, numberPrecision: 1 },
			},
			{
				displayName: 'Verbosity',
				name: 'verbosity',
				type: 'options',
				default: 'medium',
				options: [
					{ name: 'Low', value: 'low' },
					{ name: 'Medium', value: 'medium' },
					{ name: 'High', value: 'high' },
				],
				displayOptions: {
					show: {
						'/requestMode': ['chat'],
					},
				},
			},
		],
	},
];


interface MessageOptions {
	backgroundMode?: {
		values: {
			enabled: boolean;
			timeout: number;
		};
	};
	instructions?: string;
	maxToolCalls?: number;
	maxTokens?: number;
	temperature?: number;
	topP?: number;
	parallelToolCalls?: boolean;
	responseFormat?: {
		textOptions: {
			type: string;
			verbosity?: string;
			name?: string;
			schema?: object;
			description?: string;
			strict?: boolean;
		};
	};
	store?: boolean;
	toolChoice?: string;
	verbosity?: string;
}

const displayOptions = {
	show: {
		operation: ['message'],
		resource: ['text'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function handleToolLoop(
	context: IExecuteFunctions,
	mode: 'chat' | 'responses',
	request: ModelCreateParamsBase,
	response: ModelResponse,
	callApi: (body: ModelCreateParamsBase) => Promise<ModelResponse>,
) {
	while (true) {
		if (mode === 'chat') {
			const calls = (response as ChatCompletion).choices[0].message?.tool_calls ?? [];
			if (calls.length === 0) break;

			(request as ChatCompletionCreateParamsBase).messages.push({
				role: 'assistant',
				tool_calls: calls,
			});

			for (const call of calls as ChatCompletionMessageFunctionToolCall[]) {
				const result = await executeTool(
					context,
					call.id,
					call.function.name,
					call.function.arguments,
				);
				(request as ChatCompletionCreateParamsBase).messages.push({
					role: 'tool',
					tool_call_id: result.callId,
					content: result.output,
				});
			}
		} else {
			const calls = (response as Response).output?.filter((o: ResponseOutputItem) => o.type === 'function_call' || o.type === 'reasoning') ?? [];
			const hasFunctionCall = () => calls.some((item) => item.type === 'function_call');
			if (calls.length === 0 || !hasFunctionCall()) break;
			(request as ResponseCreateParamsBase).input.push.apply((request as ResponseCreateParamsBase).input, calls as ResponseFunctionToolCall[]);

			for (const call of calls as ResponseFunctionToolCall[]) {
				if (call.type !== 'function_call') continue;
				const result = await executeTool(context, call.call_id as string, call.name, call.arguments);
				(request as ResponseCreateParamsBase).input.push(
					{
						type: 'function_call_output',
						call_id: result.callId,
						output: result.output,
					},
				);
			}
		}

		response = await callApi(request);
	}

	return response;
}

export async function createRequestBody(
	ctx: IExecuteFunctions,
	i: number,
	model: string,
	mode: string,
	options: MessageOptions,
): Promise<ModelCreateParamsBase> {
	const inputTools = await getConnectedTools(ctx);

	const promptCollection = ctx.getNodeParameter('prompt', i, {}) as {
		messages?: Array<{ role: string; content: string }>;
	};

	if (mode === 'chat') {
		const messages = (promptCollection.messages ?? []).map((msg) => ({
			role: msg.role,
			content: msg.content,
		}));

		const body: ChatCompletionCreateParamsBase = {
			model,
			messages,
			parallel_tool_calls: options.parallelToolCalls as boolean,
			store: options.store as boolean, // Chat Completions API default store to false
			max_completion_tokens: options.maxTokens === -1 ? undefined : (options.maxTokens as number),
			temperature: options.temperature as number,
			top_p: options.topP as number,
			tools: (inputTools ?? []).map((t) => ({
				type: t.type ?? 'function',
				function: {
					name: t.name,
					description: t.description,
					parameters: t.parameters,
				},
				strict: t.strict ?? true,
			})),
			tool_choice: options.toolChoice as string,
			verbosity: options.verbosity === 'medium' ? undefined : options.verbosity as 'low' | 'medium' | 'high',
		};

		if (options.responseFormat?.textOptions.type === 'json_object') {
			body.response_format = { type: 'json_object' };
			body.messages = body.messages?.concat([
				{
					role: 'system' as const,
					content: 'You are a helpful assistant designed to output JSON.',
				},
			]);
		} else if (options.responseFormat?.textOptions.type === 'json_schema') {
			body.response_format = {
				type: 'json_schema',
				json_schema: {
					name: options.responseFormat?.textOptions.name as string,
					schema: jsonParse(
						options.responseFormat?.textOptions.schema as unknown as string,
						{
							errorMessage: 'Failed to parse schema',
						},
					),
					description: options.responseFormat?.textOptions.description?.length === 0 ? undefined : options.responseFormat?.textOptions.description,
					strict: !(options.responseFormat?.textOptions.strict as boolean) ? undefined : true,
				},
			};
		}

		return body;
	} else if (mode === 'responses') {
		const input = (promptCollection.messages ?? []).map((msg) => ({
			type: 'message' as const,
			role: msg.role,
			content: msg.content,
		}));

		const body: ResponseCreateParamsBase = {
			model,
			input,
			parallel_tool_calls: options.parallelToolCalls as boolean,
			store: options.store as boolean,  // Responses API default store to true
			instructions: options.instructions as string,
			max_output_tokens: options.maxTokens === -1 ? undefined : (options.maxTokens as number),
			temperature: options.temperature as number,
			top_p: options.topP as number,
			tools: (inputTools ?? []).map((t) => ({
				type: t.type ?? 'function',
				name: t.name,
				description: t.description,
				parameters: t.parameters,
				strict: t.strict ?? true,
			})),
			tool_choice: options.toolChoice as string,
			max_tool_calls: options.maxToolCalls as number,
			background: options.backgroundMode?.values.enabled as boolean,
		};

		if (options.responseFormat?.textOptions.type === 'json_object') {
			const textConfig: ResponseTextConfig = {
				format: { type: 'json_object' },
				verbosity: options.responseFormat?.textOptions.verbosity as
					| 'low'
					| 'medium'
					| 'high',
			};
			body.input = body.input?.concat([
				{
					role: 'system',
					content: [
						{
							type: 'input_text',
							text: 'You are a helpful assistant designed to output JSON.',
						},
					],
				},
			]);
			body.text = textConfig;
		} else if (options.responseFormat?.textOptions.type === 'json_schema') {
			body.text = {
				format: {
					type: 'json_schema',
					name: options.responseFormat?.textOptions.name as string,
					schema: jsonParse(
						options.responseFormat?.textOptions.schema as unknown as string,
						{
							errorMessage: 'Failed to parse schema',
						},
					),
					description: options.responseFormat?.textOptions.description?.length === 0 ? undefined : options.responseFormat?.textOptions.description,
					strict: !(options.responseFormat?.textOptions.strict as boolean) ? undefined : true,
				},
				verbosity: options.responseFormat?.textOptions.verbosity as
					| 'low'
					| 'medium'
					| 'high',
			};
		}

		return body;
	}
	throw new NodeOperationError(ctx.getNode(), 'Unsupported chat operation.');
}

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	const requestMode = this.getNodeParameter('requestMode', i, 'chat') as string;
	const model = this.getNodeParameter('model', i, '', { extractValue: true }) as string;
	const options = this.getNodeParameter('options', i, {}) as MessageOptions;

	const body = await createRequestBody(this, i, model, requestMode, options);
	const endpoint = requestMode === 'chat' ? '/chat/completions' : '/responses';

	let responseData = await apiRequest.call(this, 'POST', endpoint, {
		body: body as unknown as IDataObject,
	});

	/* API Gateway does not support background mode for now.
    if (options.backgroundMode?.values.enabled) {

	}
	*/

	responseData = await handleToolLoop(
		this,
		requestMode as 'chat' | 'responses',
		body,
		responseData,
		async (reqBody) => {
			return await apiRequest.call(this, 'POST', endpoint, {
				body: reqBody as unknown as IDataObject,
			});
		},
	);

	return [{ json: responseData, pairedItem: { item: i } }];
}
