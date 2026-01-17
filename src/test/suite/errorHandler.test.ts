import * as assert from 'node:assert';
import {
  ErrorHandler,
  FilemarkError,
  ErrorCode,
  ErrorSeverity,
  errorHandler,
} from '../../utils/errorHandler';

suite('ErrorHandler Test Suite', () => {
  suite('FilemarkError', () => {
    test('should create error with default values', () => {
      const error = new FilemarkError('Test error');

      assert.strictEqual(error.message, 'Test error');
      assert.strictEqual(error.code, ErrorCode.Unknown);
      assert.strictEqual(error.severity, ErrorSeverity.Error);
      assert.strictEqual(error.name, 'FilemarkError');
      assert.ok(error.timestamp);
    });

    test('should create error with custom values', () => {
      const context = { filePath: '/test/path' };
      const error = new FilemarkError(
        'Custom error',
        ErrorCode.FileNotFound,
        ErrorSeverity.Warning,
        context
      );

      assert.strictEqual(error.message, 'Custom error');
      assert.strictEqual(error.code, ErrorCode.FileNotFound);
      assert.strictEqual(error.severity, ErrorSeverity.Warning);
      assert.deepStrictEqual(error.context, context);
    });

    test('should be instanceof Error', () => {
      const error = new FilemarkError('Test');

      assert.ok(error instanceof Error);
      assert.ok(error instanceof FilemarkError);
    });

    test('fromError should convert standard Error', () => {
      const standardError = new Error('Standard error message');
      const filemarkError = FilemarkError.fromError(standardError, ErrorCode.StorageRead);

      assert.strictEqual(filemarkError.message, 'Standard error message');
      assert.strictEqual(filemarkError.code, ErrorCode.StorageRead);
    });

    test('fromError should return FilemarkError unchanged', () => {
      const original = new FilemarkError('Original', ErrorCode.JsonParse);
      const result = FilemarkError.fromError(original, ErrorCode.StorageRead);

      assert.strictEqual(result, original);
      assert.strictEqual(result.code, ErrorCode.JsonParse);
    });

    test('fromError should handle string error', () => {
      const error = FilemarkError.fromError('string error');

      assert.strictEqual(error.message, 'string error');
    });

    test('fileNotFound should create correct error', () => {
      const error = FilemarkError.fileNotFound('/path/to/file.ts');

      assert.strictEqual(error.code, ErrorCode.FileNotFound);
      assert.strictEqual(error.severity, ErrorSeverity.Warning);
      assert.strictEqual(error.context?.filePath, '/path/to/file.ts');
      assert.ok(error.message.includes('/path/to/file.ts'));
    });

    test('jsonParse should create correct error', () => {
      const parseError = new SyntaxError('Unexpected token');
      const error = FilemarkError.jsonParse(parseError, '/config.json');

      assert.strictEqual(error.code, ErrorCode.JsonParse);
      assert.strictEqual(error.severity, ErrorSeverity.Error);
      assert.strictEqual(error.context?.filePath, '/config.json');
    });

    test('noWorkspace should create correct error', () => {
      const error = FilemarkError.noWorkspace();

      assert.strictEqual(error.code, ErrorCode.NoWorkspace);
      assert.strictEqual(error.severity, ErrorSeverity.Warning);
    });

    test('noActiveEditor should create correct error', () => {
      const error = FilemarkError.noActiveEditor();

      assert.strictEqual(error.code, ErrorCode.NoActiveEditor);
      assert.strictEqual(error.severity, ErrorSeverity.Warning);
    });

    test('storageRead should create correct error', () => {
      const error = FilemarkError.storageRead(new Error('Read failed'), '/storage.json');

      assert.strictEqual(error.code, ErrorCode.StorageRead);
      assert.strictEqual(error.severity, ErrorSeverity.Error);
      assert.strictEqual(error.message, 'Read failed');
    });

    test('storageWrite should create correct error', () => {
      const error = FilemarkError.storageWrite(new Error('Write failed'), '/storage.json');

      assert.strictEqual(error.code, ErrorCode.StorageWrite);
      assert.strictEqual(error.severity, ErrorSeverity.Error);
    });

    test('corruptedData should create correct error', () => {
      const error = FilemarkError.corruptedData('/data.json');

      assert.strictEqual(error.code, ErrorCode.CorruptedData);
      assert.strictEqual(error.severity, ErrorSeverity.Error);
    });
  });

  suite('ErrorHandler', () => {
    test('getInstance should return singleton', () => {
      const instance1 = ErrorHandler.getInstance();
      const instance2 = ErrorHandler.getInstance();

      assert.strictEqual(instance1, instance2);
    });

    test('exported errorHandler should be singleton instance', () => {
      const instance = ErrorHandler.getInstance();

      assert.strictEqual(errorHandler, instance);
    });

    test('handle should return FilemarkError', () => {
      const error = new Error('Test error');
      const result = errorHandler.handle(error, { showMessage: false, log: false });

      assert.ok(result instanceof FilemarkError);
    });

    test('handle should preserve FilemarkError', () => {
      const original = new FilemarkError('Original', ErrorCode.FileNotFound);
      const result = errorHandler.handle(original, { showMessage: false, log: false });

      assert.strictEqual(result, original);
    });

    test('handleSilent should not show message', () => {
      const error = new Error('Silent error');
      const result = errorHandler.handleSilent(error);

      assert.ok(result instanceof FilemarkError);
    });

    test('wrap should catch sync errors', () => {
      const throwingFn = () => {
        throw new Error('Sync error');
      };

      const wrapped = errorHandler.wrap(throwingFn, { showMessage: false, log: false });
      const result = wrapped();

      assert.strictEqual(result, undefined);
    });

    test('wrap should return value on success', () => {
      const successFn = () => 42;

      const wrapped = errorHandler.wrap(successFn, { showMessage: false, log: false });
      const result = wrapped();

      assert.strictEqual(result, 42);
    });

    test('wrapAsync should catch async errors', async () => {
      const throwingFn = async () => {
        throw new Error('Async error');
      };

      const wrapped = errorHandler.wrapAsync(throwingFn, { showMessage: false, log: false });
      const result = await wrapped();

      assert.strictEqual(result, undefined);
    });

    test('wrapAsync should return value on success', async () => {
      const successFn = async () => 'success';

      const wrapped = errorHandler.wrapAsync(successFn, { showMessage: false, log: false });
      const result = await wrapped();

      assert.strictEqual(result, 'success');
    });

    test('wrap should pass arguments through', () => {
      const addFn = (a: number, b: number) => a + b;

      const wrapped = errorHandler.wrap(addFn, { showMessage: false, log: false });
      const result = wrapped(2, 3);

      assert.strictEqual(result, 5);
    });

    test('wrapAsync should pass arguments through', async () => {
      const asyncAddFn = async (a: number, b: number) => a + b;

      const wrapped = errorHandler.wrapAsync(asyncAddFn, { showMessage: false, log: false });
      const result = await wrapped(2, 3);

      assert.strictEqual(result, 5);
    });
  });

  suite('ErrorCode', () => {
    test('should have all expected error codes', () => {
      assert.strictEqual(ErrorCode.Unknown, 'UNKNOWN');
      assert.strictEqual(ErrorCode.FileNotFound, 'FILE_NOT_FOUND');
      assert.strictEqual(ErrorCode.PermissionDenied, 'PERMISSION_DENIED');
      assert.strictEqual(ErrorCode.JsonParse, 'JSON_PARSE');
      assert.strictEqual(ErrorCode.CorruptedData, 'CORRUPTED_DATA');
      assert.strictEqual(ErrorCode.NoWorkspace, 'NO_WORKSPACE');
      assert.strictEqual(ErrorCode.NoActiveEditor, 'NO_ACTIVE_EDITOR');
      assert.strictEqual(ErrorCode.BookmarkNotFound, 'BOOKMARK_NOT_FOUND');
      assert.strictEqual(ErrorCode.StorageRead, 'STORAGE_READ');
      assert.strictEqual(ErrorCode.StorageWrite, 'STORAGE_WRITE');
      assert.strictEqual(ErrorCode.Navigation, 'NAVIGATION');
    });
  });

  suite('ErrorSeverity', () => {
    test('should have all expected severity levels', () => {
      assert.strictEqual(ErrorSeverity.Info, 'info');
      assert.strictEqual(ErrorSeverity.Warning, 'warning');
      assert.strictEqual(ErrorSeverity.Error, 'error');
      assert.strictEqual(ErrorSeverity.Critical, 'critical');
    });
  });
});
