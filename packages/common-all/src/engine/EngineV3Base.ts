/* eslint-disable no-useless-constructor */
/* eslint-disable no-empty-function */
import _ from "lodash";
import { ERROR_SEVERITY, ERROR_STATUS } from "../constants";
import { DLogger } from "../DLogger";
import { DNodeUtils, NoteUtils } from "../dnode";
import { DendronCompositeError, DendronError } from "../error";
import { FuseEngine } from "../fuse";
import { INoteStore } from "../store";
import {
  BulkResp,
  BulkWriteNotesOpts,
  EngineDeleteNoteResp,
  EngineDeleteOpts,
  EngineWriteOptsV2,
  FindNoteOpts,
  NoteChangeEntry,
  NoteProps,
  NotePropsMeta,
  QueryNotesOpts,
  ReducedDEngine,
  RenameNoteOpts,
  RenameNotePayload,
  RespV2,
  RespV3,
  WriteNoteResp,
} from "../types";
import { isNotNull, isNotUndefined } from "../utils";
import { VaultUtils } from "../vault";

/**
 * Abstract base class that contains common logic between DendronEngineV3 and
 * DendronEngineV3Web
 */
export abstract class EngineV3Base implements ReducedDEngine {
  protected abstract fuseEngine: FuseEngine;

  constructor(
    protected noteStore: INoteStore<string>,
    protected logger: DLogger
  ) {}

  /**
   * See {@link DEngine.getNote}
   */
  async getNote(id: string): Promise<RespV3<NoteProps>> {
    return this.noteStore.get(id);
  }

  /**
   * See {@link DEngine.findNotes}
   */
  async findNotes(opts: FindNoteOpts): Promise<NoteProps[]> {
    const resp = await this.noteStore.find(opts);
    return resp.data ? resp.data : [];
  }

  /**
   * See {@link DEngine.findNotesMeta}
   */
  async findNotesMeta(opts: FindNoteOpts): Promise<NotePropsMeta[]> {
    const resp = await this.noteStore.findMetaData(opts);
    return resp.data ? resp.data : [];
  }

  /**
   * See {@link DEngine.bulkWriteNotes}
   */
  async bulkWriteNotes(
    opts: BulkWriteNotesOpts
  ): Promise<Required<BulkResp<NoteChangeEntry[]>>> {
    const writeResponses = await Promise.all(
      opts.notes.map((note) => this.writeNote(note, opts.opts))
    );
    const errors = writeResponses
      .flatMap((response) => response.error)
      .filter(isNotNull);

    return {
      error: errors.length > 0 ? new DendronCompositeError(errors) : null,
      data: writeResponses
        .flatMap((response) => response.data)
        .filter(isNotUndefined),
    };
  }

  /**
   * See {@link DEngine.deleteNote}
   */
  async deleteNote(
    id: string,
    opts?: EngineDeleteOpts
  ): Promise<EngineDeleteNoteResp> {
    const ctx = "DEngine:deleteNote";
    if (id === "root") {
      throw new DendronError({
        message: "",
        status: ERROR_STATUS.CANT_DELETE_ROOT,
      });
    }
    let changes: NoteChangeEntry[] = [];

    const resp = await this.noteStore.getMetadata(id);
    if (resp.error) {
      return {
        error: new DendronError({
          status: ERROR_STATUS.DOES_NOT_EXIST,
          message: `Unable to delete ${id}: Note does not exist`,
        }),
      };
    }
    // Temp solution to get around current restrictions where NoteChangeEntry needs a NoteProp
    const noteToDelete = _.merge(resp.data, {
      body: "",
    });
    this.logger.info({ ctx, noteToDelete, opts, id });
    const noteAsLog = NoteUtils.toLogObj(noteToDelete);

    if (!noteToDelete.parent) {
      return {
        error: new DendronError({
          status: ERROR_STATUS.NO_PARENT_FOR_NOTE,
          message: `No parent found for ${noteToDelete.fname}`,
        }),
      };
    }
    const parentResp = await this.noteStore.get(noteToDelete.parent);
    if (parentResp.error) {
      return {
        error: new DendronError({
          status: ERROR_STATUS.NO_PARENT_FOR_NOTE,
          message: `Unable to delete ${noteToDelete.fname}: Note's parent does not exist in engine: ${noteToDelete.parent}`,
          innerError: parentResp.error,
        }),
      };
    }

    let parentNote = parentResp.data;

    let prevNote = { ...noteToDelete };
    // If deleted note has children, create stub note with a new id in metadata store
    if (!_.isEmpty(noteToDelete.children)) {
      this.logger.info({ ctx, noteAsLog, msg: "keep as stub" });
      const replacingStub = NoteUtils.create({
        // the replacing stub should not keep the old note's body, id, and links.
        // otherwise, it will be captured while processing links and will
        // fail because this note is not actually in the file system.
        ..._.omit(noteToDelete, ["id", "links", "body"]),
        stub: true,
      });

      DNodeUtils.addChild(parentNote, replacingStub);

      // Move children to new note
      changes = changes.concat(
        await this.updateChildrenWithNewParent(noteToDelete, replacingStub)
      );

      changes.push({ note: replacingStub, status: "create" });
    } else {
      // If parent is a stub, go upwards up the tree and delete rest of stubs
      while (parentNote.stub) {
        changes.push({ note: parentNote, status: "delete" });
        if (!parentNote.parent) {
          return {
            error: new DendronError({
              status: ERROR_STATUS.NO_PARENT_FOR_NOTE,
              message: `No parent found for ${parentNote.fname}`,
            }),
          };
        }
        // eslint-disable-next-line no-await-in-loop
        const parentResp = await this.noteStore.get(parentNote.parent);
        if (parentResp.data) {
          prevNote = { ...parentNote };
          parentNote = parentResp.data;
        } else {
          return {
            error: new DendronError({
              status: ERROR_STATUS.NO_PARENT_FOR_NOTE,
              message: `Unable to delete ${noteToDelete.fname}: Note ${parentNote?.fname}'s parent does not exist in engine: ${parentNote.parent}`,
            }),
          };
        }
      }
    }

    // Delete note reference from parent's child
    const parentNotePrev = { ...parentNote };
    this.logger.info({ ctx, noteAsLog, msg: "delete from parent" });
    DNodeUtils.removeChild(parentNote, prevNote);

    // Add an entry for the updated parent
    changes.push({
      prevNote: parentNotePrev,
      note: parentNote,
      status: "update",
    });

    const deleteResp = opts?.metaOnly
      ? await this.noteStore.deleteMetadata(id)
      : await this.noteStore.delete(id);
    if (deleteResp.error) {
      return {
        error: new DendronError({
          message: `Unable to delete note ${id}`,
          severity: ERROR_SEVERITY.MINOR,
          payload: deleteResp.error,
        }),
      };
    }

    changes.push({ note: noteToDelete, status: "delete" });
    // Update metadata for all other changes
    await this.fuseEngine.updateNotesIndex(changes);
    await this.updateNoteMetadataStore(changes);

    this.logger.info({
      ctx,
      msg: "exit",
      changed: changes.map((n) => NoteUtils.toLogObj(n.note)),
    });
    return {
      error: null,
      data: changes,
    };
  }

