import { IExecuteFunctions, NodeOperationError } from 'n8n-workflow';
import { ResponsesImageInputMessage, ZenlayerResourceRequest } from './Zenlayer.constants';

export async function handleImageResource(
    context: IExecuteFunctions,
    i: number,
    model: string,
): Promise<ZenlayerResourceRequest> {
    const operation = context.getNodeParameter('zenOperation', i, 'analyze') as string;
    if (operation === 'analyze') {
        const imagePrompt = context.getNodeParameter('imagePrompt', i) as string;
        const imageUrl = context.getNodeParameter('imageUrls', i) as string;

        const input: ResponsesImageInputMessage[] = [
            {
                role: 'user',
                content: [{ type: 'input_text', text: imagePrompt }],
            },
        ];

        const urls = imageUrl
            .split(',')
            .map((u) => u.trim())
            .filter(Boolean);
        for (const url of urls) {
            input[0].content.push({
                type: 'input_image',
                image_url: url,
            });
        }

        return {
            model,
            input,
        };
    }
    throw new NodeOperationError(context.getNode(), 'Unsupported image operation.');
}