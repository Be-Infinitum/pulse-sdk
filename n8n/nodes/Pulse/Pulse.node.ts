import type {
	IExecuteFunctions,
	INodeType,
	INodeTypeDescription,
	INodeExecutionData,
	IHttpRequestMethods,
	IHttpRequestOptions,
	IDataObject,
} from 'n8n-workflow';
import { NodeConnectionType } from 'n8n-workflow';

export class Pulse implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Pulse',
		name: 'pulse',
		icon: 'file:pulse.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Interact with Pulse Payment & Metering API',
		defaults: { name: 'Pulse' },
		inputs: [NodeConnectionType.Main],
		outputs: [NodeConnectionType.Main],
		credentials: [
			{
				name: 'pulseApi',
				required: true,
			},
		],
		properties: [
			// ─── Resource ────────────────────────────────────────────
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{ name: 'Payment Link', value: 'paymentLink' },
					{ name: 'Webhook', value: 'webhook' },
					{ name: 'Metering', value: 'metering' },
				],
				default: 'paymentLink',
			},

			// ─── Payment Link Operations ─────────────────────────────
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['paymentLink'] } },
				options: [
					{
						name: 'Create',
						value: 'create',
						action: 'Create a payment link',
						description: 'Create a new payment link',
					},
					{
						name: 'Get',
						value: 'get',
						action: 'Get a payment link',
						description: 'Retrieve a payment link by ID',
					},
					{
						name: 'List',
						value: 'list',
						action: 'List payment links',
						description: 'List all payment links',
					},
					{
						name: 'List Intents',
						value: 'listIntents',
						action: 'List payment intents',
						description: 'List payment attempts for a link',
					},
				],
				default: 'create',
			},

			// Payment Link: Create fields
			{
				displayName: 'Title',
				name: 'title',
				type: 'string',
				required: true,
				default: '',
				placeholder: 'Order #42',
				displayOptions: { show: { resource: ['paymentLink'], operation: ['create'] } },
				description: 'Display title shown to the payer',
			},
			{
				displayName: 'Amount',
				name: 'amount',
				type: 'string',
				required: true,
				default: '',
				placeholder: '99.90',
				displayOptions: { show: { resource: ['paymentLink'], operation: ['create'] } },
				description: 'Payment amount as decimal string (e.g. "99.90")',
			},
			{
				displayName: 'Currency',
				name: 'currency',
				type: 'options',
				options: [
					{ name: 'USD', value: 'USD' },
					{ name: 'BRL', value: 'BRL' },
				],
				default: 'USD',
				displayOptions: { show: { resource: ['paymentLink'], operation: ['create'] } },
				description: 'Currency for the payment',
			},
			{
				displayName: 'Description',
				name: 'linkDescription',
				type: 'string',
				default: '',
				displayOptions: { show: { resource: ['paymentLink'], operation: ['create'] } },
				description: 'Optional description shown on the checkout page',
			},

			// Payment Link: Get / List Intents
			{
				displayName: 'Payment Link ID',
				name: 'paymentLinkId',
				type: 'string',
				required: true,
				default: '',
				displayOptions: {
					show: { resource: ['paymentLink'], operation: ['get', 'listIntents'] },
				},
				description: 'The payment link UUID',
			},

			// Payment Link: List options
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				default: 20,
				typeOptions: { minValue: 1, maxValue: 100 },
				displayOptions: { show: { resource: ['paymentLink'], operation: ['list'] } },
				description: 'Max number of results to return',
			},
			{
				displayName: 'Offset',
				name: 'offset',
				type: 'number',
				default: 0,
				typeOptions: { minValue: 0 },
				displayOptions: { show: { resource: ['paymentLink'], operation: ['list'] } },
				description: 'Number of results to skip (pagination)',
			},

			// ─── Webhook Operations ──────────────────────────────────
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['webhook'] } },
				options: [
					{
						name: 'Create',
						value: 'create',
						action: 'Create a webhook',
						description: 'Subscribe to webhook events',
					},
					{
						name: 'List',
						value: 'list',
						action: 'List webhooks',
						description: 'List all webhook subscriptions',
					},
					{
						name: 'Delete',
						value: 'delete',
						action: 'Delete a webhook',
						description: 'Remove a webhook subscription',
					},
				],
				default: 'create',
			},

			// Webhook: Create fields
			{
				displayName: 'URL',
				name: 'webhookUrl',
				type: 'string',
				required: true,
				default: '',
				placeholder: 'https://example.com/webhook',
				displayOptions: { show: { resource: ['webhook'], operation: ['create'] } },
				description: 'HTTPS endpoint that will receive webhook POSTs',
			},
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
				displayOptions: { show: { resource: ['webhook'], operation: ['create'] } },
				description: 'Event types to subscribe to',
			},

			// Webhook: Delete
			{
				displayName: 'Webhook ID',
				name: 'webhookId',
				type: 'string',
				required: true,
				default: '',
				displayOptions: { show: { resource: ['webhook'], operation: ['delete'] } },
				description: 'The webhook UUID to delete',
			},

			// ─── Metering Operations ─────────────────────────────────
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['metering'] } },
				options: [
					{
						name: 'Track Event',
						value: 'trackEvent',
						action: 'Track a usage event',
						description: 'Record a single usage event',
					},
					{
						name: 'Track Batch',
						value: 'trackBatch',
						action: 'Track batch of usage events',
						description: 'Record multiple usage events at once',
					},
					{
						name: 'Get Usage',
						value: 'getUsage',
						action: 'Get aggregated usage',
						description: 'Query aggregated usage data',
					},
					{
						name: 'Get Customer Usage',
						value: 'getCustomerUsage',
						action: 'Get customer usage',
						description: 'Query usage for a specific customer',
					},
					{
						name: 'List Products',
						value: 'listProducts',
						action: 'List metering products',
						description: 'List all metering products',
					},
					{
						name: 'Create Product',
						value: 'createProduct',
						action: 'Create a metering product',
						description: 'Create a new product for metering',
					},
					{
						name: 'Create Meter',
						value: 'createMeter',
						action: 'Create a meter',
						description: 'Add a meter to a product',
					},
					{
						name: 'Create Customer',
						value: 'createCustomer',
						action: 'Create a customer',
						description: 'Register a customer on a product',
					},
				],
				default: 'trackEvent',
			},

			// Metering: Track Event
			{
				displayName: 'Meter ID',
				name: 'meterId',
				type: 'string',
				required: true,
				default: '',
				displayOptions: { show: { resource: ['metering'], operation: ['trackEvent'] } },
				description: 'Meter ID or slug to track against',
			},
			{
				displayName: 'Customer ID',
				name: 'customerId',
				type: 'string',
				required: true,
				default: '',
				displayOptions: { show: { resource: ['metering'], operation: ['trackEvent'] } },
				description: 'Your customer external ID',
			},
			{
				displayName: 'Value',
				name: 'value',
				type: 'number',
				required: true,
				default: 1,
				displayOptions: { show: { resource: ['metering'], operation: ['trackEvent'] } },
				description: 'Quantity consumed (e.g. number of tokens)',
			},
			{
				displayName: 'Event ID',
				name: 'eventId',
				type: 'string',
				default: '',
				displayOptions: { show: { resource: ['metering'], operation: ['trackEvent'] } },
				description: 'Idempotency key (auto-generated if empty)',
			},

			// Metering: Track Batch
			{
				displayName: 'Events (JSON)',
				name: 'batchEvents',
				type: 'json',
				required: true,
				default: '[\n  { "meterId": "", "customerId": "", "value": 1 }\n]',
				displayOptions: { show: { resource: ['metering'], operation: ['trackBatch'] } },
				description:
					'JSON array of events. Each: { meterId, customerId, value, eventId?, metadata? }',
			},

			// Metering: Get Usage
			{
				displayName: 'Customer ID',
				name: 'usageCustomerId',
				type: 'string',
				default: '',
				displayOptions: { show: { resource: ['metering'], operation: ['getUsage'] } },
				description: 'Filter usage by customer (optional)',
			},
			{
				displayName: 'Start Date',
				name: 'startDate',
				type: 'string',
				default: '',
				placeholder: '2024-01-01',
				displayOptions: {
					show: {
						resource: ['metering'],
						operation: ['getUsage', 'getCustomerUsage'],
					},
				},
				description: 'Start date filter (ISO 8601)',
			},
			{
				displayName: 'End Date',
				name: 'endDate',
				type: 'string',
				default: '',
				placeholder: '2024-12-31',
				displayOptions: {
					show: {
						resource: ['metering'],
						operation: ['getUsage', 'getCustomerUsage'],
					},
				},
				description: 'End date filter (ISO 8601)',
			},

			// Metering: Get Customer Usage / Create Meter / Create Customer — shared Product ID
			{
				displayName: 'Product ID',
				name: 'productId',
				type: 'string',
				required: true,
				default: '',
				displayOptions: {
					show: {
						resource: ['metering'],
						operation: ['getCustomerUsage', 'createMeter', 'createCustomer'],
					},
				},
				description: 'The product UUID',
			},

			// Metering: Get Customer Usage
			{
				displayName: 'Customer ID',
				name: 'customerUsageCustomerId',
				type: 'string',
				required: true,
				default: '',
				displayOptions: {
					show: { resource: ['metering'], operation: ['getCustomerUsage'] },
				},
				description: 'The customer external ID',
			},

			// Metering: Create Product
			{
				displayName: 'Name',
				name: 'productName',
				type: 'string',
				required: true,
				default: '',
				displayOptions: { show: { resource: ['metering'], operation: ['createProduct'] } },
				description: 'Product name',
			},
			{
				displayName: 'Description',
				name: 'productDescription',
				type: 'string',
				default: '',
				displayOptions: { show: { resource: ['metering'], operation: ['createProduct'] } },
				description: 'Optional product description',
			},

			// Metering: Create Meter
			{
				displayName: 'Name (Slug)',
				name: 'meterName',
				type: 'string',
				required: true,
				default: '',
				placeholder: 'tokens',
				displayOptions: { show: { resource: ['metering'], operation: ['createMeter'] } },
				description: 'Meter slug identifier',
			},
			{
				displayName: 'Display Name',
				name: 'meterDisplayName',
				type: 'string',
				required: true,
				default: '',
				placeholder: 'AI Tokens',
				displayOptions: { show: { resource: ['metering'], operation: ['createMeter'] } },
				description: 'Human-readable meter name',
			},
			{
				displayName: 'Unit',
				name: 'meterUnit',
				type: 'string',
				required: true,
				default: '',
				placeholder: 'token',
				displayOptions: { show: { resource: ['metering'], operation: ['createMeter'] } },
				description: 'Unit of measurement',
			},
			{
				displayName: 'Unit Price',
				name: 'meterUnitPrice',
				type: 'string',
				required: true,
				default: '',
				placeholder: '0.0001',
				displayOptions: { show: { resource: ['metering'], operation: ['createMeter'] } },
				description: 'Cost per unit as decimal string',
			},

			// Metering: Create Customer
			{
				displayName: 'External ID',
				name: 'externalId',
				type: 'string',
				required: true,
				default: '',
				displayOptions: {
					show: { resource: ['metering'], operation: ['createCustomer'] },
				},
				description: 'Your unique customer identifier',
			},
			{
				displayName: 'Name',
				name: 'customerName',
				type: 'string',
				default: '',
				displayOptions: {
					show: { resource: ['metering'], operation: ['createCustomer'] },
				},
				description: 'Customer display name',
			},
			{
				displayName: 'Email',
				name: 'customerEmail',
				type: 'string',
				default: '',
				placeholder: 'customer@example.com',
				displayOptions: {
					show: { resource: ['metering'], operation: ['createCustomer'] },
				},
				description: 'Customer email address',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;
		const credentials = await this.getCredentials('pulseApi');
		const baseUrl = (credentials.baseUrl as string) || 'https://api.beinfi.com/api/v1';

		for (let i = 0; i < items.length; i++) {
			try {
				let response: IDataObject;

				if (resource === 'paymentLink') {
					response = await executePaymentLink.call(this, operation, baseUrl, i);
				} else if (resource === 'webhook') {
					response = await executeWebhook.call(this, operation, baseUrl, i);
				} else {
					response = await executeMetering.call(this, operation, baseUrl, i);
				}

				// Unwrap Pulse API { data } envelope
				const result = response.data ?? response;
				const executionData = this.helpers.constructExecutionMetaData(
					this.helpers.returnJsonArray(result as IDataObject | IDataObject[]),
					{ itemData: { item: i } },
				);
				returnData.push(...executionData);
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: { error: (error as Error).message },
						pairedItem: { item: i },
					});
					continue;
				}
				throw error;
			}
		}

		return [returnData];
	}
}

