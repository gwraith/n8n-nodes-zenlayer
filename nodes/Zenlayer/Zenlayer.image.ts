import { IExecuteFunctions, NodeOperationError } from 'n8n-workflow';
import { ImageInputMessage, IResourceRequest } from './Zenlayer.constants';

export async function handleImageResource(
    context: IExecuteFunctions,
    i: number,
    model: string,
	mode: string,
): Promise<IResourceRequest> {
    const operation = context.getNodeParameter('zenOperation', i, 'analyze') as string;
    if (operation === 'analyze') {
        const imagePrompt = context.getNodeParameter('imagePrompt', i) as string;
        const imageUrl = context.getNodeParameter('imageUrls', i) as string;

        const input: ImageInputMessage[] =
		[{
			role: 'user',
			content: [{ type: mode === 'chat' ? 'text' : 'input_text', text: imagePrompt }],
		}];

        const urls = imageUrl.split(',').map((u) => u.trim()).filter(Boolean);
        for (const url of urls) {
			const inputImage = {
				type: mode === 'chat' ?'image_url' : 'input_image',
				image_url: mode === 'chat' ? {
					url: url,
				} : url
			};
			input[0].content.push(inputImage);
        }

        if (mode === 'chat') {
			return {
				model,
				messages: input,
			};
		}else {
			return {
				model,
				input: input,
			};
		}
    }
    throw new NodeOperationError(context.getNode(), 'Unsupported image operation.');
}