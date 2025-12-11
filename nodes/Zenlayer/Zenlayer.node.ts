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

        inputs: ['main'],
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
            },
            {
                displayName: 'Mode',
                name: 'mode',
                type: 'options',
                default: 'chat',
                options: [
                    { name: 'Chat Completions', value: 'chat' },
                    { name: 'Responses API', value: 'responses' },
                ],
                description: 'Choose which Zenlayer endpoint to call',
            },
            {
                displayName: 'Tools',
                name: 'tools',
                type: 'fixedCollection',
                typeOptions: {
                    sortable: true,
                    multipleValues: true,
                },
                placeholder: 'Add Tool',
                default: {},
                description: 'Define function tools for the model to call',
                options: [
                    {
                        displayName: 'Tool',
                        name: 'tool',
                        values: [
                            {
                                displayName: 'Name',
                                name: 'name',
                                type: 'string',
                                default: '',
                            },
                            {
                                displayName: 'Description',
                                name: 'description',
                                type: 'string',
                                default: '',
                            },
                            {
                                displayName: 'Parameters (JSON Schema)',
                                name: 'parameters',
                                type: 'json',
                                default: {},
                                description: 'JSON Schema describing the function parameters',
                            },
                        ],
                    },
                ],
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
                displayName: 'Prompt',
                name: 'prompt',
                type: 'fixedCollection',
                typeOptions: {
                    sortable: true,
                    multipleValues: true,
                },
                placeholder: 'Add Message',
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
            const mode = this.getNodeParameter('mode', i, 'chat') as string; // ← 新增
            const model = this.getNodeParameter('model', i) as string;

            const toolsCollection = this.getNodeParameter('tools', i, {}) as {
                tool?: Array<{
                    type?: string;
                    name?: string;
                    description?: string;
                    parameters?: Record<string, any>;
                    strict?: boolean;
                }>;
            };
            const toolChoice = this.getNodeParameter('toolChoice', i, 'auto') as string;

            const promptCollection = this.getNodeParameter('prompt', i, {}) as {
                messages?: Array<{ role: string; content: string }>;
            };

            const messages = promptCollection.messages ?? [];

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
            };

            const maxRetries = options.maxRetries ?? 2;
            const timeout = options.timeout ?? 60000;

            let attempt = 0;
            let responseData;

            // 根据 mode 拼接 API 路径与 body
            const endpoint = mode === 'responses' ? '/responses' : '/chat/completions';

            let body: any;
            if (mode === 'chat') {
                body = {
                    model,
                    messages,
                    max_tokens: options.maxTokens === -1 ? undefined : options.maxTokens,
                    temperature: options.temperature,
                    top_p: options.topP,
                    response_format: options.responseFormat === 'json_object' ? { type: 'json_object' } : undefined,
                    tools: (toolsCollection.tool ?? []).map(t => ({
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
                                        this.getNode(),
                                        `Invalid JSON in tool parameters: ${p}`
                                    );
                                }
                            }
                            return p;
                        })(),
                        strict: t.strict ?? true,
                    })),
                    tool_choice: toolChoice === 'none' ? 'none' : 'auto',
                };
            } else if (mode === 'responses') {
                body = {
                    model,
                    input: [
                        {
                            role: 'user',
                            content: [
                                {
                                    type: 'input_text',
                                    text: messages.map(m => m.content).join('\n'),
                                },
                            ],
                        },
                    ],
                    max_tokens: options.maxTokens === -1 ? undefined : options.maxTokens,
                    temperature: options.temperature,
                    top_p: options.topP,
                    response_format: options.responseFormat === 'json_object' ? { type: 'json_object' } : undefined,
                    parallel_tool_calls: options.parallelToolCalls ?? true,
                    store: options.store ?? true,
                    background: options.background ?? false,
                    tools: (toolsCollection.tool ?? []).map(t => ({
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
                                        this.getNode(),
                                        `Invalid JSON in tool parameters: ${p}`
                                    );
                                }
                            }
                            return p;
                        })(),
                        strict: t.strict ?? true,
                    })),
                    tool_choice: toolChoice === 'none' ? 'none' : 'auto',
                };
            }

            // =====================================================//

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