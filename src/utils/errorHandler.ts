import * as vscode from 'vscode';

/**
 * Error severity levels for consistent handling
 */
export enum ErrorSeverity {
  /** Informational - logged but not shown to user */
  Info = 'info',
  /** Warning - shown as warning message */
  Warning = 'warning',
  /** Error - shown as error message */
  Error = 'error',
  /** Critical - shown as error with recovery options */
  Critical = 'critical',
}

/**
 * Error codes for categorizing errors
 */
export enum ErrorCode {
  /** Unknown error */
  Unknown = 'UNKNOWN',
  /** File not found */
  FileNotFound = 'FILE_NOT_FOUND',
  /** File system permission error */
  PermissionDenied = 'PERMISSION_DENIED',
  /** JSON parsing error */
  JsonParse = 'JSON_PARSE',
  /** Invalid state or corrupted data */
  CorruptedData = 'CORRUPTED_DATA',
  /** Workspace not available */
  NoWorkspace = 'NO_WORKSPACE',
  /** No active editor */
  NoActiveEditor = 'NO_ACTIVE_EDITOR',
  /** Bookmark not found */
  BookmarkNotFound = 'BOOKMARK_NOT_FOUND',
  /** Storage read error */
  StorageRead = 'STORAGE_READ',
  /** Storage write error */
  StorageWrite = 'STORAGE_WRITE',
  /** Navigation error */
  Navigation = 'NAVIGATION',
}

/**
 * Options for error handling
 */
export interface ErrorHandlerOptions {
  /** Whether to show message to user (default: true for Warning and above) */
  showMessage?: boolean;
  /** Whether to log to output channel (default: true) */
  log?: boolean;
  /** Additional context information */
  context?: Record<string, unknown>;
  /** Recovery action to offer */
  recovery?: ErrorRecoveryAction;
}

/**
 * Error recovery action
 */
export interface ErrorRecoveryAction {
  /** Label for the action button */
  label: string;
  /** Action to execute */
  action: () => void | Promise<void>;
}

/**
 * Structured error for Filemarks extension
 */
export class FilemarkError extends Error {
  readonly code: ErrorCode;
  readonly severity: ErrorSeverity;
  readonly context?: Record<string, unknown>;
  readonly timestamp: string;

  constructor(
    message: string,
    code: ErrorCode = ErrorCode.Unknown,
    severity: ErrorSeverity = ErrorSeverity.Error,
    context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'FilemarkError';
    this.code = code;
    this.severity = severity;
    this.context = context;
    this.timestamp = new Date().toISOString();

    // Ensure instanceof works correctly
    Object.setPrototypeOf(this, FilemarkError.prototype);
  }

  /**
   * Creates a FilemarkError from a standard Error
   */
  static fromError(
    error: unknown,
    code: ErrorCode = ErrorCode.Unknown,
    severity: ErrorSeverity = ErrorSeverity.Error,
    context?: Record<string, unknown>
  ): FilemarkError {
    if (error instanceof FilemarkError) {
      return error;
    }

    const message = error instanceof Error ? error.message : String(error);
    return new FilemarkError(message, code, severity, context);
  }

  /**
   * Creates a file not found error
   */
  static fileNotFound(filePath: string): FilemarkError {
    return new FilemarkError(
      `File not found: ${filePath}`,
      ErrorCode.FileNotFound,
      ErrorSeverity.Warning,
      { filePath }
    );
  }

  /**
   * Creates a JSON parse error
   */
  static jsonParse(error: unknown, filePath?: string): FilemarkError {
    const message = error instanceof Error ? error.message : 'Invalid JSON';
    return new FilemarkError(message, ErrorCode.JsonParse, ErrorSeverity.Error, { filePath });
  }

  /**
   * Creates a no workspace error
   */
  static noWorkspace(): FilemarkError {
    return new FilemarkError(
      'No workspace folder found',
      ErrorCode.NoWorkspace,
      ErrorSeverity.Warning
    );
  }

  /**
   * Creates a no active editor error
   */
  static noActiveEditor(): FilemarkError {
    return new FilemarkError('No active editor', ErrorCode.NoActiveEditor, ErrorSeverity.Warning);
  }

  /**
   * Creates a storage read error
   */
  static storageRead(error: unknown, filePath?: string): FilemarkError {
    const message = error instanceof Error ? error.message : 'Failed to read storage';
    return new FilemarkError(message, ErrorCode.StorageRead, ErrorSeverity.Error, { filePath });
  }

  /**
   * Creates a storage write error
   */
  static storageWrite(error: unknown, filePath?: string): FilemarkError {
    const message = error instanceof Error ? error.message : 'Failed to write storage';
    return new FilemarkError(message, ErrorCode.StorageWrite, ErrorSeverity.Error, { filePath });
  }

  /**
   * Creates a corrupted data error
   */
  static corruptedData(filePath?: string): FilemarkError {
    return new FilemarkError(
      'Corrupted data detected',
      ErrorCode.CorruptedData,
      ErrorSeverity.Error,
      { filePath }
    );
  }
}

/**
 * Central error handler for the Filemarks extension.
 * Provides consistent logging, user messaging, and recovery mechanisms.
 *
 * @example
 * ```typescript
 * const errorHandler = ErrorHandler.getInstance();
 * errorHandler.initialize(context);
 *
 * try {
 *   // risky operation
 * } catch (error) {
 *   errorHandler.handle(FilemarkError.fromError(error, ErrorCode.StorageRead));
 * }
 * ```
 */
