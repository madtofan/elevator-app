import type { Session } from "@elevator-app/auth";
import type { Database } from "@elevator-app/db";

export type Context = {
	session: Session | null;
	db: Database;
};
