import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ReadMore } from "@/components/ReadMore";

// jsdom doesn't perform real layout, so scrollHeight/clientHeight are always 0 unless
// stubbed - this simulates "content overflows the collapsed height" the same way a
// long description would in a real browser. Targets the measured wrapper div (the
// only element ReadMore gives an `id` to, via useId()), not the caller's own markup.
function stubScrollHeight(container: HTMLElement, height: number) {
  const el = container.querySelector("div[id]") as HTMLElement;
  Object.defineProperty(el, "scrollHeight", { configurable: true, value: height });
}

describe("ReadMore", () => {
  it("does not render a toggle when the content fits within the collapsed height", () => {
    render(
      <ReadMore collapsedHeight={96}>
        <p>Short text.</p>
      </ReadMore>
    );

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("renders a Read more toggle when content overflows, and expands/collapses on click", () => {
    const { container } = render(
      <ReadMore collapsedHeight={96}>
        <p>Long text that overflows.</p>
      </ReadMore>
    );
    stubScrollHeight(container, 400);
    // Re-render to re-run the measuring effect with the stubbed height.
    fireEvent(window, new Event("resize"));

    const button = screen.getByRole("button", { name: /read more/i });
    expect(button).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(button);
    expect(screen.getByRole("button", { name: /show less/i })).toHaveAttribute("aria-expanded", "true");

    fireEvent.click(screen.getByRole("button", { name: /show less/i }));
    expect(screen.getByRole("button", { name: /read more/i })).toHaveAttribute("aria-expanded", "false");
  });

  it("links the toggle button to the content region for assistive technology", () => {
    const { container } = render(
      <ReadMore collapsedHeight={96}>
        <p>Long text that overflows.</p>
      </ReadMore>
    );
    stubScrollHeight(container, 400);
    fireEvent(window, new Event("resize"));

    const button = screen.getByRole("button", { name: /read more/i });
    const controlledId = button.getAttribute("aria-controls");
    expect(controlledId).toBeTruthy();
    // `useId()` ids (e.g. ":r2:") aren't valid CSS selector text without escaping -
    // look it up by id directly instead of via querySelector.
    expect(document.getElementById(controlledId as string)).not.toBeNull();
  });
});
