import { appRouter } from "@elevator-app/api/routers/index";
import { SmartCoercionPlugin } from "@orpc/json-schema";
import { OpenAPIHandler } from "@orpc/openapi/fetch";
import { OpenAPIReferencePlugin } from "@orpc/openapi/plugins";
import { onError } from "@orpc/server";
import { RPCHandler } from "@orpc/server/fetch";
import { ZodToJsonSchemaConverter } from "@orpc/zod/zod4";

/**
 * The OpenAPI handler powers `/api-reference`. `SmartCoercionPlugin` converts
 * query-string values (always strings over HTTP) to the types declared by the
 * Zod schemas, so GET endpoints with numeric input also work outside the RPC
 * client.
 */
export function createApiHandler() {
	return new OpenAPIHandler(appRouter, {
		plugins: [
			new SmartCoercionPlugin({
				schemaConverters: [new ZodToJsonSchemaConverter()],
			}),
			new OpenAPIReferencePlugin({
				schemaConverters: [new ZodToJsonSchemaConverter()],
			}),
		],
		interceptors: [
			onError((error) => {
				console.error(error);
			}),
		],
	});
}

export function createRpcHandler() {
	return new RPCHandler(appRouter, {
		interceptors: [
			onError((error) => {
				console.error(error);
			}),
		],
	});
}
