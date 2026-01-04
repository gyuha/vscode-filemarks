import * as path from 'node:path';
import Mocha from 'mocha';
import { glob } from 'glob';

export function run(): Promise<void> {
  const mocha = new Mocha({
    ui: 'tdd',
    color: true,
  });

  const testsRoot = path.resolve(__dirname, '..');

  return new Promise((resolve, reject) => {
    glob('**/**.test.js', { cwd: testsRoot })
      .then((files: string[]) => {
        for (const f of files) {
          mocha.addFile(path.resolve(testsRoot, f));
        }

        try {
          mocha.run(failures => {
            if (failures > 0) {
              reject(new Error(`${failures} tests failed.`));
            } else {
              resolve();
            }
          });
        } catch (err) {
          // eslint-disable-next-line no-console
          console.error(err);
          reject(err);
        }
      })
      .catch((err: Error) => {
        reject(err);
      });
  });
}
