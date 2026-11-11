import { BadRequestException } from "@nestjs/common";
import * as contracts from "@freshphones/contracts";
import { z } from "zod";

const definitions: Record<
  string,
  { read: string; schema: z.ZodTypeAny; record: boolean }
> = {
  "records.update_batch": {
    read: "records.batch",
    schema: contracts.batchSchema,
    record: true,
  },
  "records.update_client": {
    read: "records.client",
    schema: contracts.clientSchema,
    record: true,
  },
  "agents.update": {
    read: "agents.detail",
    schema: contracts.agentSchema,
    record: true,
  },
  "catalog.update": {
    read: "catalog.detail",
    schema: contracts.catalogItemSchema,
    record: true,
  },
  "jobs.update": {
    read: "jobs.detail",
    schema: contracts.jobOpeningSchema,
    record: true,
  },
  "support.update": {
    read: "support.detail",
    schema: contracts.supportUpdateSchema,
    record: false,
  },
};

export const partialEditSchema = z
  .object({
    id: z.string().uuid(),
    changes: z.record(z.unknown()).refine((value) => {
      return Object.keys(value).length > 0;
    }, "Provide at least one changed field."),
  })
  .strict();

export function editDefinition(operation: string) {
  const definition = Object.hasOwn(definitions, operation)
    ? definitions[operation]
    : undefined;

  if (!definition) {
    throw new BadRequestException(
      "This operation does not support partial edits.",
    );
  }

  let schema = definition.schema;

  while (schema instanceof z.ZodEffects) {
    schema = schema.innerType();
  }

  if (!(schema instanceof z.ZodObject)) {
    throw new BadRequestException("This operation has no editable fields.");
  }

  return {
    ...definition,
    fields: schema.shape as Record<string, z.ZodTypeAny>,
  };
}

export function validateEditFields(
  operation: string,
  changes: Record<string, unknown>,
) {
  const definition = editDefinition(operation);

  for (const field of Object.keys(changes)) {
    if (field === "version" || !Object.hasOwn(definition.fields, field)) {
      throw new BadRequestException(
        `Field ${field} is not editable for this operation.`,
      );
    }
  }

  return definition;
}

export function buildEditBody(
  operation: string,
  current: unknown,
  changes: Record<string, unknown>,
) {
  const definition = validateEditFields(operation, changes);

  const snapshot = z
    .object({ version: z.number().int().positive() })
    .passthrough()
    .parse(current);

  const previous: Record<string, unknown> = {};

  for (const [field, schema] of Object.entries(definition.fields)) {
    const value = snapshot[field];

    // Stored nullable optional dates/terms must retain the API's input shape.
    if (
      value === undefined ||
      (value === null && schema.isOptional() && !schema.isNullable())
    ) {
      continue;
    }

    previous[field] = value;
  }

  const original = definition.schema.parse(previous);

  const record = definition.schema.parse({ ...previous, ...changes });

  if (JSON.stringify(record) === JSON.stringify(original)) {
    throw new BadRequestException(
      "These fields already have the requested values. No change is needed.",
    );
  }

  return definition.record
    ? { version: snapshot.version, record }
    : { ...record, version: snapshot.version };
}
