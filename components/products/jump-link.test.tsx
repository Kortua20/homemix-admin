import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useFocusHashTarget } from "@/components/products/jump-link";

function Form() {
  useFocusHashTarget();
  return (
    <form>
      <input id="product-name" aria-label="დასახელება" />
      <input id="product-purchase-price" aria-label="შესყიდვის ფასი" />
    </form>
  );
}

beforeEach(() => {
  // jsdom does not implement layout, so scrollIntoView is absent; record the call instead.
  Element.prototype.scrollIntoView = vi.fn();
});

afterEach(() => {
  window.history.replaceState(null, "", "/");
});

describe("useFocusHashTarget", () => {
  it("centres and focuses the field named in the URL hash", async () => {
    window.history.replaceState(null, "", "/product/chair/edit#product-purchase-price");
    render(<Form />);

    const field = screen.getByLabelText("შესყიდვის ფასი");
    await waitFor(() => expect(field).toHaveFocus());
    expect(field.scrollIntoView).toHaveBeenCalledWith({ block: "center" });
  });

  it("does nothing without a hash", async () => {
    render(<Form />);
    await new Promise((resolve) => requestAnimationFrame(resolve));
    expect(document.body).toHaveFocus();
    expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled();
  });

  it("ignores a hash that names no element", async () => {
    window.history.replaceState(null, "", "/product/chair/edit#nothing-here");
    render(<Form />);
    await new Promise((resolve) => requestAnimationFrame(resolve));
    expect(document.body).toHaveFocus();
  });
});