export class ErrorHandler {
  private static instance: ErrorHandler;
  private outputChannel: vscode.OutputChannel | undefined;
  private isInitialized = false;

  private constructor() {}

  /**
   * Gets the singleton instance of ErrorHandler
   */
  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  /**
   * Initializes the error handler with extension context.
   * Must be called during extension activation.
   */
  initialize(context: vscode.ExtensionContext): void {
    if (this.isInitialized) return;

    this.outputChannel = vscode.window.createOutputChannel('Filemarks Errors');
    context.subscriptions.push(this.outputChannel);
    this.isInitialized = true;
  }

  /**
   * Handles an error with consistent logging and user messaging.
   *
   * @param error - The error to handle (FilemarkError or standard Error)
   * @param options - Handling options
   * @returns The FilemarkError for chaining or rethrowing
   */
  handle(error: unknown, options: ErrorHandlerOptions = {}): FilemarkError {
    const filemarkError =
      error instanceof FilemarkError
        ? error
        : FilemarkError.fromError(error, ErrorCode.Unknown, ErrorSeverity.Error, options.context);

    const { showMessage = true, log = true, recovery } = options;

    // Log to output channel
    if (log) {
      this.log(filemarkError);
    }

    // Show user message based on severity
    if (showMessage && filemarkError.severity !== ErrorSeverity.Info) {
      this.showUserMessage(filemarkError, recovery);
    }

    return filemarkError;
  }

  /**
   * Handles an error silently (logs only, no user message)
   */
  handleSilent(error: unknown, context?: Record<string, unknown>): FilemarkError {
    return this.handle(error, { showMessage: false, context });
  }

  /**
   * Logs an error to the output channel with structured format
   */
  private log(error: FilemarkError): void {
    if (!this.outputChannel) return;

    const lines: string[] = [
      `[${error.timestamp}] [${error.severity.toUpperCase()}] [${error.code}]`,
      `  Message: ${error.message}`,
    ];

    if (error.context) {
      lines.push(`  Context: ${JSON.stringify(error.context)}`);
    }

    if (error.stack) {
      lines.push(`  Stack: ${error.stack.split('\n').slice(1, 4).join('\n    ')}`);
    }

    this.outputChannel.appendLine(lines.join('\n'));
  }

  /**
   * Shows appropriate message to user based on error severity
   */
  private showUserMessage(error: FilemarkError, recovery?: ErrorRecoveryAction): void {
    const message = this.getUserFriendlyMessage(error);

    switch (error.severity) {
      case ErrorSeverity.Warning:
        if (recovery) {
          vscode.window.showWarningMessage(message, recovery.label).then(selection => {
            if (selection === recovery.label) {
              recovery.action();
            }
          });
        } else {
          vscode.window.showWarningMessage(message);
        }
        break;

      case ErrorSeverity.Error:
      case ErrorSeverity.Critical:
        if (recovery) {
          vscode.window.showErrorMessage(message, recovery.label).then(selection => {
            if (selection === recovery.label) {
              recovery.action();
            }
          });
        } else {
          vscode.window.showErrorMessage(message);
        }
        break;
    }
  }

  /**
   * Converts error code to user-friendly localized message
   */
  private getUserFriendlyMessage(error: FilemarkError): string {
    switch (error.code) {
      case ErrorCode.FileNotFound:
        return vscode.l10n.t('error.fileNotFound', String(error.context?.filePath ?? 'file'));

      case ErrorCode.JsonParse:
        return vscode.l10n.t('error.corruptedJson');

      case ErrorCode.CorruptedData:
        return vscode.l10n.t('error.corruptedFile');

      case ErrorCode.NoWorkspace:
        return vscode.l10n.t('Filemarks requires an open workspace');

      case ErrorCode.NoActiveEditor:
        return vscode.l10n.t('No active editor');

      case ErrorCode.StorageRead:
        return vscode.l10n.t('error.failedToLoad', error.message);

      case ErrorCode.StorageWrite:
        return vscode.l10n.t('error.failedToSave', error.message);

      case ErrorCode.BookmarkNotFound:
        return vscode.l10n.t(
          'Bookmark {0} is not defined',
          String(error.context?.bookmarkNum ?? '')
        );

      case ErrorCode.Navigation:
        return vscode.l10n.t('Failed to go to bookmark: {0}', error.message);

      default:
        return error.message;
    }
  }

  /**
   * Clears the error log output channel
   */
  clearLog(): void {
    this.outputChannel?.clear();
  }

  /**
   * Shows the error log output channel
   */
  showLog(): void {
    this.outputChannel?.show();
  }

  /**
   * Creates a wrapper function that catches and handles errors
   */
  wrapAsync<TArgs extends unknown[], TReturn>(
    fn: (...args: TArgs) => Promise<TReturn>,
    options?: ErrorHandlerOptions
  ): (...args: TArgs) => Promise<TReturn | undefined> {
    return async (...args: TArgs): Promise<TReturn | undefined> => {
      try {
        return await fn(...args);
      } catch (error) {
        this.handle(error, options);
        return undefined;
      }
    };
  }

  /**
   * Creates a wrapper function that catches and handles errors (sync version)
   */
  wrap<TArgs extends unknown[], TReturn>(
    fn: (...args: TArgs) => TReturn,
    options?: ErrorHandlerOptions
  ): (...args: TArgs) => TReturn | undefined {
    return (...args: TArgs): TReturn | undefined => {
      try {
        return fn(...args);
      } catch (error) {
        this.handle(error, options);
        return undefined;
      }
    };
  }
}

// Export singleton instance for convenient access
export const errorHandler = ErrorHandler.getInstance();
