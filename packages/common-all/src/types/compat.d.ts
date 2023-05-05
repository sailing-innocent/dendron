/** Mimicks VSCode's disposable for cross-compatibility. */
export type Disposable = {
    dispose: () => any;
};
export declare const isDisposable: (cmd: any) => cmd is Disposable;
/** Simplified version of VSCode's `Point` class. */
export type VSPosition = {
    line: number;
    character: number;
};
/** Simplified version of VSCode's `Range` class. */
export type VSRange = {
    start: VSPosition;
    end: VSPosition;
};
/** Mirrors VSCode's `DiagnosticSeverity` */
export declare enum DiagnosticSeverity {
    Error = 0,
    Warning = 1,
    Information = 2,
    Hint = 3
}
/** Simplified version of VSCode's `Diagnostic` class. */
export type Diagnostic = {
    range: VSRange;
    message: string;
    severity: DiagnosticSeverity;
    code?: string;
};