  async queryNotes(opts: QueryNotesOpts): Promise<RespV2<NoteProps[]>> {
    // const ctx = "Engine:queryNotes";
    const { qs, vault, onlyDirectChildren, originalQS } = opts;

    // Need to ignore this because the engine stringifies this property, so the types are incorrect.
    // @ts-ignore
    if (vault?.selfContained === "true" || vault?.selfContained === "false")
      vault.selfContained = vault.selfContained === "true";

    const items = await this.fuseEngine.queryNote({
      qs,
      onlyDirectChildren,
      originalQS,
    });

    if (items.length === 0) {
      return { error: null, data: [] };
    }

    const notes = await Promise.all(
      items.map((ent) => this.noteStore.get(ent.id)) // TODO: Should be using metadata instead
    );

    let modifiedNotes;
    // let notes = items.map((ent) => this.notes[ent.id]);
    // if (!_.isUndefined(vault)) {
    modifiedNotes = notes
      .filter((ent) => _.isUndefined(ent.error))
      .map((resp) => resp.data!);

    if (!_.isUndefined(vault)) {
      modifiedNotes = modifiedNotes.filter((ent) =>
        VaultUtils.isEqualV2(vault, ent.data!.vault)
      );
    }

    return {
      error: null,
      // data: items,
      data: modifiedNotes,
    };
  }

  /**
   * See {@link DEngine.renameNote}
   */
  abstract renameNote(opts: RenameNoteOpts): Promise<RespV2<RenameNotePayload>>;

  /**
   * See {@link DEngine.writeNote}
   */
  abstract writeNote(
    note: NoteProps,
    opts?: EngineWriteOptsV2
  ): Promise<WriteNoteResp>;

  /**
   * Move children of old parent note to new parent
   * @return note change entries of modified children
   */
  protected async updateChildrenWithNewParent(
    oldParent: NotePropsMeta,
    newParent: NotePropsMeta
  ) {
    const changes: NoteChangeEntry[] = [];
    // Move existing note's children to new note
    const childrenResp = await this.noteStore.bulkGet(oldParent.children);
    childrenResp.forEach((child) => {
      if (child.data) {
        const childNote = child.data;
        const prevChildNoteState = { ...childNote };
        DNodeUtils.addChild(newParent, childNote);

        // Add one entry for each child updated
        changes.push({
          prevNote: prevChildNoteState,
          note: childNote,
          status: "update",
        });
      }
    });
    return changes;
  }

  /**
   * Update note metadata store based on note change entries
   * @param changes entries to update
   * @returns
   */
  protected async updateNoteMetadataStore(
    changes: NoteChangeEntry[]
  ): Promise<RespV3<string>[]> {
    return Promise.all(
      changes.map((change) => {
        switch (change.status) {
          case "delete": {
            return this.noteStore.deleteMetadata(change.note.id);
          }
          case "create":
          case "update": {
            return this.noteStore.writeMetadata({
              key: change.note.id,
              noteMeta: change.note,
            });
          }
          default:
            return { data: "" };
        }
      })
    );
  }
}
