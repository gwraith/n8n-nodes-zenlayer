export type InputContent =
    | { type: 'input_text'; text: string }
    | { type: 'input_image'; image_url: string };

export type InputMessage = {
    role: 'user' | 'system' | 'assistant';
    content: InputContent[];
};

export type ToolsRequest =
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

export interface ChatResourceRequest 	{
	model: string;
	messages?: Array<{ role: string; content: string }>;
	input?: Array<{ type: string; role: string; content: string }>;
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
	input: InputMessage[];
}