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
const update_steps_1 = __importDefault(require("./update-steps"));
args_1.default.option('path', 'The root directory in which to create the Flarum extension', process.cwd(), p => path_1.default.resolve(p));
const flags = args_1.default.parse(process.argv);
const dir = (args_1.default.sub[0] && path_1.default.resolve(args_1.default.sub[0])) || flags.path;
const store = mem_fs_1.default.create();
const fs = mem_fs_editor_1.default.create(store);
const onCancel = () => process.exit();
let spinner;
console.log(yosay_1.default('Welcome to a Flarum extension updator\n\n- FriendsOfFlarum'));
new Promise((resolve, reject) => {
    spinner = ora_1.default('Starting...').start();
    fs_1.default.readdir(dir, (err, files = []) => {
        spinner.stop();
        resolve((!err || err.code !== 'ENOENT') && files.length !== 0);
    });
})
    .then(() => prompts_1.default([
    {
        name: 'verify',
        type: 'confirm',
        message: `Update in ${dir}`,
        initial: true,
    }
], { onCancel }))
    .then(({ verify }) => {
    if (!verify)
        return process.exit();
    const exists = f => fs.exists(path_1.default.resolve(dir, f));
    if (!exists('composer.json') || !exists('extend.php')) {
        process.stderr.write(`${dir} is not a valid Flarum extension! Flarum extensions must contain (at a minimum) 'extend.php' and 'composer.json' files.\n`);
        process.exit();
    }
    process.stdout.write('\n');
    return prompts_1.default(update_steps_1.default
        .map(step => step.prompts(fs, dir))
        .flat(), { onCancel });
})
    .then(data => {
    var _a;
    process.stdout.write('\n');
    spinner = ora_1.default('Applying Changes...').start();
    process.stdout.write('\n');
    // We need this for steps that copy boilerplate files over.
    // We can't have a version of boilerplate files without this,
    // as that loses having a single source of truth.
    // TODO: Refactor so we don't need to hardcode these keys in both scripts.
    const extensionComposerJson = fs.readJSON(path_1.default.resolve(dir, 'composer.json'));
    data.packageName = extensionComposerJson.name || '';
    data.packageDescription = extensionComposerJson.description || '';
    data.license = extensionComposerJson.license || '';
    data.authorName = '';
    data.authorEmail = '';
    data.packageNamespace = (Object.keys((_a = extensionComposerJson === null || extensionComposerJson === void 0 ? void 0 : extensionComposerJson.autoload["psr-4"]) !== null && _a !== void 0 ? _a : {})[0] || '').slice(0, -1).replace("\\", "\\\\");
    data.extensionName = (extensionComposerJson === null || extensionComposerJson === void 0 ? void 0 : extensionComposerJson.extra["flarum-extension"].title) || '';
    const boilerplateDir = path_1.default.resolve(__dirname, '../boilerplate');
    update_steps_1.default.forEach(step => {
        try {
            step.apply(data, fs, dir, boilerplateDir);
        }
        catch (error) {
            process.stderr.write(error.message);
            process.stderr.write('\n');
            process.exit();
        }
    });
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
//# sourceMappingURL=update.js.map