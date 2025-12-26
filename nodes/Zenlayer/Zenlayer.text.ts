import { IExecuteFunctions, NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';
import {zodToJsonSchema} from "zod-to-json-schema";

async function buildTools(
    context: IExecuteFunctions,
) {
    const tools = await context.getInputConnectionData(
        NodeConnectionTypes.AiTool,
        0,
    ) as any[];

    for (const tool of tools) {
		context.logger.info(`Processing tool: ${tool?.name || 'Unnamed Tool'} typeof ${typeof tool}`);
		for (const key of Object.keys(tool)) {
			context.logger.info(`Tool property - ${key}: ${JSON.stringify((tool as any)[key])}`);
		}
	}

    return (tools ?? []).map((t) => ({
        type: t.type ?? 'function',
        name: t.name,
        description: t.description,
        parameters: zodToJsonSchema(t.schema) || {},
    }));
}

export async function handleChatResource(
    context: IExecuteFunctions,
    i: number,
    model: string,
    mode: string,
    options: any,
): Promise<any> {
    const inputTools = await buildTools(context);
    const promptCollection = context.getNodeParameter('prompt', i, {}) as {
        messages?: Array<{ role: string; content: string }>;
    };

    if (mode === 'chat') {
        return {
            model,
            messages: (promptCollection.messages ?? []).map(msg => ({
                role: msg.role,
                content: msg.content,
            })),
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
            input: (promptCollection.messages ?? []).map(msg => ({
                type: 'message',
                role: msg.role,
                content: msg.content,
            })),
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