import {
	IExecuteFunctions,
	INodeType,
} from 'n8n-workflow';

import { router } from './actions/router';
import { versionDescription } from './actions/versionDescription';

export class Zenlayer implements INodeType {
	description = versionDescription;

	async execute(this: IExecuteFunctions) {
		this.logger.info("Executing Zenlayer node");
		return await router.call(this);
	}
}

