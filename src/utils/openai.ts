import { OpenAI } from 'openai';
import type { TiktokenModel } from '@dqbd/tiktoken';
import { KnownError } from './error.js';
import type { CommitType } from './config.js';
import { generatePrompt } from './prompt.js';

const sanitizeMessage = (message: string) =>
	message
		.trim()
		.replace(/[\n\r]/g, '')
		.replace(/(\w)\.$/, '$1');

const deduplicateMessages = (array: string[]) => Array.from(new Set(array));

export const generateCommitMessage = async (
	apiKey: string,
	model: TiktokenModel,
	locale: string,
	diff: string,
	completions: number,
	maxLength: number,
	type: CommitType,
	timeout: number,
	proxy?: string,
	retries?: number,
	insecureTls?: boolean
) => {
	try {
		// Configure OpenAI client
		const openaiConfig: ConstructorParameters<typeof OpenAI>[0] = {
			apiKey,
			timeout: timeout,
			maxRetries: retries || 2,
		};

		// Configure proxy if provided
		if (proxy) {
			// For the OpenAI SDK, we need to use a custom fetch implementation with proxy support
			const { HttpsProxyAgent } = await import('https-proxy-agent');
			const agent = new HttpsProxyAgent(proxy);
			
			// Custom fetch function that uses the proxy agent
			openaiConfig.httpAgent = agent;
		}

		// Handle insecure TLS if needed
		if (insecureTls) {
			// For insecure TLS, we need to configure the global agent
			process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
		}

		const openai = new OpenAI(openaiConfig);

		const completion = await openai.chat.completions.create({
			model,
			messages: [
				{
					role: 'system',
					content: generatePrompt(locale, maxLength, type),
				},
				{
					role: 'user',
					content: diff,
				},
			],
			temperature: 0.7,
			top_p: 1,
			frequency_penalty: 0,
			presence_penalty: 0,
			max_tokens: 200,
			stream: false,
			n: completions,
		});

		// Reset TLS setting if it was modified
		if (insecureTls) {
			delete process.env.NODE_TLS_REJECT_UNAUTHORIZED;
		}

		return deduplicateMessages(
			completion.choices
				.filter((choice) => choice.message?.content)
				.map((choice) => sanitizeMessage(choice.message!.content as string))
		);
	} catch (error) {
		// Reset TLS setting if it was modified and an error occurred
		if (insecureTls) {
			delete process.env.NODE_TLS_REJECT_UNAUTHORIZED;
		}

		// Handle OpenAI SDK specific errors
		if (error instanceof OpenAI.APIError) {
			if (error.status === 401) {
				throw new KnownError(
					'Invalid OpenAI API key. Please check your API key with: aicommits config get OPENAI_KEY'
				);
			} else if (error.status === 429) {
				throw new KnownError(
					'OpenAI API rate limit exceeded. Please try again later or check your usage at https://platform.openai.com/usage'
				);
			} else if (error.status === 500) {
				throw new KnownError(
					'OpenAI API server error. Please try again later or check the API status at https://status.openai.com'
				);
			} else {
				throw new KnownError(
					`OpenAI API Error (${error.status}): ${error.message}`
				);
			}
		}

		// Handle connection errors
		if (error instanceof OpenAI.APIConnectionError) {
			let errorMessage = 'Failed to connect to OpenAI API. ';
			
			if (error.message.includes('ENOTFOUND')) {
				errorMessage += 'DNS resolution failed. Please check your internet connection.';
			} else if (error.message.includes('ECONNREFUSED')) {
				errorMessage += 'Connection refused. Please check your network connection and firewall settings.';
			} else if (error.message.includes('ETIMEDOUT')) {
				errorMessage += 'Connection timed out. Please check your network connection or try increasing the timeout.';
			} else if (error.message.includes('socket disconnected') || error.message.includes('TLS')) {
				errorMessage += 'TLS connection failed. This could be due to:\n' +
					'  • Network connectivity issues\n' +
					'  • Proxy or firewall blocking the connection\n' +
					'  • Corporate network restrictions\n' +
					'  • DNS resolution problems\n\n' +
					'Try:\n' +
					'  • Checking your internet connection\n' +
					'  • Configuring a proxy if needed: aicommits config set proxy=<proxy-url>\n' +
					'  • Increasing timeout: aicommits config set timeout=<milliseconds>\n' +
					'  • Using a different network';
			} else {
				errorMessage += error.message;
			}
			
			throw new KnownError(errorMessage);
		}

		// Handle timeout errors - check if it's a timeout by examining the error message
		if (error instanceof Error && (error.message.includes('timeout') || error.message.includes('ETIMEDOUT'))) {
			throw new KnownError(
				`Request timed out after ${timeout}ms. Try increasing the timeout with: aicommits config set timeout=<milliseconds> or check the OpenAI API status at https://status.openai.com`
			);
		}

		// Handle other OpenAI SDK errors
		if (error instanceof OpenAI.OpenAIError) {
			throw new KnownError(`OpenAI Error: ${error.message}`);
		}

		// Handle generic network errors (fallback)
		const errorAsAny = error as any;
		if (errorAsAny.code === 'ENOTFOUND') {
			throw new KnownError(
				`Error connecting to ${errorAsAny.hostname} (${errorAsAny.syscall}). Are you connected to the internet?`
			);
		}

		// Re-throw unknown errors
		throw error;
	}
};
