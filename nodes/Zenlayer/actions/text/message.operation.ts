import {
	IExecuteFunctions,
	INodeProperties,
	INodeExecutionData,
	updateDisplayOptions,
	NodeOperationError,
	NodeConnectionTypes,
	IDataObject,
} from 'n8n-workflow';
import {
	ChatResponse,
	ChatResponseToolCalls,
	RespInputFunctionCall,
	RespInputFunctionCallOutPut,
	RespRequestTools,
	RespResponse,
	RespResponseOutput,
	TextRequestBody,
	TextResponse,
	ToolParameters,
} from '../../helpers';
import { modelList } from '../descriptions';
import { apiRequest } from '../../transport';

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
		type: 'collection',
		default: {},
		options: [
			{
				displayName: 'Background',
				name: 'background',
				type: 'boolean',
				default: false,
				description: 'Whether Run request in background (Responses API only)',
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
				description: 'The maximum number of tokens to generate in the completion. -1 for no limit.',
			},
			{
				displayName: 'Parallel Tool Calls',
				name: 'parallelToolCalls',
				type: 'boolean',
				default: true,
				description: 'Whether to allow parallel tool calls. If true, the model can call multiple tools at once.',
			},
			{
				displayName: 'Response Format',
				name: 'responseFormat',
				type: 'options',
				default: 'text',
				options: [
					{ name: 'Text', value: 'text' },
					{ name: 'JSON', value: 'json_object' },
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
		],
	},
];

interface MessageOptions {
	background?: boolean;
	maxTokens?: number;
	responseFormat?: string;
	temperature?: number;
	topP?: number;
	parallelToolCalls?: boolean;
	store?: boolean;
	toolChoice?: string;
}

