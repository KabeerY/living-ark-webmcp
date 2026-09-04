export type ToolResult = {
  content: Array<{ type: "text"; text: string }>;
  structuredContent?: Record<string, unknown>;
};

export type SiteTool = Omit<WebMCP.ModelContextTool, "execute"> & {
  execute: (
    args: Record<string, unknown>,
    options?: WebMCP.ToolExecuteCallbackOptions,
  ) => ToolResult | Promise<ToolResult>;
};
export type RegisterToolOptions = WebMCP.ModelContextRegisterToolOptions;

export type ModelContext = {
  registerTool(tool: SiteTool, options?: RegisterToolOptions): Promise<void>;
};