// ─── Payment Link Handlers ──────────────────────────────────────

async function executePaymentLink(
	this: IExecuteFunctions,
	operation: string,
	baseUrl: string,
	i: number,
): Promise<IDataObject> {
	if (operation === 'create') {
		const body: IDataObject = {
			title: this.getNodeParameter('title', i) as string,
			amount: this.getNodeParameter('amount', i) as string,
			currency: this.getNodeParameter('currency', i) as string,
		};
		const desc = this.getNodeParameter('linkDescription', i) as string;
		if (desc) body.description = desc;

		return makeRequest.call(this, 'POST', `${baseUrl}/payment-links`, body);
	}

	if (operation === 'get') {
		const id = this.getNodeParameter('paymentLinkId', i) as string;
		return makeRequest.call(this, 'GET', `${baseUrl}/payment-links/${id}`);
	}

	if (operation === 'listIntents') {
		const id = this.getNodeParameter('paymentLinkId', i) as string;
		return makeRequest.call(this, 'GET', `${baseUrl}/payment-links/${id}/intents`);
	}

	// list
	const qs: IDataObject = {
		limit: this.getNodeParameter('limit', i) as number,
		offset: this.getNodeParameter('offset', i) as number,
	};
	return makeRequest.call(this, 'GET', `${baseUrl}/payment-links`, undefined, qs);
}

