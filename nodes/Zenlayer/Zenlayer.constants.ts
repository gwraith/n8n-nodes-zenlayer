export type InputContent =
    | { type: 'input_text'; text: string }
    | { type: 'input_image'; image_url: string };

export type InputMessage = {
    role: 'user' | 'system' | 'assistant';
    content: InputContent[];
};
