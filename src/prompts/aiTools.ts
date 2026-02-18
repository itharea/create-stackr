import inquirer from 'inquirer';
import type { AITool } from '../types/index.js';

export async function promptAITools(): Promise<AITool[]> {
  const { aiTools } = await inquirer.prompt([
    {
      type: 'checkbox',
      name: 'aiTools',
      message: 'Which AI coding tools do you use?',
      choices: [
        { name: 'Claude Code', value: 'claude' },
        { name: 'Codex (OpenAI)', value: 'codex' },
        { name: 'Cursor', value: 'cursor' },
        { name: 'Windsurf', value: 'windsurf' },
      ],
    },
  ]);

  return aiTools;
}
