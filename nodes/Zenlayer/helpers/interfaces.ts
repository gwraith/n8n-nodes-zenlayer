////////////////////////////////////////////////////////////////////
// Common Interface
////////////////////////////////////////////////////////////////////
export type ToolParameters = {
	type: string;
	properties: {
		[key: string]: {
			type: string;
			description?: string;
		};
	};
	required?: string[];
	additionalProperties?: boolean;
};

////////////////////////////////////////////////////////////////////
// Chat Completion Interfaces
////////////////////////////////////////////////////////////////////
export interface ChatCompletionContentPartText {
	type: 'text';
	text: string;
}

export interface ChatCompletionContentPartImage {
	type: 'image_url';
	image_url: {
		url: string;
		detail?: 'low' | 'high' | 'auto';
	};
}

export interface ChatCompletionContentPartInputAudio {
	type: 'input_audio';
	input_audio: {
		data: string;
		format: 'wav' | 'mp3';
	};
}

export interface ChatCompletionContentPartFile {
	type: 'file';
	file: {
		filename?: string;
		file_data?: string;
		file_id?: string;
	}
}

export type ChatCompletionContentPart =
	| ChatCompletionContentPartText
	| ChatCompletionContentPartImage
	| ChatCompletionContentPartInputAudio
	| ChatCompletionContentPartFile;

export interface ChatCompletionUserMessageParam {
	role: string | 'user';
	content: string | ChatCompletionContentPart[];
}

export interface ChatCompletionSystemMessageParam {
	content: string | Array<ChatCompletionContentPartText>;
	role: string | 'system';
}

export interface ChatCompletionToolMessageParam {
	role: string | 'tool';
	tool_call_id: string;
	content: string | Array<ChatCompletionContentPartText>;
}

export interface ChatCompletionMessageFunctionToolCall {
	type: string;
	id: string;
	function: {
		name: string;
		arguments: string;
	};
}

export interface ChatCompletionAssistantMessageParam {
	role: string | 'assistant';
	tool_calls: ChatCompletionMessageFunctionToolCall[];
}

export interface ChatCompletionFunctionTool {
	type: 'function';
	function: {
		name: string;
		description: string;
		parameters: ToolParameters;
		strict?: boolean;
	};
}

export interface ChatCompletionCustomTool {
	type: 'custom';
	custom: {
		name: string;
		description?: string;
		format?:
			| {
					type: 'text';
			  }
			| {
					type: 'grammar';
					grammar: {
						definition: string;
						syntax: 'lark' | 'regex';
					};
			  };
	};
}

export interface ResponseFormatJSONSchema {
	type: 'json_schema';
	json_schema: {
		name: string;
		description?: string;
		schema: { [key: string]: unknown };
		strict?: boolean | null;
	}
}

export type ResponseFormatConfig =
	| { type: 'text' }
	| { type: 'json_object' }
	| ResponseFormatJSONSchema;

export interface ChatCompletionCreateParamsBase {
	model: string;
	messages: Array<
		| ChatCompletionUserMessageParam
		| ChatCompletionAssistantMessageParam
		| ChatCompletionToolMessageParam
		| ChatCompletionSystemMessageParam
	>;
	max_completion_tokens?: number | null;
	temperature?: number | null;
	top_p?: number | null;
	response_format?: ResponseFormatConfig;
	tools?: Array<ChatCompletionFunctionTool | ChatCompletionCustomTool>;
	tool_choice?: string;
	parallel_tool_calls?: boolean;
	store?: boolean | null;
	verbosity?: 'low' | 'medium' | 'high' | null;
}

export type ChatCompletionChoice = {
	index: number;
	message: {
		role: 'assistant';
		content?: string;
		tool_calls?: ChatCompletionMessageFunctionToolCall[];
	};
	finish_reason: 'stop' | 'length' | 'tool_calls' | 'content_filter' | 'function_call';
};

export interface ChatCompletion {
	id: string;
	object: 'chat.completion';
	created: number;
	model: string;
	choices: ChatCompletionChoice[];
}

////////////////////////////////////////////////////////////////////
// Response Interfaces
////////////////////////////////////////////////////////////////////
export interface ResponseInputText {
	type: 'input_text';
	text: string;
}

export interface ResponseInputImage {
	type: 'input_image';
	detail?: 'low' | 'high' | 'auto';
	image_url: string | null;
}

export interface ResponseInputFile {
	type: 'input_file';
	file_data?: string;
	file_id?: string | null;
	file_url?: string;
	filename?: string;
}

export type ResponseInputContent = ResponseInputText | ResponseInputImage | ResponseInputFile;

export interface EasyInputMessage {
	type?: 'message';
	role:  string | 'user' | 'assistant' | 'system' | 'developer';
	content: string | ResponseInputContent[];
}

export interface ResponseInputItemMessage {
	content: ResponseInputContent[];
	role: 'user' | 'system' | 'developer';
	status?: 'in_progress' | 'completed' | 'incomplete';
	type?: 'message';
}

export interface ResponseFunctionToolCall {
	id?: string,
	type: 'function_call',
	name: string,
	arguments: string,
	call_id: string,
	status?: 'in_progress' | 'completed' | 'incomplete';
}

export interface FunctionCallOutput {
	type: 'function_call_output',
	call_id: string,
	output: string,
}

export interface ResponseReasoningItem {
	id: string;
	type: 'reasoning';
	summary: Array<{
		type: 'summary_text';
		text: string;
	}>;
	encrypted_content?: string | null;
	content?: Array<{
		type: 'reasoning_text';
		text: string;
	}>;
	status?: 'in_progress' | 'completed' | 'incomplete';
}

export interface FunctionTool {
	type: 'function';
	name: string;
	description: string;
	parameters: ToolParameters;
	strict?: boolean;
}

export interface ResponseFormatTextJSONSchemaConfig {
	name: string;
	schema: { [key: string]: unknown };
	type: 'json_schema';
	description?: string;
	strict?: boolean | null;
}

export interface ResponseTextConfig {
	format?:
		| { type: 'text' }
		| { type: 'json_object' }
		| ResponseFormatTextJSONSchemaConfig;
	verbosity?: 'low' | 'medium' | 'high' | null;
}

export interface ResponseCreateParamsBase {
	model: string;
	input: Array<
		| EasyInputMessage
		| ResponseFunctionToolCall
		| FunctionCallOutput
		| ResponseReasoningItem
		| ResponseInputItemMessage
	>;
	max_output_tokens?: number | null;
	temperature?: number | null;
	instructions?: string | null;
	top_p?: number | null;
	text?: ResponseTextConfig;
	tools?: Array<FunctionTool>;
	tool_choice?: string;
	parallel_tool_calls?: boolean | null;
	store?: boolean | null;
	background?: boolean | null;
	max_tool_calls?: number;
}

export interface ResponseOutputMessage {
	role: 'assistant';
	id: string;
	type: 'message';
	status: 'in_progress' | 'completed' | 'incomplete';
	content: object;
}

export type ResponseOutputItem = ResponseReasoningItem | ResponseOutputMessage | ResponseFunctionToolCall;

export interface Response {
	id: string;
	object: 'response';
	created_at: number;
	model: string;
	output: ResponseOutputItem[];
}

////////////////////////////////////////////////////////////////////
// Combined Types
////////////////////////////////////////////////////////////////////
export type ModelCreateParamsBase = ChatCompletionCreateParamsBase | ResponseCreateParamsBase;
export type ModelResponse = Response | ChatCompletion;