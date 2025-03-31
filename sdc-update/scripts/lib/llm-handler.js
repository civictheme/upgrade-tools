import { Anthropic } from '@anthropic-ai/sdk';
import pThrottle from 'p-throttle';

export class LLMHandler {
  constructor(options = {}) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    this.prompt = options.prompt || '';
    this.anthropic = new Anthropic({ apiKey });
    this.options = {
      system_prompt: options.system_prompt || '',
      inputDir: options.inputDir || '../components',
      outputDir: options.outputDir || './schemas',
      rateLimit: options.rateLimit || 3,
      rateLimitInterval: options.rateLimitInterval || 1000,
      processLimit: options.processLimit || 3,
      model: options.model || 'claude-3-5-sonnet-20241022',
    };

    this.results = {
      successful: [],
      failed: [],
    };
    const throttle = pThrottle({
      limit: this.options.rateLimit,
      interval: this.options.rateLimitInterval,
    });

    this.analyze = throttle(this.analyze);
  }

  /**
   * Create a request to analyze a reference file and return an output.
   *
   * @param {array} messages - messages to send to the LLM
   * @return {Promise<string>} Promise that resolves with the output file.
   * @throws {Error} If an API error occurs during the analysis process.
   */
  // eslint-disable-next-line no-unused-vars,class-methods-use-this
  async analyze(messages) {
    try {
      const body = {
        model: process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20241022',
        max_tokens: this.options.max_tokens || 8192,
        system: [{
          type: 'text',
          text: this.options.system_prompt,
        }],
        messages: messages,
      };
      const response = await this.anthropic.messages.create(body);
      console.log(`Request usage - Input tokens used: ${response.usage.input_tokens || 'unknown'} Output tokens used: ${response.usage.output_tokens || 'unknown'}`);
      return response.content[0].text;
    } catch (error) {
      const errorMessage = `API Error: ${error.message}`;
      console.error(errorMessage);
      throw new Error(errorMessage);
    }
  }

  /**
   * Processes a series of requests based on files in a given directory
   *
   * @param {string} directoryPath - Directory to component directory.
   * @return {Promise<Object>} Report on success / failures of process.
   */
  // eslint-disable-next-line no-unused-vars,class-methods-use-this
  async process(directoryPath) {
    throw new Error('Implement method in subclass');
  }

  /**
   * Output the file.
   *
   * @param {string} outputFileContent - content to be saved to file.
   * @param {string} outputPath - path to save the file.
   * @return {Promise<void>}
   */
  // eslint-disable-next-line class-methods-use-this,no-unused-vars
  async output(outputFileContent, outputPath) {
    throw new Error('Implement method in subclass');
  }

  /**
   * Method to report on the process.
   */
  // eslint-disable-next-line class-methods-use-this
  report() {
    console.log('\nProcessing Summary:');
    console.log(`Successfully processed: ${this.results.successful.length} files`);
    console.log(`Failed to process: ${this.results.failed.length} files`);

    if (this.results.failed.length > 0) {
      console.log('\nFailed files:');
      this.results.failed.forEach(({ file, error }) => {
        console.log(`- ${file}: ${error}`);
      });
    }
  }
}
