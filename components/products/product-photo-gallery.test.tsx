import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeAll, describe, expect, it } from "vitest";

import { ProductPhotoGallery } from "@/components/products/product-photo-gallery";
import type { ProductImage } from "@/components/products/types";

const image = (id: string, sortOrder: number): ProductImage => ({
  id,
  originalName: `${id}.jpg`,
  contentType: "image/jpeg",
  sizeBytes: 1000,
  sortOrder,
  createdAt: "2026-11-01T00:00:00Z",
});

const images = [image("a", 0), image("b", 1), image("c", 2)];

// The viewer is code-split. Its first import here pays a cold transform that can outlast
// findByRole's 1s default, so it is warmed once up front, as hovering the photo does in
// the browser.
beforeAll(async () => {
  await import("@/components/products/product-image-lightbox");
});

describe("ProductPhotoGallery full-screen viewer", () => {
  it("opens on the photo that was clicked", async () => {
    render(<ProductPhotoGallery images={images} productName="დივანი" />);
    fireEvent.click(screen.getByRole("button", { name: "ფოტო 3-ის გადიდება" }));

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText(/^3\s*\/\s*3$/)).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "გადიდება" })).toBeInTheDocument();
  });

  it("reopens on the clicked photo, not the one it was last closed on", async () => {
    render(<ProductPhotoGallery images={images} productName="დივანი" />);
    fireEvent.click(screen.getByRole("button", { name: "ფოტო 1-ის გადიდება" }));

    let dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "შემდეგი ფოტო" }));
    await waitFor(() => expect(within(dialog).getByText(/^2\s*\/\s*3$/)).toBeInTheDocument());
    fireEvent.click(within(dialog).getByRole("button", { name: "დახურვა" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: "ფოტო 1-ის გადიდება" }));
    dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText(/^1\s*\/\s*3$/)).toBeInTheDocument();
  });

  it("shows no navigation for a single photo", async () => {
    render(<ProductPhotoGallery images={[image("a", 0)]} productName="დივანი" />);
    fireEvent.click(screen.getByRole("button", { name: "ფოტო 1-ის გადიდება" }));

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).queryByRole("button", { name: "შემდეგი ფოტო" })).not.toBeInTheDocument();
  });
});
