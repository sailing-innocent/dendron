import { URI } from "vscode-uri";
import { DVault } from "../types/DVault";
/** Returns the path to where the notes are stored inside the vault.
 *
 * For self contained vaults, this is the `notes` folder inside of the vault.
 * For other vault types, this is the root of the vault itself.
 *
 * If you always need the root of the vault, use {@link pathForVaultRoot} instead.
 */
export declare function vault2Path({ vault, wsRoot }: {
    vault: DVault;
    wsRoot: URI;
}): URI;
