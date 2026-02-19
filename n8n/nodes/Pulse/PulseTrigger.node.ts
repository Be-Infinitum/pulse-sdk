import type {
	IHookFunctions,
	IWebhookFunctions,
	INodeType,
	INodeTypeDescription,
	IWebhookResponseData,
	IHttpRequestMethods,
	IHttpRequestOptions,
	IDataObject,
} from 'n8n-workflow';
import { NodeConnectionType } from 'n8n-workflow';
import { createHmac } from 'crypto';

export class PulseTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Pulse Trigger',
		name: 'pulseTrigger',
		icon: 'file:pulse.svg',
		group: ['trigger'],
		version: 1,
		description: 'Starts workflow when a Pulse payment event occurs',
		defaults: { name: 'Pulse Trigger' },
		inputs: [],
		outputs: [NodeConnectionType.Main],
		credentials: [
			{
				name: 'pulseApi',
				required: true,
			},
		],
		webhooks: [
			{
				name: 'default',
				httpMethod: 'POST',
				responseMode: 'onReceived',
				path: 'pulse',
			},
		],
		properties: [
			{
				displayName: 'Events',
				name: 'events',
				type: 'multiOptions',
				required: true,
				options: [
					{ name: 'Payment Confirmed', value: 'payment.confirmed' },
					{ name: 'Payment Failed', value: 'payment.failed' },
					{ name: 'Payment Expired', value: 'payment.expired' },
				],
				default: ['payment.confirmed'],
				description: 'Which payment events should trigger this workflow',
			},
		],
	};

	webhookMethods = {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				const staticData = this.getWorkflowStaticData('node');
				if (!staticData.webhookId) return false;

				// Verify the webhook still exists on Pulse
				const credentials = await this.getCredentials('pulseApi');
				const baseUrl =
					(credentials.baseUrl as string) || 'https://api.beinfi.com/api/v1';

				try {
					const response = (await this.helpers.httpRequestWithAuthentication.call(
						this,
						'pulseApi',
						{
							method: 'GET' as IHttpRequestMethods,
							url: `${baseUrl}/webhooks`,
							json: true,
						} as IHttpRequestOptions,
					)) as IDataObject;

					const webhooks = (response.data ?? response) as IDataObject[];
					return Array.isArray(webhooks) &&
						webhooks.some((wh) => wh.id === staticData.webhookId);
				} catch {
					return false;
				}
			},

			async create(this: IHookFunctions): Promise<boolean> {
				const webhookUrl = this.getNodeWebhookUrl('default') as string;
				const events = this.getNodeParameter('events') as string[];
				const credentials = await this.getCredentials('pulseApi');
				const baseUrl =
					(credentials.baseUrl as string) || 'https://api.beinfi.com/api/v1';

				const response = (await this.helpers.httpRequestWithAuthentication.call(
					this,
					'pulseApi',
					{
						method: 'POST' as IHttpRequestMethods,
						url: `${baseUrl}/webhooks`,
						body: { url: webhookUrl, events },
						json: true,
					} as IHttpRequestOptions,
				)) as IDataObject;

				const data = (response.data ?? response) as IDataObject;
				const staticData = this.getWorkflowStaticData('node');
				staticData.webhookId = data.id;
				staticData.webhookSecret = data.secret;

				return true;
			},

			async delete(this: IHookFunctions): Promise<void> {
				const staticData = this.getWorkflowStaticData('node');
				const webhookId = staticData.webhookId as string;

				if (!webhookId) return;

				const credentials = await this.getCredentials('pulseApi');
				const baseUrl =
					(credentials.baseUrl as string) || 'https://api.beinfi.com/api/v1';

				try {
					await this.helpers.httpRequestWithAuthentication.call(
						this,
						'pulseApi',
						{
							method: 'DELETE' as IHttpRequestMethods,
							url: `${baseUrl}/webhooks/${webhookId}`,
							json: true,
						} as IHttpRequestOptions,
					);
				} catch {
					// Webhook may already be deleted — ignore cleanup errors
				}

				delete staticData.webhookId;
				delete staticData.webhookSecret;
			},
		},
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const req = this.getRequestObject();
		const body = req.body as IDataObject;

		// Verify HMAC signature if we have the secret from auto-registration
		const staticData = this.getWorkflowStaticData('node');
		const secret = staticData.webhookSecret as string | undefined;

		if (secret) {
			const signature = req.headers['x-pulse-signature'] as string | undefined;
			if (signature) {
				const rawBody =
					(req as unknown as { rawBody?: Buffer }).rawBody?.toString() ??
					JSON.stringify(body);
				const expected =
					'sha256=' +
					createHmac('sha256', secret).update(rawBody).digest('hex');

				if (signature !== expected) {
					return {
						webhookResponse: 'Invalid signature',
					} as unknown as IWebhookResponseData;
				}
			}
		}

		return {
			workflowData: [this.helpers.returnJsonArray(body)],
		};
	}
}
