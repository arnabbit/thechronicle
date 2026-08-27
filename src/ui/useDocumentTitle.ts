import { useEffect } from 'react';

// The title is declared on the stack screen, which is where the spec puts it —
// but expo-router's root container hard-disables React Navigation's
// document-title updater (`documentTitle: { enabled: false }` in ExpoRoot), so
// on the web build a screen's `title` never reaches the browser tab on its own.
// This carries it there.
//
// Not a platform branch: it asks whether there is a document, which on native
// there is not, and does nothing when there isn't.
export function useDocumentTitle(title: string) {
  useEffect(() => {
    if (typeof document !== 'undefined') document.title = title;
  }, [title]);
}
