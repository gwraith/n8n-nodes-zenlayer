import type { AllEntities } from 'n8n-workflow';

type NodeMap = {
	text: 'message';
	image: 'analyze' | 'generate';
};

export type ZenlayerType = AllEntities<NodeMap>;
