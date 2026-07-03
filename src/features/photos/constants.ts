// Upload limits shared by the client component, the route handler, and the image
// processor. Kept in its OWN module (no sharp import) so it is safe to import from
// client code — image.ts pulls in sharp, a Node-native module that must never enter
// the client bundle.

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5 MB
export const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp"] as const;
