import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

// Adds `.openapi()` to Zod schemas so one schema can drive both validation and Swagger docs.
// Every module imports `z` from here instead of from 'zod' directly.
extendZodWithOpenApi(z);

export { z };
