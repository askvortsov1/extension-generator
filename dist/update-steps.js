"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TestInfrastructureStep = void 0;
const path_1 = __importDefault(require("path"));
const initial = false;
class TestInfrastructureStep {
    checkExists(fs, dir) {
        // We can't check existence of a folder, so we need to check a file
        // we know will be there in a valid setup.
        return fs.exists(path_1.default.resolve(dir, 'tests/integration/setup.php'));
    }
    prompts(fs, dir) {
        return [
            {
                name: 'addTests',
                type: 'confirm',
                message: 'Add testing infrastructure?',
                initial,
            },
            {
                name: 'overwriteTests',
                type: prev => prev && this.checkExists(fs, dir) && 'confirm',
                message: 'Test infrastructure files not empty. Overwrite with the latest version?',
            }
        ];
    }
    apply(data, fs, dir, boilerplateDir) {
        if (!data.addTests || (this.checkExists(fs, dir) && !data.overwriteTests))
            return;
        console.log("Copying over test files...");
        [
            'tests/phpunit.integration.xml',
            'tests/phpunit.unit.xml',
            'tests/fixtures/.gitkeep',
            'tests/integration/setup.php',
            'tests/unit/.gitkeep',
            '.github/workflows/test.yml'
        ].forEach(filePath => {
            fs.copyTpl(path_1.default.resolve(boilerplateDir, filePath), path_1.default.resolve(dir, filePath), data);
        });
        console.log("Updating composer.json test scripts...");
        // We need to clear out all the template tags, which are unnecessary here.
        fs.copyTpl(path_1.default.resolve(boilerplateDir, 'composer.json'), path_1.default.resolve(boilerplateDir, 'composer.json.tmp'), data);
        const boilerplateComposerJson = fs.readJSON(path_1.default.resolve(boilerplateDir, 'composer.json.tmp'));
        const extensionComposerJson = fs.readJSON(path_1.default.resolve(dir, 'composer.json'));
        extensionComposerJson.scripts = extensionComposerJson.scripts || {};
        extensionComposerJson['scripts-descriptions'] = extensionComposerJson['scripts-descriptions'] || {};
        extensionComposerJson['require-dev'] = extensionComposerJson['require-dev'] || {};
        Object.assign(extensionComposerJson.scripts, boilerplateComposerJson.scripts);
        Object.assign(extensionComposerJson['scripts-descriptions'], boilerplateComposerJson['scripts-descriptions']);
        Object.assign(extensionComposerJson['require-dev'], boilerplateComposerJson['require-dev']);
        fs.writeJSON(path_1.default.resolve(dir, 'composer.json'), extensionComposerJson);
        fs.delete(path_1.default.resolve(boilerplateDir, 'composer.json.tmp'));
        console.log("Test infrastructure update complete!");
    }
}
exports.TestInfrastructureStep = TestInfrastructureStep;
const steps = [
    new TestInfrastructureStep(),
];
exports.default = steps;
//# sourceMappingURL=update-steps.js.map