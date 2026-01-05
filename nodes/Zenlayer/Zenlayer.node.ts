import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeApiError,
	NodeConnectionTypes,
	NodeOperationError,
} from 'n8n-workflow';

import { handleImageResource } from "./buildImageBody";
import { handleChatResource } from './buildTextBody';
import {
	TextResourceRequest,
	ChatResponseToolCalls,
	ResponseTextFunctionCall,
	ResponseTextFunctionCallOutPut,
	ModelRequestOptions,
	IResourceRequest,
	RespResponseOutput,
	TextResponse,
	ChatResponse,
	RespResponse,
} from './interface';

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
                name: 'zenOperation',
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
                name: 'zenOperation',
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
                                    {
                                        type: 'rootProperty',
                                        properties: {
                                            property: 'data',
                                        },
                                    },
                                    {
                                        type: 'setKeyValue',
                                        properties: {
                                            //name: '={{$responseItem.owned_by + "/" + $responseItem.id}}',
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
                //displayOptions: {
                //    show: {
                //        '/resource': ['text'],
                //    },
                //},
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

        for (let i = 0; i < items.length; i++) {
            const requestMode = this.getNodeParameter('requestMode', i, 'chat') as string;
            const model = this.getNodeParameter('model', i) as string;
            const resource = this.getNodeParameter('resource', i) as string;
            const options = this.getNodeParameter('options', i, {}) as ModelRequestOptions;
            const maxRetries = options.maxRetries ?? 2;
            const timeout = options.timeout ?? 60000;

            const body = resource === 'image'
                ? await handleImageResource(this, i, model, requestMode)
                : await handleChatResource(this, i, model, requestMode, options);

            let responseData = await zenlayerRequest(this, {
                method: 'POST',
                url: requestMode === 'chat' ? '/chat/completions' : '/responses',
                body,
                timeout,
                maxRetries,
            });

            if (resource === 'text') {
                responseData = await handleToolLoop(
                    this,
                    requestMode as 'chat' | 'responses',
                    body as TextResourceRequest,
                    responseData,
                    async (reqBody) => {
                        return await zenlayerRequest(this, {
                            method: 'POST',
                            url: requestMode === 'chat' ? '/chat/completions' : '/responses',
                            body: reqBody,
                            timeout,
                            maxRetries,
                        });
                    },
                );
            }

            returnData.push({ json: responseData });
        }

        return this.prepareOutputData(returnData);
    }
}

async function executeTool(
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

async function handleToolLoop(
    context: IExecuteFunctions,
    mode: 'chat' | 'responses',
    request: TextResourceRequest,
    response: TextResponse,
    callApi: (body: TextResourceRequest) => Promise<TextResponse>,
) {
    while (true) {
        const calls =
            mode === 'chat'
                ? (response as ChatResponse).choices[0].message?.tool_calls ?? []
                : ((response as RespResponse).output ?? []).filter((o: RespResponseOutput) => o.type === 'function_call');

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
            const toolEvents = Array<ResponseTextFunctionCall | ResponseTextFunctionCallOutPut>();

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

async function zenlayerRequest(
    context: IExecuteFunctions,
    params: {
        method: 'POST' | 'GET';
        url: string;
        body?: IResourceRequest;
        timeout: number;
        maxRetries: number;
    },
) {
    const credentials = await context.getCredentials('zenlayerApi');
    const baseURL = credentials.url;
    const apiKey = credentials.apiKey;

    if (!baseURL || !apiKey) {
        throw new NodeOperationError(context.getNode(), 'Zenlayer API credentials not configured properly.');
    }

    let attempt = 0;

    while (true) {
        try {
            return await context.helpers.httpRequest({
                method: params.method,
                url: `${baseURL}${params.url}`,
                headers: {
                    Authorization: `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                },
                body: params.body,
                timeout: params.timeout,
                json: true,
            });
        } catch (error) {
            if (attempt++ >= params.maxRetries) {
                throw new NodeApiError(context.getNode(), error);
            }
        }
    }
}
