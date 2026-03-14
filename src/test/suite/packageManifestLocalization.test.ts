import * as assert from 'node:assert';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';

interface ManifestCommand {
  title?: string;
  category?: string;
}

interface ManifestConfigurationProperty {
  description?: string;
}

interface ManifestViewsWelcome {
  contents: string;
}

interface ExtensionManifest {
  displayName: string;
  description: string;
  contributes: {
    commands: ManifestCommand[];
    configuration: {
      title: string;
      properties: Record<string, ManifestConfigurationProperty>;
    };
    views: Record<string, Array<{ name: string }>>;
    viewsContainers: {
      activitybar: Array<{ title: string }>;
    };
    viewsWelcome: ManifestViewsWelcome[];
  };
}

type LocalizationFile = Record<string, string>;

const isPlaceholder = (value: string) => /^%[^%]+%$/.test(value);

const extractPlaceholders = (value: unknown, placeholders: Set<string>): void => {
  if (typeof value === 'string') {
    if (isPlaceholder(value)) {
      placeholders.add(value.slice(1, -1));
    }
    return;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      extractPlaceholders(item, placeholders);
    }
    return;
  }

  if (value && typeof value === 'object') {
    for (const nestedValue of Object.values(value)) {
      extractPlaceholders(nestedValue, placeholders);
    }
  }
};

const loadJson = async <T>(fileName: string): Promise<T> => {
  const filePath = path.resolve(__dirname, '../../../', fileName);
  const content = await fs.readFile(filePath, 'utf8');
  return JSON.parse(content) as T;
};

suite('Package Manifest Localization Test Suite', () => {
  test('Manifest should use localization placeholders for localizable fields', async () => {
    const manifest = await loadJson<ExtensionManifest>('package.json');

    assert.strictEqual(manifest.displayName, '%displayName%');
    assert.strictEqual(manifest.description, '%description%');
    assert.strictEqual(
      manifest.contributes.viewsContainers.activitybar[0].title,
      '%viewsContainers.filemarks.title%'
    );
    assert.strictEqual(
      manifest.contributes.views.filemarks[0].name,
      '%views.filemarks.treeView.name%'
    );
    assert.strictEqual(manifest.contributes.configuration.title, '%configuration.title%');

    for (const command of manifest.contributes.commands) {
      assert.ok(command.title && isPlaceholder(command.title), 'Command title should be localized');
      assert.strictEqual(command.category, '%category.filemarks%');
    }

    for (const property of Object.values(manifest.contributes.configuration.properties)) {
      assert.ok(
        property.description && isPlaceholder(property.description),
        'Configuration description should be localized'
      );
    }

    assert.strictEqual(
      manifest.contributes.viewsWelcome[0].contents,
      '%viewsWelcome.filemarks.treeView.empty.contents%'
    );
    assert.strictEqual(
      manifest.contributes.viewsWelcome[1].contents,
      '%viewsWelcome.filemarks.treeView.filtered.contents%'
    );
  });

  test('Referenced manifest localization keys should exist in English and Korean files', async () => {
    const manifest = await loadJson<ExtensionManifest>('package.json');
    const english = await loadJson<LocalizationFile>('package.nls.json');
    const korean = await loadJson<LocalizationFile>('package.nls.ko.json');

    const placeholders = new Set<string>();
    extractPlaceholders(manifest, placeholders);

    for (const placeholder of placeholders) {
      assert.ok(english[placeholder], `Missing English localization for ${placeholder}`);
      assert.ok(korean[placeholder], `Missing Korean localization for ${placeholder}`);
    }
  });
});
