import type * as React from 'react';
import { ERRORS, PluginError } from '../../../contracts/index.js';
import { PREPARE_DESKTOP_RESTART, type PrepareDesktopRestart } from '../../../contracts/desktopUpdates';
import {
  installCanvasAutoSave,
  type AutoSaveReason,
  type CanvasAutoSaveController,
} from './canvasAutoSave';

type ReactHooks = Pick<typeof React, 'useRef' | 'useEffect'>;
export interface CanvasAutoSaveProps {
  isDirty: boolean;
  nodes: readonly unknown[];
  groups?: readonly unknown[];
  title?: string;
  onSave: () => Promise<unknown>;
  interval?: number;
  documentId?: string | null;
  enabled: boolean;
  hasActiveOperations?: boolean;
}

interface SaveSession {
  controller: CanvasAutoSaveController;
  closed: boolean;
  props: CanvasAutoSaveProps;
}

function signature(props: CanvasAutoSaveProps): string | undefined {
  try {
    return JSON.stringify([props.nodes, props.groups, props.title]);
  } catch {
    // An unserializable document must not be mistaken for an unchanged node count.
    return undefined;
  }
}

function documentState(session: SaveSession) {
  return {
    isDirty: session.props.isDirty,
    nodeCount: session.props.nodes.length,
    signature: session.props.isDirty ? signature(session.props) : undefined,
  };
}

/**
 * One controller and listener set for one enabled canvas/project lifetime.
 * ADR-0035: the canvas lives in one window, so the open document owns its saves without
 * focus tracking; a stale writer is still stopped by the workflow revision conflict.
 */
export function useCanvasAutoSave(hooks: ReactHooks, props: CanvasAutoSaveProps) {
  const sessionRef = hooks.useRef<SaveSession | null>(null);
  const lastSaveTime = hooks.useRef(Date.now());

  // Runs before setup/scheduling effects, so no timer captures an obsolete render.
  hooks.useEffect(() => {
    if (sessionRef.current) sessionRef.current.props = props;
  });

  hooks.useEffect(() => {
    if (!props.enabled) return;
    const session: SaveSession = {
      controller: installCanvasAutoSave().createController(),
      closed: false,
      props,
    };
    sessionRef.current = session;
    const save = () => session.props.onSave();
    const attempt = (reason: AutoSaveReason, force = false) => {
      if (session.closed) return;
      void session.controller
        .attempt(reason, documentState(session), save, force)
        .then((result) => {
          if (result === 'saved' && !session.closed && sessionRef.current === session)
            lastSaveTime.current = session.controller.getLastSaveTime();
        });
    };
    // Leaving the window writes the latest edit now instead of waiting for the next timer.
    const flush = () => {
      session.controller.cancelScheduled();
      attempt('hidden', true);
    };
    const hidden = () => {
      if (document.visibilityState === 'hidden') flush();
    };
    const beforeUnload = () => {
      // beforeunload can be cancelled. Only pagehide terminates the lifecycle.
      session.controller.cancelScheduled();
      attempt('pagehide', true);
    };
    const pageHide = () => {
      attempt('pagehide', true);
      session.closed = true;
      session.controller.dispose();
    };
    const pageShow = () => {
      if (!session.closed) return;
      session.controller = installCanvasAutoSave().createController();
      session.closed = false;
    };
    const prepareRestart = (event: Event) => {
      const detail = (event as CustomEvent<PrepareDesktopRestart>).detail;
      const saveBeforeRestart = async () => {
        const receipt = await save() as { id?: string; unchanged?: boolean } | null | undefined;
        if (!receipt?.id || receipt.unchanged === false)
          throw new PluginError(ERRORS.projectTransfer, '当前画布尚未全部保存');
      };
      detail.waitUntil(session.controller.attempt('hidden', documentState(session), saveBeforeRestart, true)
        .then(result => !session.closed && (result === 'saved' || result === 'clean')));
    };
    window.addEventListener(PREPARE_DESKTOP_RESTART, prepareRestart);
    window.addEventListener('blur', flush);
    window.addEventListener('beforeunload', beforeUnload);
    window.addEventListener('pagehide', pageHide);
    window.addEventListener('pageshow', pageShow);
    document.addEventListener('visibilitychange', hidden);
    const timer = window.setInterval(() => attempt('interval'), props.interval ?? 60_000);
    return () => {
      session.closed = true;
      session.controller.dispose();
      if (sessionRef.current === session) sessionRef.current = null;
      window.clearInterval(timer);
      window.removeEventListener('blur', flush);
      window.removeEventListener('beforeunload', beforeUnload);
      window.removeEventListener('pagehide', pageHide);
      window.removeEventListener('pageshow', pageShow);
      window.removeEventListener(PREPARE_DESKTOP_RESTART, prepareRestart);
      document.removeEventListener('visibilitychange', hidden);
    };
  }, [props.enabled, props.documentId, props.interval]);

  hooks.useEffect(() => {
    const session = sessionRef.current;
    if (!session || session.closed) return;
    session.controller.schedule(
      () => documentState(session),
      () => session.props.onSave(),
    );
  }, [props.isDirty, props.nodes, props.groups, props.title, props.enabled, props.documentId]);
  return { lastSaveTime: lastSaveTime.current };
}
