/**
 * Mock factory functions for common test scenarios
 *
 * NOTE: These are factory functions, not actual mocks.
 * Use vi.mock() at the top level of each test file to set up mocks.
 */

/**
 * Mock factory for execa - returns successful execution
 */
export const mockExecaSuccess = () => ({
  stdout: '',
  stderr: '',
  exitCode: 0,
});

/**
 * Mock factory for execa - returns failure
 */
export const mockExecaFailure = (message: string) => {
  const error = new Error(message);
  (error as any).exitCode = 1;
  return error;
};

/**
 * Mock factory for inquirer responses
 */
export const mockInquirerResponse = (responses: Record<string, any>) => responses;

/**
 * Mock factory for file system operations
 */
export const mockFsSuccess = () => Promise.resolve();

/**
 * Mock factory for file system errors
 */
export const mockFsError = (code: string, message: string) => {
  const error = new Error(message);
  (error as any).code = code;
  return error;
};
