export type ImageInputContent =
    | { type: string; text: string }
    | { type: string; image_url: string | { url: string } };

export type ImageInputMessage = {
    role: string;
    content: ImageInputContent[];
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

export interface ImageResourceRequest {
	model: string;
	input?: ImageInputMessage[];
	messages?: ImageInputMessage[];
}

export type IResourceRequest = TextResourceRequest | ImageResourceRequest;


export interface IToolCall {
	type: string | 'function';
	id: string;
	function: {
		name: string;
		arguments: string;
	}
}

export type TextResponseOutput =
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

export interface TextResponseData {
	id: string;
	object: string;
	created_at: number;
	model: string;
	output: TextResponseOutput[];
}

export type ChatResponseChoice = {
	index: number;
	message: {
		role: string;
		content?: string;
		tool_calls?: IToolCall[];
	};
	finish_reason: string;
}

export interface TextChatRespData {
	id: string;
	object: string;
	created: number;
	model: string;
	choices: ChatResponseChoice[];
}

export type TextResponse = TextResponseData | TextChatRespData;