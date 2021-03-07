#!/usr/bin/env node

import path from 'path';
import filesystem from 'fs';
import args from 'args';
import prompts from 'prompts';
import memFs from 'mem-fs';
import editor from 'mem-fs-editor';
import yosay from 'yosay';
import ora from 'ora';

import steps from './update-steps';

args.option(
    'path',
    'The root directory in which to create the Flarum extension',
    process.cwd(),
    p => path.resolve(p)
);

const flags = args.parse(process.argv);
const dir = (args.sub[0] && path.resolve(args.sub[0])) || flags.path;
const store = memFs.create();
const fs = editor.create(store);

const onCancel = () => process.exit();
let spinner;

console.log(yosay('Welcome to a Flarum extension updator\n\n- FriendsOfFlarum'));

new Promise((resolve, reject) => {
    spinner = ora('Starting...').start();
    filesystem.readdir(dir, (err, files = []) => {
        spinner.stop();
        resolve((!err || err.code !== 'ENOENT') && files.length !== 0);
    });
})
    .then(() => 
        prompts(
            [
                {
                    name: 'verify',
                    type: 'confirm',
                    message: `Update in ${dir}`,
                    initial: true,
                }
            ],
            { onCancel }
        )
    )
    .then(({ verify }) => {
        if (!verify) return process.exit();

        const exists = f => fs.exists(path.resolve(dir, f));

        if (!exists('composer.json') || !exists('extend.php')) {
            process.stderr.write(`${dir} is not a valid Flarum extension! Flarum extensions must contain (at a minimum) 'extend.php' and 'composer.json' files.\n`);
            process.exit();
        }

        process.stdout.write('\n');

        return prompts(
            steps
                .map(step => step.prompts(fs, dir))
                .flat(),
            { onCancel }
        );
    })
    .then(data => {
        process.stdout.write('\n');
        spinner = ora('Applying Changes...').start();
        process.stdout.write('\n');

        // We need this for steps that copy boilerplate files over.
        // We can't have a version of boilerplate files without this,
        // as that loses having a single source of truth.
        // TODO: Refactor so we don't need to hardcode these keys in both scripts.
        const extensionComposerJson = fs.readJSON(path.resolve(dir, 'composer.json'));
        data.packageName = extensionComposerJson.name || '';
        data.packageDescription = extensionComposerJson.description || '';
        data.license = extensionComposerJson.license || '';
        data.authorName = '';
        data.authorEmail = '';
        data.packageNamespace = (Object.keys(extensionComposerJson?.autoload["psr-4"] ?? {})[0] || '').slice(0, -1).replace("\\", "\\\\");
        data.extensionName = extensionComposerJson?.extra["flarum-extension"].title || '';

        const boilerplateDir = path.resolve(__dirname, '../boilerplate');

        steps.forEach(step => {
            try {
                step.apply(data, fs, dir, boilerplateDir);
            } catch (error) {
                process.stderr.write(error.message);
                process.stderr.write('\n');
                process.exit();
            }
        })

        return new Promise((resolve, reject) => {
            fs.commit(err => {
                if (err) return reject(err);
                resolve();
            });
        });
    })
    .then(() => {
        spinner.succeed(`Successfully set up Flarum extension in ${dir}`);
    })
    .catch(err => {
        if (spinner) spinner.fail();
        console.error(err);
    });