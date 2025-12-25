import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeApiError,
	NodeConnectionTypes,
	NodeOperationError,
} from 'n8n-workflow';

import { zodToJsonSchema } from 'zod-to-json-schema';


export class Zenlayer implements INodeType {
    description: INodeTypeDescription = {
        displayName: 'Zenlayer',
        name: 'zenlayer',
        icon: 'file:../../icons/zenlayer.svg',
        group: ['transform'],
        version: [1],
        description: 'Consume Zenlayer AI Gateway APIs',
        subtitle: '={{$parameter["resource"] === "text" ? "Message a Model" : "Analyze Image"}}',
        defaults: {
            name: 'Zenlayer',
        },
        usableAsTool: true,
        codex: {
            categories: ['AI'],
            resources: {
                primaryDocumentation: [
                    {
                        url: 'https://docs.n8n.io',
                    },
                ],
            },
        },

        inputs: ['main', 'ai_tool'],
        inputNames: ['', 'Tools'],
        outputs: ['main'],

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
                default: 'text',
                noDataExpression: true,
                options: [
                    { name: 'Text', value: 'text' },
                    { name: 'Image', value: 'image' },
                ],
                description: 'Choose the resource to use',
            },
            {
                displayName: 'Operation',
                name: 'operation',
                type: 'options',
                default: 'messageModel',
                noDataExpression: true,
                options: [
                    {
                        name: 'Message a Model',
                        value: 'messageModel',
                        action: 'Message a model',
                        description: 'Send messages to a language model and receive responses',
                    },
                ],
                displayOptions: {
                    show: { '/resource': ['text'] },
                },
            },
            {
                displayName: 'Operation',
                name: 'operation',
                type: 'options',
                default: 'analyze',
                noDataExpression: true,
                options: [
                    {
                        name: 'Analyze Image',
                        value: 'analyze',
                        action: 'Analyze image',
                        description: 'Analyze images and get descriptions or insights'
                    },
                ],
                displayOptions: {
                    show: { '/resource': ['image'] },
                },
            },
            {
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
                                    { type: 'rootProperty', properties: { property: 'data' } },
                                    {
                                        type: 'filter',
                                        properties: {
                                            pass: `={{
												($parameter.options?.baseURL && !$parameter.options?.baseURL?.startsWith('https://api.openai.com/')) ||
												($credentials?.url && !$credentials.url.startsWith('https://api.openai.com/')) ||
												$responseItem.id.startsWith('ft:') ||
												$responseItem.id.startsWith('o1') ||
												$responseItem.id.startsWith('o3') ||
												($responseItem.id.startsWith('gpt-') && !$responseItem.id.includes('instruct'))
											}}`,
                                        },
                                    },
                                    {
                                        type: 'setKeyValue',
                                        properties: {
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
                displayOptions: {
                    hide: {
                        '/descriptionType': ['auto', 'manual'],
                    },
                },
            },
            {
                displayName: 'Model',
                name: 'model',
                type: 'options',
                default: 'gpt-5',
                options: [
                    { name: 'gpt-5', value: 'gpt-5' },
                    { name: 'gpt-4o', value: 'gpt-4o' },
                ],
                description: 'Select a model provided by your Zenlayer AI Gateway',
                displayOptions: {
                    show: {
                        '/descriptionType': ['auto', 'manual'],
                    },
                },
            },
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
                displayOptions: {
                    show: {
                        '/resource': ['text'],
                    },
                },
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
                displayOptions: {
                    show: {
                        '/resource': ['text'],
                    },
                },
            },
            {
                displayName: 'Text Input',
                name: 'imagePrompt',
                type: 'string',
                typeOptions: {
                    rows: 4,
                },
                default: "What's in this image?",
                displayOptions: {
                    show: {
                        '/resource': ['image'],
                    },
                },
            },
            {
                displayName: 'URL(s)',
                name: 'imageUrls',
                type: 'string',
                default: '',
                placeholder: 'e.g. https://example.com/image.jpeg',
                displayOptions: {
                    show: {
                        '/resource': ['image'],
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
                        displayName: 'Max Retries',
                        name: 'maxRetries',
                        type: 'number',
                        default: 2,
                    },
                    {
                        displayName: 'Max Tokens',
                        name: 'maxTokens',
                        type: 'number',
                        default: -1,
                    },
                    {
                        displayName: 'Parallel Tool Calls',
                        name: 'parallelToolCalls',
                        type: 'boolean',
                        default: true,
                        description: 'Whether Enable parallel tool calls (only for Responses API)',
                        displayOptions: {
                            show: {
                                '/requestMode': ['responses'],
                            },
                        },
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
                        displayOptions: {
                            show: {
                                '/requestMode': ['responses'],
                            },
                        },
                    },
                    {
                        displayName: 'Temperature',
                        name: 'temperature',
                        type: 'number',
                        default: 0.7,
                        typeOptions: { maxValue: 2, minValue: 0, numberPrecision: 1 },
                    },
                    {
                        displayName: 'Timeout',
                        name: 'timeout',
                        type: 'number',
                        default: 60000,
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
                        displayOptions: {
                            show: {
                                '/resource': ['text'],
                            },
                        },
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
        ],
    };

    async execute(this: IExecuteFunctions) {
        const items = this.getInputData();
        const returnData: INodeExecutionData[] = [];

        const credentials = await this.getCredentials('zenlayerApi');
        const baseURL = credentials.url;
        const apiKey = credentials.apiKey;

        if (!baseURL || !apiKey) {
            throw new NodeOperationError(this.getNode(), 'Zenlayer API credentials not configured properly.');
        }

        for (let i = 0; i < items.length; i++) {
            const requestMode = this.getNodeParameter('requestMode', i, 'chat') as string;
            const model = this.getNodeParameter('model', i) as string;
            const resource = this.getNodeParameter('resource', i) as string;

            const options = this.getNodeParameter('options', i, {}) as {
                background?: boolean;
                maxRetries?: number;
                maxTokens?: number;
                responseFormat?: string;
                temperature?: number;
                timeout?: number;
                topP?: number;
                parallelToolCalls?: boolean;
                store?: boolean;
                toolChoice?: string;
            };

            const maxRetries = options.maxRetries ?? 2;
            const timeout = options.timeout ?? 60000;

            let attempt = 0;
            let responseData;

            let endpoint;

            let body: any;

            if (resource === 'image') {
                endpoint = '/responses';
                body = await handleImageResource(this, i, model);
            } else {
                endpoint = requestMode === 'responses' ? '/responses' : '/chat/completions';
                body = await handleChatResource(this, i, model, requestMode, options);
            }

            while (attempt <= maxRetries) {
                try {
                    responseData = await this.helpers.httpRequest({
                        method: 'POST',
                        url: `${baseURL}${endpoint}`,
                        headers: {
                            Authorization: `Bearer ${apiKey}`,
                            'Content-Type': 'application/json',
                        },
                        body,
                        timeout,
                        json: true,
                    });

                    break;
                } catch (error) {
                    attempt++;
                    if (attempt > maxRetries) {
                        throw new NodeApiError(this.getNode(), error, {
                            message: `Zenlayer API request failed after ${maxRetries} retries.`,
                        });
                    }
                }
            }

            if (requestMode == 'chat' && resource === 'text') {
				const messages = body.messages;

				while (true) {
					const message = responseData.choices?.[0]?.message;

					if (!message?.tool_calls || message.tool_calls.length === 0) {
						break;
					}

					// 把 assistant 的 tool_calls 回写
					messages.push({
						role: 'assistant',
						tool_calls: message.tool_calls,
					});

					// 执行每一个 tool
					for (const toolCall of message.tool_calls) {
						const result = await executeTool(this, toolCall);

						messages.push({
							role: 'tool',
							tool_call_id: result.callId,
							content: result.output,
						});
					}

					// 再次请求模型
					responseData = await this.helpers.httpRequest({
						method: 'POST',
						url: `${baseURL}/chat/completions`,
						headers: {
							Authorization: `Bearer ${apiKey}`,
							'Content-Type': 'application/json',
						},
						body: {
							...body,
							messages,
						},
						timeout,
						json: true,
					});
				}

            } else  if (requestMode == 'responses' && resource === 'text') {
				let input = body.input;

				while (true) {
					const funcCalls = (responseData.output ?? []).filter(
						(o: any) => o.type === 'function_call',
					);

					if (funcCalls.length === 0) {
						break;
					}

					const toolOutputs = [];


					for (const funcCall of funcCalls) {
						const result = await executeTool(this, {
							id: funcCall.id,
							function: {
								name: funcCall.name,
								arguments: funcCall.arguments,
							},
						});

						toolOutputs.push(
							{
								type: 'function_call',
								name: funcCall.name,
								arguments: funcCall.arguments,
								call_id: funcCall.id,
							},
							{
								type: 'function_call_output',
								call_id: result.callId,
								output: result.output,
							}
						);
					}

					input = input.concat(toolOutputs);

					responseData = await this.helpers.httpRequest({
						method: 'POST',
						url: `${baseURL}/responses`,
						headers: {
							Authorization: `Bearer ${apiKey}`,
							'Content-Type': 'application/json',
						},
						body: {
							...body,
							input,
						},
						timeout,
						json: true,
					});
				}
            }

            returnData.push({ json: responseData });
        }

        return this.prepareOutputData(returnData);
    }
}

async function handleImageResource(
    context: IExecuteFunctions,
    i: number,
    model: string,
): Promise<any> {
    const operation = context.getNodeParameter('operation', i, 'analyze') as string;
    if (operation === 'analyze') {
        const imagePrompt = context.getNodeParameter('imagePrompt', i) as string;
        const imageUrl = context.getNodeParameter('imageUrls', i) as string;

        const input: any[] = [
            {
                role: 'user',
                content: [{ type: 'input_text', text: imagePrompt }],
            },
        ];

        const urls = imageUrl
            .split(',')
            .map((u) => u.trim())
            .filter(Boolean);
        for (const url of urls) {
            input[0].content.push({
                type: 'input_image',
                image_url: url,
            });
        }

        return {
            model,
            input,
        };
    }
    throw new NodeOperationError(context.getNode(), 'Unsupported image operation.');
}

async function handleChatResource(
    context: IExecuteFunctions,
    i: number,
    model: string,
    mode: string,
    options: any,
): Promise<any> {
    const toolsCollection = await context.getInputConnectionData(NodeConnectionTypes.AiTool, 0) as any;
	const inputTools: Array<{
		type?: string;
		name?: string;
		description?: string;
		parameters?: Record<string, any>;
	}> = [];

    for (const tool of toolsCollection) {
        context.logger.info(`Processing tool: ${tool?.name || 'Unnamed Tool'} typeof ${typeof tool}`);

		for (const key of Object.keys(tool)) {
			context.logger.info(`Tool property - ${key}: ${JSON.stringify((tool as any)[key])}`);
		}

		inputTools.push({
			type: tool.type,
			name: tool.name,
			description: tool.description,
			parameters: zodToJsonSchema(tool.schema)|| {},
		});
		context.logger.info(`Added tool from toolkit: ${tool.name}`);
    }

    const promptCollection = context.getNodeParameter('prompt', i, {}) as {
        messages?: Array<{ role: string; content: string }>;
    };

    const inputEvents: any[] = [];
    for (const m of promptCollection.messages ?? []) {
        inputEvents.push({
            type: 'message',
            role: m.role,
            content: m.content,
        });
    }

    const chatMessages: any[] = [];
    for (const m of promptCollection.messages ?? []) {
        chatMessages.push({
            role: m.role,
            content: m.content,
        });
    }

    if (mode === 'chat') {
        return {
            model,
            messages: chatMessages,
            max_tokens: options.maxTokens === -1 ? undefined : options.maxTokens,
            temperature: options.temperature,
            top_p: options.topP,
            response_format:
                options.responseFormat === 'json_object'
                    ? { type: 'json_object' }
                    : undefined,
            tools: (inputTools ?? []).map((t) => ({
				type: t.type ?? 'function',
                function: {
                    name: t.name,
                    description: t.description,
                    parameters: t.parameters,
                },
			})),
            tool_choice: options.toolChoice ?? 'auto',
        };
    } else if (mode === 'responses') {
        return {
            model,
            input: inputEvents,
            max_tokens: options.maxTokens === -1 ? undefined : options.maxTokens,
            temperature: options.temperature,
            top_p: options.topP,
            response_format:
                options.responseFormat === 'json_object'
                    ? { type: 'json_object' }
                    : undefined,
            parallel_tool_calls: options.parallelToolCalls ?? true,
            store: options.store ?? false,
            background: options.background ?? false,
            tools: (inputTools ?? []).map((t) => ({
				type: t.type ?? 'function',
				name: t.name,
				description: t.description,
				parameters: t.parameters,
			})),
            tool_choice: options.toolChoice ?? 'auto',
        };
    }
    throw new NodeOperationError(context.getNode(), 'Unsupported chat operation.');
}

async function executeTool(
	context: IExecuteFunctions,
	toolCall: any,
): Promise<{ callId: string; output: string }> {
	const toolName = toolCall.function.name;
	const args = JSON.parse(toolCall.function.arguments || '{}');

	// 通过 AiTool 连接获取所有 tool
	const tools = await context.getInputConnectionData(
		NodeConnectionTypes.AiTool,
		0,
	) as any[];

	const tool = tools.find((t) => t.name === toolName);

	if (!tool) {
		throw new NodeOperationError(
			context.getNode(),
			`Tool "${toolName}" not found`,
		);
	}

	context.logger.info(`Executing tool: ${toolName}`);

	const result = await tool.invoke(args);

	return {
		callId: toolCall.id,
		output: typeof result === 'string' ? result : JSON.stringify(result),
	};
}