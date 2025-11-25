import chalk from 'chalk';

export const logger = {
  info: (message: string) => {
    console.log(chalk.cyan(message));
  },

  success: (message: string) => {
    console.log(chalk.green(message));
  },

  warning: (message: string) => {
    console.log(chalk.yellow(message));
  },

  error: (message: string) => {
    console.log(chalk.red(message));
  },

  gray: (message: string) => {
    console.log(chalk.gray(message));
  },

  bold: (message: string) => {
    console.log(chalk.bold(message));
  },
};
