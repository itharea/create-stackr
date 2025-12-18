import inquirer from 'inquirer';
import type { ORMChoice } from '../types/index.js';

export async function promptORM(): Promise<ORMChoice> {
  const { orm } = await inquirer.prompt([
    {
      type: 'list',
      name: 'orm',
      message: 'Select your ORM:',
      choices: [
        {
          name: 'Prisma - Type-safe ORM with auto-generated client',
          value: 'prisma',
        },
        {
          name: 'Drizzle - Lightweight, SQL-first TypeScript ORM',
          value: 'drizzle',
        },
      ],
      default: 'prisma',
    },
  ]);

  return orm;
}
