import { z } from "zod";

const capabilityParameterSchema = z
  .object({
    name: z.enum(["targetTemperature", "materialBudget", "sourceReserve"]),
    description: z.string().min(8).max(180),
    type: z.literal("number"),
    minimum: z.number().finite(),
    maximum: z.number().finite(),
    default: z.number().finite(),
  })
  .strict()
  .superRefine((parameter, context) => {
    if (parameter.minimum >= parameter.maximum) {
      context.addIssue({ code: "custom", message: "minimum must be less than maximum" });
    }
    if (parameter.default < parameter.minimum || parameter.default > parameter.maximum) {
      context.addIssue({ code: "custom", message: "default must be within minimum and maximum" });
    }
  });

const targetOrderClauseSchema = z
  .object({
    field: z.enum(["criticality", "temperature", "coolant", "id"]),
    direction: z.enum(["asc", "desc"]),
  })
  .strict();

const targetOrderSchema = z
  .array(targetOrderClauseSchema)
  .min(1)
  .max(3)
  .superRefine((clauses, context) => {
    const fields = clauses.map((clause) => clause.field);
    if (new Set(fields).size !== fields.length) {
      context.addIssue({ code: "custom", message: "targetOrder fields must be unique" });
    }
  });

export const thermalCapabilitySchema = z
  .object({
    name: z.string().regex(/^[a-z][a-z0-9_]{2,47}$/),
    description: z.string().min(18).max(320),
    parameters: z.array(capabilityParameterSchema).min(1).max(3),
    program: z
      .object({
        targetSelector: z.enum(["critical_hotspots", "all_hotspots"]),
        targetOrder: targetOrderSchema,
        sourceSelector: z.enum(["nearest_reservoir", "highest_coolant_reservoir"]),
        sourceScope: z.enum(["active_thermal_component", "physical_component"]),
        pathMode: z.enum(["active_only", "wake_dormant", "regrow_fractures"]),
        maxPathLength: z.number().int().min(1).max(96),
        maxTargets: z.number().int().min(1).max(64),
      })
      .strict(),
  })
  .strict()
  .superRefine((definition, context) => {
    const names = definition.parameters.map((parameter) => parameter.name);
    if (new Set(names).size !== names.length) {
      context.addIssue({ code: "custom", message: "parameter names must be unique", path: ["parameters"] });
    }
    if (!names.includes("targetTemperature")) {
      context.addIssue({ code: "custom", message: "targetTemperature parameter is required", path: ["parameters"] });
    }
    if (definition.program.pathMode === "regrow_fractures" && !names.includes("materialBudget")) {
      context.addIssue({
        code: "custom",
        message: "regrow_fractures requires a bounded materialBudget parameter",
        path: ["parameters"],
      });
    }
  });

export type ThermalCapabilityDefinition = z.infer<typeof thermalCapabilitySchema>;

export type CompiledThermalCapability = {
  definition: ThermalCapabilityDefinition;
  hash: string;
  compileReport: {
    safe: true;
    serializedBytes: number;
    parameterCount: number;
    staticBudget: {
      maxPathLength: number;
      maxTargets: number;
      maxGraphVisits: number;
    };
  };
};
