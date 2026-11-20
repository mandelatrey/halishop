// The style editor's file access (devtools/style-editor). The `.dev.ts` name means this route only
// exists under `next dev` (see pageExtensions in next.config.ts); the handler also refuses to run
// outside development.
import { handleStyleEditor } from "@/devtools/style-editor/server";

export const dynamic = "force-dynamic";

export const GET = (req: Request) => handleStyleEditor(req);
export const POST = (req: Request) => handleStyleEditor(req);
