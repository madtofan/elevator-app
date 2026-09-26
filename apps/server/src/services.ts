import { createAuth } from "@elevator-app/auth";
import { createDb } from "@elevator-app/db";

import { ENV } from "./env.server";

export const db = createDb(ENV);
export const auth = createAuth(ENV, db);
