import { createAuth } from "@elevator-app/auth";

import { db } from "./db";
import { ENV } from "./env.server";

export { db };
export const auth = createAuth(ENV, db);
