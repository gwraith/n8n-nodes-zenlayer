import {
    IExecuteFunctions,
	NodeConnectionTypes,
	NodeOperationError,
} from 'n8n-workflow';

import {
	IResourceRequest,
	ModelRequestOptions,
	RespRequestTools,
	ToolParameters,
} from './interface';

export const primitiveMappings = {
	ZodString: 'string',
	ZodNumber: 'number',
	ZodBigInt: 'integer',
	ZodBoolean: 'boolean',
	ZodNull: 'null',
} as const;
type PrimitiveTypeName = keyof typeof primitiveMappings;

async function buildTools(
    context: IExecuteFunctions,
) {
    const tools = await context.getInputConnectionData(NodeConnectionTypes.AiTool, 0);
	if (!tools || !Array.isArray(tools)) {
		throw new NodeOperationError(context.getNode(), 'No tool inputs found');
	}

    const result: RespRequestTools[] = [];
	for (const tool of tools) {
		//context.logger.info(`Processing tool: ${tool?.name || 'Unnamed Tool'} typeof ${typeof tool}`);
		//for (const key of Object.keys(tool)) {
		//	context.logger.info(`Tool property - ${key}: ${JSON.stringify((tool as any)[key])}`);
		//}

        const parameters = Object.entries<Record<string, unknown>>(tool.schema.shape);
        context.logger.info(`parameters length: ${parameters.length}`);
        for (const [name, schema] of parameters) {
            context.logger.info(`Parameter entry - ${name}: ${JSON.stringify(schema)}`);
        }

        const toolParameters: ToolParameters = {
            type: 'object',
            properties: {},
        };
        const requiredParams: string[] = [];

        for (const [paramName, paramSchema] of parameters) {
            const typeName = (paramSchema as { _def: { typeName: string } })._def.typeName as PrimitiveTypeName;
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

    //return (tools ?? []).map((t) => ({
    //    type: t.type ?? 'function',
    //    name: t.name,
    //    description: t.description,
    //    parameters: zodToJsonSchema(t.schema) || {},
    //}));
}

export async function handleChatResource(
    context: IExecuteFunctions,
    i: number,
    model: string,
    mode: string,
    options: ModelRequestOptions,
): Promise<IResourceRequest> {
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
                strict: true,
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
                strict: true,
            })),
            tool_choice: options.toolChoice ?? 'auto',
        };
    }
    throw new NodeOperationError(context.getNode(), 'Unsupported chat operation.');
}