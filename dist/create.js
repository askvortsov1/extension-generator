#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const args_1 = __importDefault(require("args"));
const prompts_1 = __importDefault(require("prompts"));
const mem_fs_1 = __importDefault(require("mem-fs"));
const mem_fs_editor_1 = __importDefault(require("mem-fs-editor"));
const yosay_1 = __importDefault(require("yosay"));
const ora_1 = __importDefault(require("ora"));
const chalk_1 = require("chalk");
const simple_1 = __importDefault(require("spdx-license-list/simple"));
const licenseList = Array.from(simple_1.default);
args_1.default.option('path', 'The root directory in which to create the Flarum extension', process.cwd(), p => path_1.default.resolve(p));
const flags = args_1.default.parse(process.argv);
const dir = (args_1.default.sub[0] && path_1.default.resolve(args_1.default.sub[0])) || flags.path;
const store = mem_fs_1.default.create();
const fs = mem_fs_editor_1.default.create(store);
const onCancel = () => process.exit();
const initial = true;
let spinner;
console.log(yosay_1.default('Welcome to a Flarum extension generator\n\n- FriendsOfFlarum'));
new Promise((resolve, reject) => {
    spinner = ora_1.default('Starting...').start();
    fs_1.default.readdir(dir, (err, files = []) => {
        spinner.stop();
        resolve((!err || err.code !== 'ENOENT') && files.length !== 0);
    });
})
    .then(exists => prompts_1.default([
    {
        name: 'verify',
        type: 'confirm',
        message: `Write to ${dir}`,
        initial,
    },
    {
        name: 'overwrite',
        type: prev => prev && exists && 'confirm',
        message: 'Directory not empty. Overwrite?',
    },
], { onCancel }))
    .then(({ verify, overwrite }) => {
    if (!verify || overwrite === false)
        return process.exit();
    if (overwrite)
        fs.delete(dir);
    process.stdout.write('\n');
    return prompts_1.default([
        {
            name: 'packageName',
            type: 'text',
            message: `Package ${chalk_1.reset.dim('(vendor/extension-name)')}`,
            validate: s => /^([0-9a-zA-Z-]{2,})\/([0-9a-zA-Z-]{2,})$/.test(s.trim()) ||
                'Invalid package name format',
            format: s => s.toLowerCase(),
        },
        {
            name: 'packageDescription',
            type: 'text',
            message: 'Package description',
        },
        {
            name: 'namespace',
            type: 'text',
            message: `Package namespace ${chalk_1.reset.dim('(Vendor\\ExtensionName)')}`,
            validate: s => /^([0-9a-zA-Z]+)\\([0-9a-zA-Z]+)$/.test(s.trim()) ||
                'Invalid namespace format',
            format: str => str &&
                str
                    .split('\\')
                    .map(s => s[0].toUpperCase() + s.slice(1))
                    .join('\\'),
        },
        {
            name: 'authorName',
            type: 'text',
            message: 'Author name',
        },
        {
            name: 'authorEmail',
            type: 'text',
            message: 'Author email',
            validate: s => !s ||
                /^[a-zA-Z0-9.!#$%&’*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/.test(s) ||
                'Invalid email format',
        },
        {
            name: 'license',
            type: 'autocomplete',
            message: 'License',
            choices: licenseList.map(e => ({ title: e })),
        },
        {
            name: 'extensionName',
            type: 'text',
            message: 'Extension name',
            validate: str => !!str.trim() || 'The extension name is required',
            format: str => str
                .split(' ')
                .map(s => (s.length > 3 ? s[0].toUpperCase() + s.slice(1) : s))
                .join(' '),
        },
        {
            name: 'admin',
            type: 'confirm',
            message: 'Admin CSS & JS',
            initial,
        },
        {
            name: 'forum',
            type: 'confirm',
            message: 'Forum CSS & JS',
            initial,
        },
        {
            name: 'useLocale',
            type: 'confirm',
            message: 'Locale',
            initial,
        },
        {
            name: 'useJs',
            type: (prev, values) => (values.admin || values.forum) && 'confirm',
            message: 'Javascript',
            initial,
        },
        {
            name: 'useCss',
            type: (prev, values) => (values.admin || values.forum) && 'confirm',
            message: 'CSS',
            initial,
        },
        {
            name: 'resourcesFolder',
            type: (prev, values) => (values.useLocale || values.useCss) && 'confirm',
            message: 'Move LESS & locale into resources folder?',
            initial,
        },
    ], { onCancel });
})
    .then(data => {
    process.stdout.write('\n');
    spinner = ora_1.default('Setting up extension...').start();
    const tpl = Object.assign(data, {
        packageNamespace: data.namespace.replace(/\\/, '\\\\'),
        resourcesFolder: data.resourcesFolder ? '/resources' : '',
        year: new Date().getFullYear(),
    });
    const mv = (from, to) => fs.move(path_1.default.resolve(dir, from), path_1.default.resolve(dir, to));
    const rename = (from, to) => fs_1.default.renameSync(path_1.default.resolve(dir, from), path_1.default.resolve(dir, to));
    const del = f => fs.delete(path_1.default.resolve(dir, f));
    const boilerplate = path_1.default.resolve(__dirname, '../boilerplate/**');
    fs.copyTpl(boilerplate, dir, tpl, null, { globOptions: { dot: true } });
    if (!tpl.useLocale)
        del('locale');
    if (!tpl.useJs)
        del('js');
    if (!tpl.useCss)
        del('less');
    if (!tpl.admin) {
        del('less/admin.less');
        del('js/src/admin');
        del('js/admin.js');
    }
    if (!tpl.forum) {
        if (tpl.useCss)
            del('less/app.less');
        if (tpl.useJs) {
            del('js/src/forum');
            del('js/forum.js');
        }
    }
    if (tpl.resourcesFolder) {
        if (tpl.useCss) {
            if (tpl.admin)
                mv('less/admin.less', 'resources/less/admin.less');
            if (tpl.forum)
                mv('less/forum.less', 'resources/less/forum.less');
            del('less');
        }
        if (tpl.useLocale)
            mv('locale/**', 'resources/locale');
    }
    else
        del('resources');
    const license = require(`spdx-license-list/licenses/${data.license}`);
    fs.write(path_1.default.resolve(dir, 'LICENSE.md'), license.licenseText);
    return new Promise((resolve, reject) => {
        fs.commit(err => {
            if (err)
                return reject(err);
            resolve();
        });
    });
})
    .then(() => {
    spinner.succeed(`Successfully set up Flarum extension in ${dir}`);
})
    .catch(err => {
    if (spinner)
        spinner.fail();
    console.error(err);
});
//# sourceMappingURL=create.js.map