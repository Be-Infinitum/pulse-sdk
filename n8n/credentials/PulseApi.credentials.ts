import type {
	IAuthenticateGeneric,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

/**
 * Credential type for the Pulse Payment & Metering API.
 *
 * Uses Bearer token authentication with an API key (sk_live_...).
 */
export class PulseApi implements ICredentialType {
	name = 'pulseApi';
	displayName = 'Pulse API';
	documentationUrl = 'https://docs.beinfi.com';

	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
			placeholder: 'sk_live_...',
			description: 'Your Pulse API key from the dashboard',
		},
		{
			displayName: 'Base URL',
			name: 'baseUrl',
			type: 'string',
			default: 'https://api.beinfi.com/api/v1',
			description: 'Base URL for the Pulse API (change only for staging/self-hosted)',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials.apiKey}}',
			},
		},
	};
}
