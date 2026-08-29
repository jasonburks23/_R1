import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * #88 audit, item B: demonstrates that a JSON request carrying no session
 * material at all reaches this handler's real business logic. This route
 * has no auth check of its own and is not in proxy.ts's
 * unauthenticatedPaths, so it relies entirely on authkit middleware — the
 * same middleware #52 found lets JSON requests through and only redirects
 * on Accept: text/html.
 *
 * This test does not exercise the middleware (that only runs in the real
 * Next.js request pipeline, not under a direct handler import). What it
 * proves is narrower and sufficient: the handler itself performs no
 * authentication or workspace-ownership check before loading workspace
 * context for an attacker-supplied workspaceId. If middleware ever lets
 * this request through — which #52 showed it does for JSON — nothing in
 * this file stops it.
 */
const { mockLoadWorkspaceContext, mockCreateChatResponse } = vi.hoisted(() => ({
  mockLoadWorkspaceContext: vi.fn().mockResolvedValue({
    soul: null,
    brand: null,
    memories: [],
  }),
  mockCreateChatResponse: vi.fn().mockResolvedValue(new Response("ok")),
}));

vi.mock("@/lib/brand-utils", () => ({
  loadWorkspaceContext: mockLoadWorkspaceContext,
}));

vi.mock("@/lib/chat", () => ({
  createChatResponse: mockCreateChatResponse,
  createChatTools: vi.fn().mockReturnValue({}),
  createMemoryTools: vi.fn().mockReturnValue({}),
  loadSkillsForPurpose: vi.fn().mockResolvedValue([]),
  loadSkillsForWorkspace: vi.fn().mockResolvedValue([]),
  buildContextualSystemPrompt: vi.fn().mockReturnValue("prompt"),
  SUBTASK_INDEPENDENCE_GUIDELINES: "",
}));

vi.mock("@/lib/chat/tools/skill-creator-tool", () => ({
  createSkillTools: vi.fn().mockReturnValue({}),
}));

vi.mock("@/lib/memory-utils", () => ({
  getLastUserMessageText: vi.fn().mockReturnValue(""),
}));

function makeRequest(workspaceId: string): Request {
  // No Authorization header, no session cookie, no x-* auth header of any
  // kind — this is the exact request shape #52 showed authkit lets through
  // for a JSON Accept header.
  return new Request("http://localhost/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages: [],
      workspacePurpose: "software",
      workspaceId,
    }),
  });
}

describe("POST /api/chat auth (#88 audit, item B)", () => {
  beforeEach(() => {
    mockLoadWorkspaceContext.mockClear();
    mockCreateChatResponse.mockClear();
  });

  it("loads workspace context for an attacker-supplied workspaceId with zero session material on the request", async () => {
    const { POST } = await import("./route");
    const res = await POST(makeRequest("someone-elses-workspace-id") as never);

    // The handler ran to completion and produced a normal 200-shaped
    // response, not a 401 — because there is no code path in this file
    // that could return one.
    expect(res).toBeInstanceOf(Response);
    // Business logic executed with the caller-supplied workspaceId,
    // unchecked against any session or membership.
    expect(mockLoadWorkspaceContext).toHaveBeenCalledWith(
      "someone-elses-workspace-id",
      expect.anything(),
    );
    expect(mockCreateChatResponse).toHaveBeenCalled();
  });
});
