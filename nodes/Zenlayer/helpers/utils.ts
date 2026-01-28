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
	ZodArray: 'array',
	ZodNull: 'null',
} as const;
type PrimitiveTypeName = keyof typeof primitiveMappings;

export async function formatToParameters(_context: IExecuteFunctions, shape: never): Promise<ToolParameters> {
	const toolParameters: ToolParameters = {
		type: 'object',
		properties: {},
		additionalProperties: false,
	};
	const requiredParams: string[] = [];

	for (const [paramName, paramSchema] of Object.entries<Record<string, unknown>>(shape)) {
		toolParameters.properties[paramName] = {};

		const typeName = (paramSchema as { _def: { typeName: string } })._def.typeName;
		if (typeName === 'ZodAny') continue;

		toolParameters.properties[paramName].type = primitiveMappings[typeName as PrimitiveTypeName];

		//_context.logger.info(`Processing parameter: ${paramName} of type ${typeName}`);
		//_context.logger.info(`parameter: ${paramName}: ${JSON.stringify(paramSchema)}`);

		if (typeName === 'ZodArray') {
			const elementSchema = (paramSchema as { _def: { type: never } })._def.type;
			const itemsType = (elementSchema as { _def: { typeName: string } })._def.typeName;

			//_context.logger.info(`Array element type: ${itemsType}`);

			if (itemsType !== 'ZodAny') {
				toolParameters.properties[paramName].items = {
					type: primitiveMappings[itemsType as PrimitiveTypeName],
				};
			}
		}

		toolParameters.properties[paramName].description = paramSchema.description as string;

		if (typeof paramSchema.isOptional === 'function' && !paramSchema.isOptional()) {
			requiredParams.push(paramName);
		}
	}

	toolParameters.required = requiredParams.length > 0 ? requiredParams : undefined;
	return toolParameters;
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
				const parameters = await formatToParameters(context, subTool.schema.shape as never);
				result.push({
					type: 'function',
					name: subTool.name,
					description: subTool.description,
					parameters,
					strict: parameters.required?.length === Object.keys(subTool.schema.shape).length,
				});
			}
		} else {
			const parameters = await formatToParameters(context, tool.schema.shape as never);
			result.push({
				type: 'function',
				name: tool.name,
				description: tool.description,
				parameters,
				strict: parameters.required?.length === Object.keys(tool.schema.shape).length,
			});
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