#!/usr/bin/env node

import inquirer from 'inquirer';
import * as fs from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import createDirectoryContents from './createDirectoryContents.js';
import ora from 'ora';
import { exec } from 'child_process';
import { isAbsolute } from 'path';

const CURR_DIR = process.cwd();
const __dirname = dirname(fileURLToPath(import.meta.url));

const CHOICES = fs.readdirSync(`${__dirname}/templates`);

const QUESTIONS = [
  {
    name: 'project-choice',
    type: 'list',
    message: 'What project template would you like to generate?',
    choices: CHOICES,
  },
  {
    name: 'project-name',
    type: 'input',
    message: 'Project name:',
    validate: function (input) {
      if (/^([A-Za-z\-\\_\d])+$/.test(input)) return true;
      else
        return 'Project name may only include letters, numbers, underscores and hashes.';
    },
  },
  {
    name: 'project-path',
    type: 'input',
    message: 'Where to create the project:',
    default: '.',
  },
];

inquirer.prompt(QUESTIONS).then(answers => {
  const projectChoice = answers['project-choice'];
  const projectName = answers['project-name'];
  let projectPath = resolve(CURR_DIR, answers['project-path'], projectName);
  const templatePath = `${__dirname}/templates/${projectChoice}`;

  // Check if the path is absolute or relative and if it exists
  const leadingPath = isAbsolute(answers['project-path'])
    ? resolve(answers['project-path'])
    : resolve(CURR_DIR, answers['project-path']);
  if (!fs.existsSync(leadingPath)) {
    console.error(`The path ${leadingPath} does not exist.`);
    return;
  }

  // Create the directory
  try {
    fs.mkdirSync(projectPath, { recursive: true });
  } catch (err) {
    console.error(`Error creating directory ${projectPath}: ${err.message}`);
    return;
  }

  const spinner = ora('Generating project...').start();

  createDirectoryContents(templatePath, projectPath);

  spinner.succeed('Project generated');

  // ... (previous code)

  inquirer
    .prompt([
      {
        name: 'install-dependencies',
        type: 'confirm',
        message: 'Would you like to install dependencies?',
      },
    ])
    .then(answers => {
      if (!answers['install-dependencies']) {
        console.log(
          `Happy coding! Next steps:\ncd ./${projectName}\nand start your project`
        );
        return;
      }

      inquirer
        .prompt([
          {
            name: 'package-manager',
            type: 'list',
            message: 'Choose a package manager:',
            choices: ['npm', 'yarn', 'pnpm'],
          },
        ])
        .then(answers => {
          const packageManager = answers['package-manager'];
          const installProc = exec(`${packageManager} install`, {
            cwd: projectPath,
          });

          installProc.stdout.pipe(process.stdout);
          installProc.stderr.pipe(process.stderr);

          installProc.on('exit', () => {
            console.log(
              `\nHappy coding! Next steps:\ncd ./${projectName}\nand start your project`
            );
          });
        });
    });
});
