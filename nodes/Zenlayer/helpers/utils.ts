import { IExecuteFunctions, NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';
import {
	FunctionTool,
	ToolParameters,
} from './interfaces';

const primitiveMappings = {
	ZodString: 'string',
	ZodNumber: 'number',
	ZodBigInt: 'integer',
	ZodBoolean: 'boolean',
	ZodNull: 'null',
} as const;
type PrimitiveTypeName = keyof typeof primitiveMappings;

export async function formatToOpenAIResponsesTool(name: string, description: string, shape: never) : Promise<FunctionTool> {
	const toolParameters: ToolParameters = {
		type: 'object',
		properties: {},
		additionalProperties: false,
	};
	const requiredParams: string[] = [];

	for (const [paramName, paramSchema] of Object.entries<Record<string, unknown>>(shape)) {
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

	return{
		type: 'function',
		name,
		description,
		parameters: toolParameters || {},
	};
}

export async function getConnectedTools(context: IExecuteFunctions): Promise<FunctionTool[]> {
	const tools = await context.getInputConnectionData(NodeConnectionTypes.AiTool, 0);
	if (!tools || !Array.isArray(tools)) {
		throw new NodeOperationError(context.getNode(), 'No tool inputs found');
	}

	const result: FunctionTool[] = [];
	for (const tool of tools) {
		//context.logger.info(`Processing tool: ${tool?.name || 'Unnamed Tool'} typeof ${typeof tool}`);
		//for (const key of Object.keys(tool)) {
		//	context.logger.info(`Tool property - ${key}: ${JSON.stringify((tool as never)[key])}`);
		//}

		if (tool.tools && Array.isArray(tool.tools)) {
			for (const subTool of tool.tools) {
				//context.logger.info(`Processing sub-tool: ${subTool?.name || 'Unnamed Sub-Tool'} typeof ${typeof subTool}`);
				//for (const key of Object.keys(subTool)) {
				//	context.logger.info(`Sub-tool property - ${key}: ${JSON.stringify((subTool as never)[key])}`);
				//}
				result.push(
					await formatToOpenAIResponsesTool(
						subTool.name,
						subTool.description,
						subTool.schema.shape as never,
					),
				);
			}
		} else {
			result.push(
				await formatToOpenAIResponsesTool(
					tool.name,
					tool.description,
					tool.schema.shape as never,
				),
			);
		}
	}

	return result;
}

export async function executeTool(
	context: IExecuteFunctions,
	callId: string,
	toolName: string,
	toolArguments: string,
): Promise<{ callId: string; output: string }> {
	const tools = await context.getInputConnectionData(NodeConnectionTypes.AiTool, 0);
	if (!tools || !Array.isArray(tools)) {
		throw new NodeOperationError(context.getNode(), 'No tool inputs found');
	}

	for (const tool of tools) {
		if (tool.tools && Array.isArray(tool.tools)) {
			for (const subTool of tool.tools) {
				if (subTool.name !== toolName) continue;

				const args = JSON.parse(toolArguments || '{}');
				const result = await subTool.invoke(args);
				//context.logger.info(`Executing tool: ${toolName}`);

				return {
					callId,
					output: typeof result === 'string' ? result : JSON.stringify(result),
				};
			}
		} else {
			if (tool.name !== toolName) continue;

			const args = JSON.parse(toolArguments || '{}');
			const result = await tool.invoke(args);
			//context.logger.info(`Executing tool: ${toolName}`);

			return {
				callId,
				output: typeof result === 'string' ? result : JSON.stringify(result),
			};
		}
	}

	throw new NodeOperationError(context.getNode(), `Tool "${toolName}" not found`);
}