// ─── Webhook Handlers ───────────────────────────────────────────

async function executeWebhook(
	this: IExecuteFunctions,
	operation: string,
	baseUrl: string,
	i: number,
): Promise<IDataObject> {
	if (operation === 'create') {
		return makeRequest.call(this, 'POST', `${baseUrl}/webhooks`, {
			url: this.getNodeParameter('webhookUrl', i) as string,
			events: this.getNodeParameter('events', i) as string[],
		});
	}

	if (operation === 'delete') {
		const id = this.getNodeParameter('webhookId', i) as string;
		return makeRequest.call(this, 'DELETE', `${baseUrl}/webhooks/${id}`);
	}

	// list
	return makeRequest.call(this, 'GET', `${baseUrl}/webhooks`);
}

// ─── Metering Handlers ──────────────────────────────────────────

async function executeMetering(
	this: IExecuteFunctions,
	operation: string,
	baseUrl: string,
	i: number,
): Promise<IDataObject> {
	if (operation === 'trackEvent') {
		const body: IDataObject = {
			meterId: this.getNodeParameter('meterId', i) as string,
			customerId: this.getNodeParameter('customerId', i) as string,
			value: String(this.getNodeParameter('value', i)),
		};
		const eventId = this.getNodeParameter('eventId', i) as string;
		if (eventId) body.eventId = eventId;

		return makeRequest.call(this, 'POST', `${baseUrl}/metering/events`, body);
	}

	if (operation === 'trackBatch') {
		const raw = this.getNodeParameter('batchEvents', i);
		const events = typeof raw === 'string' ? JSON.parse(raw) : raw;
		return makeRequest.call(this, 'POST', `${baseUrl}/metering/events/batch`, { events });
	}

	if (operation === 'getUsage') {
		const qs: IDataObject = {};
		const cid = this.getNodeParameter('usageCustomerId', i) as string;
		const start = this.getNodeParameter('startDate', i) as string;
		const end = this.getNodeParameter('endDate', i) as string;
		if (cid) qs.customerId = cid;
		if (start) qs.startDate = start;
		if (end) qs.endDate = end;

		return makeRequest.call(this, 'GET', `${baseUrl}/metering/usage`, undefined, qs);
	}

	if (operation === 'getCustomerUsage') {
		const productId = this.getNodeParameter('productId', i) as string;
		const customerId = this.getNodeParameter('customerUsageCustomerId', i) as string;
		const qs: IDataObject = {};
		const start = this.getNodeParameter('startDate', i) as string;
		const end = this.getNodeParameter('endDate', i) as string;
		if (start) qs.startDate = start;
		if (end) qs.endDate = end;

		return makeRequest.call(
			this,
			'GET',
			`${baseUrl}/metering/products/${productId}/customers/${customerId}/usage`,
			undefined,
			qs,
		);
	}

	if (operation === 'listProducts') {
		return makeRequest.call(this, 'GET', `${baseUrl}/metering/products`);
	}

	if (operation === 'createProduct') {
		const body: IDataObject = {
			name: this.getNodeParameter('productName', i) as string,
		};
		const desc = this.getNodeParameter('productDescription', i) as string;
		if (desc) body.description = desc;

		return makeRequest.call(this, 'POST', `${baseUrl}/metering/products`, body);
	}

	if (operation === 'createMeter') {
		const productId = this.getNodeParameter('productId', i) as string;
		return makeRequest.call(
			this,
			'POST',
			`${baseUrl}/metering/products/${productId}/meters`,
			{
				name: this.getNodeParameter('meterName', i) as string,
				displayName: this.getNodeParameter('meterDisplayName', i) as string,
				unit: this.getNodeParameter('meterUnit', i) as string,
				unitPrice: this.getNodeParameter('meterUnitPrice', i) as string,
			},
		);
	}

	// createCustomer
	const productId = this.getNodeParameter('productId', i) as string;
	const body: IDataObject = {
		externalId: this.getNodeParameter('externalId', i) as string,
	};
	const name = this.getNodeParameter('customerName', i) as string;
	const email = this.getNodeParameter('customerEmail', i) as string;
	if (name) body.name = name;
	if (email) body.email = email;

	return makeRequest.call(
		this,
		'POST',
		`${baseUrl}/metering/products/${productId}/customers`,
		body,
	);
}

// ─── HTTP Helper ────────────────────────────────────────────────

async function makeRequest(
	this: IExecuteFunctions,
	method: IHttpRequestMethods,
	url: string,
	body?: IDataObject,
	qs?: IDataObject,
): Promise<IDataObject> {
	const options: IHttpRequestOptions = { method, url, json: true };
	if (body) options.body = body;
	if (qs) options.qs = qs;

	return this.helpers.httpRequestWithAuthentication.call(
		this,
		'pulseApi',
		options,
	) as Promise<IDataObject>;
}
