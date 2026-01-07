export type ImageInputContent =
    | { type: string; text: string }
    | { type: string; image_url: string | { url: string } };

export type ImageInputMessage = {
    role: string;
    content: ImageInputContent[];
};

export interface RespTextInputMessage {
	type: string;
	role: string;
	content: string;
}

export interface RespTextInputFunctionCall {
	type: 'function_call',
	name: string,
	arguments: string,
	call_id: string,
}

export interface RespTextInputFunctionCallOutPut {
	type: 'function_call_output',
	call_id: string,
	output: string,
}

export interface ChatMessageNormal {
	role: string;
	content: string;
}

export interface ChatMessageToolCall {
	role: string;
	tool_calls: object;
}

export interface ChatMessageToolCallOutput {
	role: string;
	tool_call_id: string;
	content: string;
}

export type Property = {
	type: string;
	description?: string;
}

export type ToolParameters = {
	type: string;
	properties: {
		[key: string]: Property;
	};
	required?: string[];
	additionalProperties?: boolean;
}

export interface ChatRequestTools {
	type: string | 'function';
	function: {
		name: string;
		description: string;
		parameters: ToolParameters;
	};
	strict?: boolean;
}

export interface RespRequestTools {
	type: string | 'function';
	name: string;
	description: string;
	parameters: ToolParameters;
	strict?: boolean;
}

export interface ModelRequestOptions {
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
}

export interface TextRequestBody {
	model: string;
	messages?: Array<ChatMessageNormal | ChatMessageToolCall | ChatMessageToolCallOutput>;
	input?: Array<RespTextInputMessage | RespTextInputFunctionCall | RespTextInputFunctionCallOutPut>;
	max_tokens?: number;
	temperature?: number;
	top_p?: number;
	response_format?: { type: string };
	tools?: Array<ChatRequestTools | RespRequestTools>;
	tool_choice?: string;
	parallel_tool_calls?: boolean;
	store?: boolean;
	background?: boolean;
}

export interface ImageRequestBody {
	model: string;
	input?: ImageInputMessage[];
	messages?: ImageInputMessage[];
}

export type ModelRequestBody = TextRequestBody | ImageRequestBody;


export interface ChatResponseToolCalls {
	type: string | 'function';
	id: string;
	function: {
		name: string;
		arguments: string;
	}
}

export type RespResponseOutput =
	| {
			id: string;
			type: string;
			summary: object;
	  }
	| {
			id: string;
			type: string;
			status: string;
			content: object;
			role: string;
	  }
	| {
			id: string;
			type: string;
			name: string;
			arguments: string;
			call_id: string;
			status: string;
	  };

export interface RespResponse {
	id: string;
	object: string;
	created_at: number;
	model: string;
	output: RespResponseOutput[];
}

export type ChatResponseChoice = {
	index: number;
	message: {
		role: string;
		content?: string;
		tool_calls?: ChatResponseToolCalls[];
	};
	finish_reason: string;
}

export interface ChatResponse {
	id: string;
	object: string;
	created: number;
	model: string;
	choices: ChatResponseChoice[];
}

export type TextResponse = RespResponse | ChatResponse;