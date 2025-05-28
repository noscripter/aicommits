import https from 'https';
import type { ClientRequest, IncomingMessage } from 'http';
import type {
	CreateChatCompletionRequest,
	CreateChatCompletionResponse,
} from 'openai';
import {
	type TiktokenModel,
	// encoding_for_model,
} from '@dqbd/tiktoken';
import createHttpsProxyAgent from 'https-proxy-agent';
import { KnownError } from './error.js';
import type { CommitType } from './config.js';
import { generatePrompt } from './prompt.js';

const httpsPost = async (
	hostname: string,
	path: string,
	headers: Record<string, string>,
	json: unknown,
	timeout: number,
	proxy?: string,
	insecureTls?: boolean
) =>
	new Promise<{
		request: ClientRequest;
		response: IncomingMessage;
		data: string;
	}>((resolve, reject) => {
		const postContent = JSON.stringify(json);
		
		// Enhanced TLS configuration for better connection stability
		const requestOptions = {
			port: 443,
			hostname,
			path,
			method: 'POST',
			headers: {
				...headers,
				'Content-Type': 'application/json',
				'Content-Length': Buffer.byteLength(postContent),
			},
			timeout,
			agent: proxy ? createHttpsProxyAgent(proxy) : undefined,
			// TLS configuration to handle connection issues
			secureProtocol: 'TLSv1_2_method',
			rejectUnauthorized: !insecureTls,
			// Keep alive settings for better connection stability
			keepAlive: true,
			keepAliveMsecs: 1000,
		};

		const request = https.request(requestOptions, (response) => {
			const body: Buffer[] = [];
			response.on('data', (chunk) => body.push(chunk));
			response.on('end', () => {
				resolve({
					request,
					response,
					data: Buffer.concat(body).toString(),
				});
			});
		});

		// Enhanced error handling for different types of connection issues
		request.on('error', (error: any) => {
			let errorMessage = error.message;
			
			// Handle specific TLS/SSL connection errors
			if (error.code === 'ECONNRESET') {
				errorMessage = 'Connection was reset by the server. This might be due to network issues or server overload.';
			} else if (error.code === 'ENOTFOUND') {
				errorMessage = `Cannot resolve hostname ${hostname}. Please check your internet connection.`;
			} else if (error.code === 'ETIMEDOUT') {
				errorMessage = 'Connection timed out. Please check your network connection and try again.';
			} else if (error.code === 'ECONNREFUSED') {
				errorMessage = `Connection refused by ${hostname}. The server might be down or unreachable.`;
			} else if (error.code === 'CERT_HAS_EXPIRED' || error.code === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE') {
				errorMessage = 'SSL certificate verification failed. This might be due to an outdated certificate or network security settings.';
			} else if (error.message.includes('socket disconnected before secure TLS connection was established')) {
				errorMessage = 'TLS handshake failed. This could be due to network issues, proxy settings, or firewall restrictions. Try checking your network configuration or using a different network.';
			}
			
			reject(new KnownError(errorMessage));
		});

		request.on('timeout', () => {
			request.destroy();
			reject(
				new KnownError(
					`Request timed out after ${timeout}ms. Try increasing the timeout with: aicommits config set timeout=<milliseconds> or check the OpenAI API status at https://status.openai.com`
				)
			);
		});

		// Handle socket-level errors that might occur during TLS handshake
		request.on('socket', (socket) => {
			socket.on('error', (error: any) => {
				if (error.message.includes('socket disconnected') || error.message.includes('TLS')) {
					reject(new KnownError(
						'TLS connection failed. This could be due to:\n' +
						'  • Network connectivity issues\n' +
						'  • Proxy or firewall blocking the connection\n' +
						'  • Corporate network restrictions\n' +
						'  • DNS resolution problems\n\n' +
						'Try:\n' +
						'  • Checking your internet connection\n' +
						'  • Configuring a proxy if needed: aicommits config set proxy=<proxy-url>\n' +
						'  • Increasing timeout: aicommits config set timeout=<milliseconds>\n' +
						'  • Using a different network'
					));
				} else {
					reject(error);
				}
			});
		});

		request.write(postContent);
		request.end();
	});

const createChatCompletion = async (
	apiKey: string,
	json: CreateChatCompletionRequest,
	timeout: number,
	proxy?: string,
	retries: number = 2,
	insecureTls?: boolean
) => {
	let lastError: Error | null = null;
	
	for (let attempt = 0; attempt <= retries; attempt++) {
		try {
			const { response, data } = await httpsPost(
				'api.openai.com',
				'/v1/chat/completions',
				{
					Authorization: `Bearer ${apiKey}`,
				},
				json,
				timeout,
				proxy,
				insecureTls
			);

			if (
				!response.statusCode ||
				response.statusCode < 200 ||
				response.statusCode > 299
			) {
				let errorMessage = `OpenAI API Error: ${response.statusCode} - ${response.statusMessage}`;

				if (data) {
					errorMessage += `\n\n${data}`;
				}

				if (response.statusCode === 500) {
					errorMessage += '\n\nCheck the API status: https://status.openai.com';
				}

				throw new KnownError(errorMessage);
			}

			return JSON.parse(data) as CreateChatCompletionResponse;
		} catch (error) {
			lastError = error as Error;
			
			// Don't retry on authentication errors or client errors (4xx)
			if (error instanceof KnownError && error.message.includes('401')) {
				throw error;
			}
			
			// Don't retry on the last attempt
			if (attempt === retries) {
				break;
			}
			
			// Only retry on network-related errors
			const errorMessage = error instanceof Error ? error.message : String(error);
			const isNetworkError = errorMessage.includes('TLS') || 
								   errorMessage.includes('socket disconnected') ||
								   errorMessage.includes('ECONNRESET') ||
								   errorMessage.includes('ETIMEDOUT') ||
								   errorMessage.includes('ENOTFOUND');
			
			if (!isNetworkError) {
				throw error;
			}
			
			// Wait before retrying (exponential backoff)
			const delay = Math.min(1000 * Math.pow(2, attempt), 5000);
			await new Promise(resolve => setTimeout(resolve, delay));
		}
	}
	
	// If we get here, all retries failed
	throw lastError || new KnownError('All connection attempts failed');
};

const sanitizeMessage = (message: string) =>
	message
		.trim()
		.replace(/[\n\r]/g, '')
		.replace(/(\w)\.$/, '$1');

const deduplicateMessages = (array: string[]) => Array.from(new Set(array));

// const generateStringFromLength = (length: number) => {
// 	let result = '';
// 	const highestTokenChar = 'z';
// 	for (let i = 0; i < length; i += 1) {
// 		result += highestTokenChar;
// 	}
// 	return result;
// };

// const getTokens = (prompt: string, model: TiktokenModel) => {
// 	const encoder = encoding_for_model(model);
// 	const tokens = encoder.encode(prompt).length;
// 	// Free the encoder to avoid possible memory leaks.
// 	encoder.free();
// 	return tokens;
// };

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
		const completion = await createChatCompletion(
			apiKey,
			{
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
			},
			timeout,
			proxy,
			retries,
			insecureTls
		);

		return deduplicateMessages(
			completion.choices
				.filter((choice) => choice.message?.content)
				.map((choice) => sanitizeMessage(choice.message!.content as string))
		);
	} catch (error) {
		const errorAsAny = error as any;
		if (errorAsAny.code === 'ENOTFOUND') {
			throw new KnownError(
				`Error connecting to ${errorAsAny.hostname} (${errorAsAny.syscall}). Are you connected to the internet?`
			);
		}

		throw errorAsAny;
	}
};
