import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchWithoutStore } from "@/lib/supabase/server";

describe("Supabase server fetch", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("disables caching for authenticated reads after same-render writes", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response());
    vi.stubGlobal("fetch", fetchMock);

    await fetchWithoutStore("https://example.supabase.co/rest/v1/weeks", {
      headers: { authorization: "Bearer token" },
      cache: "force-cache",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://example.supabase.co/rest/v1/weeks",
      expect.objectContaining({
        headers: { authorization: "Bearer token" },
        cache: "no-store",
      }),
    );
  });
});
