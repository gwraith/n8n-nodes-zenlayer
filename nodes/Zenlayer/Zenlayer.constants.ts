export type ResponsesImageInputContent =
    | { type: 'input_text'; text: string }
    | { type: 'input_image'; image_url: string };

export type ResponsesImageInputMessage = {
    role: 'user' | 'system' | 'assistant';
    content: ResponsesImageInputContent[];
};

export interface ResponseTextInputMessage {
	type: 'message';
	role: string;
	content: string;
}

export interface ResponseTextFunctionCall {
	type: 'function_call',
	name: string,
	arguments: string,
	call_id: string,
}

export interface ResponseTextFunctionCallOutPut {
	type: 'function_call_output',
	call_id: string,
	output: string,
}

export interface ChatTextMessage {
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

type ToolsRequest =
	| {
			type: string | 'function';
			function: {
				name: string;
				description: string;
				parameters: object;
			};
	  }
	| {
			type: string | 'function';
			name: string;
			description: string;
			parameters: object;
	  };

export interface ZenOptions {
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

export interface TextResourceRequest {
	model: string;
	messages?: Array<ChatTextMessage | ChatMessageToolCall | ChatMessageToolCallOutput>;
	input?: Array<ResponseTextInputMessage | ResponseTextFunctionCall | ResponseTextFunctionCallOutPut>;
	max_tokens?: number;
	temperature?: number;
	top_p?: number;
	response_format?: { type: string };
	tools?: Array<ToolsRequest>;
	tool_choice?: string;
	parallel_tool_calls?: boolean;
	store?: boolean;
	background?: boolean;
}

interface ImageResourceRequest {
	model: string;
	input: ResponsesImageInputMessage[];
}

export type ZenlayerResourceRequest = TextResourceRequest | ImageResourceRequest;


export interface IToolCall {
	type: string | 'function';
	id: string;
	function: {
		name: string;
		arguments: string;
	}
}
