import path from 'path';
import prompts from 'prompts';

const initial = false;

export interface UpdateStepInterface {
    prompts(fs, dir: string):  prompts.PromptObject[];
    apply(data, fs, dir: string, boilerplateDir: string): void;
}

export class TestInfrastructureStep implements UpdateStepInterface {
    private checkExists(fs, dir) {
        // We can't check existence of a folder, so we need to check a file
        // we know will be there in a valid setup.
        return fs.exists(path.resolve(dir, 'tests/integration/setup.php'));
    }

    prompts(fs, dir: string): any[] {
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
    apply(data: any, fs: any, dir: string, boilerplateDir: string): void {
        if (!data.addTests || (this.checkExists(fs, dir) && !data.overwriteTests)) return;

        console.log("Copying over test files...");

        [
            'tests/phpunit.integration.xml',
            'tests/phpunit.unit.xml',
            'tests/fixtures/.gitkeep',
            'tests/integration/setup.php',
            'tests/unit/.gitkeep',
            '.github/workflows/test.yml'
        ].forEach(filePath => {
            fs.copyTpl(path.resolve(boilerplateDir, filePath), path.resolve(dir, filePath), data);
        });

        console.log("Updating composer.json test scripts...");
        // We need to clear out all the template tags, which are unnecessary here.
        fs.copyTpl(path.resolve(boilerplateDir, 'composer.json'), path.resolve(boilerplateDir, 'composer.json.tmp'), data);
        const boilerplateComposerJson = fs.readJSON(path.resolve(boilerplateDir, 'composer.json.tmp'));
        const extensionComposerJson = fs.readJSON(path.resolve(dir, 'composer.json'));

        extensionComposerJson.scripts = extensionComposerJson.scripts || {};
        extensionComposerJson['scripts-descriptions'] = extensionComposerJson['scripts-descriptions'] || {};
        extensionComposerJson['require-dev'] = extensionComposerJson['require-dev'] || {};

        Object.assign(extensionComposerJson.scripts, boilerplateComposerJson.scripts);
        Object.assign(extensionComposerJson['scripts-descriptions'], boilerplateComposerJson['scripts-descriptions']);
        Object.assign(extensionComposerJson['require-dev'], boilerplateComposerJson['require-dev']);
        fs.writeJSON(path.resolve(dir, 'composer.json'), extensionComposerJson);

        fs.delete(path.resolve(boilerplateDir, 'composer.json.tmp'));

        console.log("Test infrastructure update complete!");
    }
}

const steps: UpdateStepInterface[] = [
    new TestInfrastructureStep(),
];

export default steps;