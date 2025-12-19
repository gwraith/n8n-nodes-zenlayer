import {
    IExecuteFunctions,
    INodeExecutionData,
    INodeType,
    INodeTypeDescription,
    NodeApiError,
    NodeOperationError,
} from 'n8n-workflow';


export class Zenlayer implements INodeType {
    description: INodeTypeDescription = {
        displayName: 'Zenlayer',
        name: 'zenlayer',
        icon: 'file:../../icons/zenlayer.svg',
        group: ['transform'],
        version: [1],
        description: 'Consume Zenlayer AI Gateway APIs',
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
                name: 'imageOperation',
                type: 'options',
                default: 'analyze',
                options: [
                    { name: 'Analyze Image', value: 'analyze' },
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
                        description: 'Run request in background (Responses API only)',
                        displayOptions: {
                            show: {
                                '/mode': ['responses'],
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
                        description: 'Enable parallel tool calls (only for Responses API)',
                        displayOptions: {
                            show: {
                                '/mode': ['responses'],
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
                        default: true,
                        description: 'Whether to store the response in the server (only for Responses API)',
                        displayOptions: {
                            show: {
                                '/mode': ['responses'],
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
    const imageOperation = context.getNodeParameter('imageOperation', i, 'analyze') as string;
    if (imageOperation === 'analyze') {
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
    const toolsCollection = context.getNodeParameter('tools', i, {}) as {
        tool?: Array<{
            type?: string;
            name?: string;
            description?: string;
            parameters?: Record<string, any>;
            strict?: boolean;
        }>;
    };

    const promptCollection = context.getNodeParameter('prompt', i, {}) as {
        messages?: Array<{ role: string; content: string }>;
        functionCall?: Array<{
            name: string;
            arguments: string;
            callId: string;
        }>;
        functionCallOutput?: Array<{
            callId: string;
            output: string;
        }>;
    };

    const inputEvents: any[] = [];
    for (const m of promptCollection.messages ?? []) {
        inputEvents.push({
            type: 'message',
            role: m.role,
            content: m.content,
        });
    }
    for (const fc of promptCollection.functionCall ?? []) {
        inputEvents.push({
            type: 'function_call',
            name: fc.name,
            arguments: fc.arguments,
            call_id: fc.callId,
        });
    }
    for (const fo of promptCollection.functionCallOutput ?? []) {
        inputEvents.push({
            type: 'function_call_output',
            call_id: fo.callId,
            output: fo.output,
        });
    }

    const chatMessages: any[] = [];
    for (const m of promptCollection.messages ?? []) {
        chatMessages.push({
            role: m.role,
            content: m.content,
        });
    }
    for (const fc of promptCollection.functionCall ?? []) {
        chatMessages.push({
            role: 'assistant',
            tool_calls: [
                {
                    id: fc.callId,
                    type: 'function',
                    function: {
                        name: fc.name,
                        arguments: fc.arguments,
                    },
                },
            ],
        });
    }
    for (const fo of promptCollection.functionCallOutput ?? []) {
        chatMessages.push({
            role: 'tool',
            tool_call_id: fo.callId,
            content: fo.output,
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
            tools: (toolsCollection.tool ?? []).map((t) => ({
                type: t.type ?? 'function',
                function: {
                    name: t.name,
                    description: t.description,
                    parameters: (() => {
                        const p = t.parameters;
                        if (typeof p === 'string') {
                            try {
                                return JSON.parse(p);
                            } catch (e) {
                                throw new NodeOperationError(
                                    context.getNode(),
                                    `Invalid JSON in tool parameters: ${p}`,
                                );
                            }
                        }
                        return p;
                    })(),
                },
                strict: t.strict ?? true,
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
            store: options.store ?? true,
            background: options.background ?? false,
            tools: (toolsCollection.tool ?? []).map((t) => ({
                type: t.type ?? 'function',
                name: t.name,
                description: t.description,
                parameters: (() => {
                    const p = t.parameters;
                    if (typeof p === 'string') {
                        try {
                            return JSON.parse(p);
                        } catch (e) {
                            throw new NodeOperationError(
                                context.getNode(),
                                `Invalid JSON in tool parameters: ${p}`,
                            );
                        }
                    }
                    return p;
                })(),
                strict: t.strict ?? true,
            })),
            tool_choice: options.toolChoice ?? 'auto',
        };
    }
    throw new NodeOperationError(context.getNode(), 'Unsupported chat operation.');
}