const displayOptions = {
	show: {
		operation: ['message'],
		resource: ['text'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

const primitiveMappings = {
	ZodString: 'string',
	ZodNumber: 'number',
	ZodBigInt: 'integer',
	ZodBoolean: 'boolean',
	ZodNull: 'null',
} as const;
type PrimitiveTypeName = keyof typeof primitiveMappings;

export async function getTools(context: IExecuteFunctions) {
	const tools = await context.getInputConnectionData(NodeConnectionTypes.AiTool, 0);
	if (!tools || !Array.isArray(tools)) {
		throw new NodeOperationError(context.getNode(), 'No tool inputs found');
	}

	const result: RespRequestTools[] = [];
	for (const tool of tools) {
		const parameters = Object.entries<Record<string, unknown>>(tool.schema.shape);

		const toolParameters: ToolParameters = {
			type: 'object',
			properties: {},
		};
		const requiredParams: string[] = [];

		for (const [paramName, paramSchema] of parameters) {
			const typeName = (paramSchema as { _def: { typeName: string } })._def
				.typeName as PrimitiveTypeName;
			toolParameters.properties[paramName] = {
				type: primitiveMappings[typeName] || 'string',
			};
			const desc = paramSchema.description;
			if (desc !== undefined && desc !== null) {
				toolParameters.properties[paramName].description = desc as string;
			}
			if (typeof paramSchema.isOptional === 'function' && !paramSchema.isOptional()) {
				requiredParams.push(paramName);
			}
		}

		if (requiredParams.length > 0) {
			toolParameters.required = requiredParams;
		}
		toolParameters.additionalProperties = false;

		result.push({
			type: tool.type ?? 'function',
			name: tool.name,
			description: tool.description,
			parameters: toolParameters || {},
		});
	}

	return result;
}

export async function executeTool(
	context: IExecuteFunctions,
	toolCall: ChatResponseToolCalls,
): Promise<{ callId: string; output: string }> {
	const tools = await context.getInputConnectionData(NodeConnectionTypes.AiTool, 0);
	if (!tools || !Array.isArray(tools)) {
		throw new NodeOperationError(context.getNode(), 'No tool inputs found');
	}

	const tool = tools.find((t) => t.name === toolCall.function.name);
	if (!tool) {
		throw new NodeOperationError(
			context.getNode(),
			`Tool "${toolCall.function.name}" not found`,
		);
	}

	const args = JSON.parse(toolCall.function.arguments || '{}');
	const result = await tool.invoke(args);
	context.logger.info(`Executing tool: ${toolCall.function.name}`);

	return {
		callId: toolCall.id,
		output: typeof result === 'string' ? result : JSON.stringify(result),
	};
}

export async function handleToolLoop(
	context: IExecuteFunctions,
	mode: 'chat' | 'responses',
	request: TextRequestBody,
	response: TextResponse,
	callApi: (body: TextRequestBody) => Promise<TextResponse>,
) {
	while (true) {
		const calls =
			mode === 'chat'
				? ((response as ChatResponse).choices[0].message?.tool_calls ?? [])
				: ((response as RespResponse).output ?? []).filter(
					(o: RespResponseOutput) => o.type === 'function_call',
				);

		if (calls.length === 0) break;

		if (mode === 'chat') {
			if (Array.isArray(request.messages)) {
				request.messages.push({
					role: 'assistant',
					tool_calls: calls,
				});
			}

			for (const call of calls as ChatResponseToolCalls[]) {
				const result = await executeTool(context, call);
				if (Array.isArray(request.messages)) {
					request.messages.push({
						role: 'tool',
						tool_call_id: result.callId,
						content: result.output,
					});
				}
			}
		} else {
			const toolEvents = Array<RespInputFunctionCall | RespInputFunctionCallOutPut>();

			for (const call of calls as {
				id: string;
				type: string;
				name: string;
				arguments: string;
				call_id: string;
				status: string;
			}[]) {
				const result = await executeTool(context, {
					id: call.id,
					function: {
						name: call.name,
						arguments: call.arguments,
					},
					type: 'function',
				});

				toolEvents.push(
					{
						type: 'function_call',
						name: call.name,
						arguments: call.arguments,
						call_id: call.id,
					},
					{
						type: 'function_call_output',
						call_id: result.callId,
						output: result.output,
					},
				);
			}

			if (Array.isArray(request.input)) {
				request.input = request.input.concat(toolEvents);
			}
		}

		response = await callApi(request);
	}

	return response;
}

export async function handleTextResource(
	ctx: IExecuteFunctions,
	i: number,
	model: string,
	mode: string,
	options: MessageOptions,
): Promise<TextRequestBody> {
	const inputTools = await getTools(ctx);
	const promptCollection = ctx.getNodeParameter('prompt', i, {}) as {
		messages?: Array<{ role: string; content: string }>;
	};

	if (mode === 'chat') {
		return {
			model,
			messages: (promptCollection.messages ?? []).map((msg) => ({
				role: msg.role,
				content: msg.content,
			})),
			max_completion_tokens: options.maxTokens === -1 ? undefined : options.maxTokens,
			temperature: options.temperature,
			top_p: options.topP,
			response_format: options.responseFormat === 'json_object' ? { type: 'json_object' } : undefined,
			parallel_tool_calls: options.parallelToolCalls ?? true,
			store: options.store ?? false,
			tools: (inputTools ?? []).map((t) => ({
				type: t.type ?? 'function',
				function: {
					name: t.name,
					description: t.description,
					parameters: t.parameters,
				},
				strict: true,
			})),
			tool_choice: options.toolChoice ?? 'auto',
		};
	} else if (mode === 'responses') {
		return {
			model,
			input: (promptCollection.messages ?? []).map((msg) => ({
				type: 'message',
				role: msg.role,
				content: msg.content,
			})),
			background: options.background ?? false,
			max_output_tokens: options.maxTokens === -1 ? undefined : options.maxTokens,
			temperature: options.temperature,
			top_p: options.topP,
			response_format:
				options.responseFormat === 'json_object' ? { type: 'json_object' } : undefined,
			parallel_tool_calls: options.parallelToolCalls ?? true,
			store: options.store ?? false,
			tools: (inputTools ?? []).map((t) => ({
				type: t.type ?? 'function',
				name: t.name,
				description: t.description,
				parameters: t.parameters,
				strict: true,
			})),
			tool_choice: options.toolChoice ?? 'auto',
		};
	}
	throw new NodeOperationError(ctx.getNode(), 'Unsupported chat operation.');
}

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	const requestMode = this.getNodeParameter('requestMode', i, 'chat') as string;
	const model = this.getNodeParameter('model', i) as string;
	const options = this.getNodeParameter('options', i, {}) as MessageOptions;

	const body = await handleTextResource(this, i, model, requestMode, options);
	const endpoint = requestMode === 'chat' ? '/chat/completions' : '/responses';

	let responseData = await apiRequest.call(this, 'POST', endpoint, {
		body: body as unknown as IDataObject,
	});

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

	return [{ json: responseData }];
}
