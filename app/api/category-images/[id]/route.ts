import { getR2Object } from "@/lib/r2";
import { createClient } from "@/lib/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type CategoryImageRouteProps = {
  params: Promise<{ id: string }>;
};

export async function GET(
  _request: Request,
  { params }: CategoryImageRouteProps,
) {
  const { id } = await params;

  if (!uuidPattern.test(id)) {
    return new Response(null, { status: 404 });
  }

  const supabase = await createClient();
  const { data: authData, error: authError } =
    await supabase.auth.getClaims();
  const isAnonymous = authData?.claims?.is_anonymous === true;

  if (authError || !authData?.claims?.sub || isAnonymous) {
    return new Response(null, { status: 401 });
  }

  const { data: image, error } = await supabase
    .from("category_images")
    .select("object_key, original_name, content_type")
    .eq("id", id)
    .maybeSingle();

  if (error || !image) {
    return new Response(null, { status: 404 });
  }

  try {
    const object = await getR2Object(image.object_key);

    if (!object.Body) {
      return new Response(null, { status: 404 });
    }

    const bytes = await object.Body.transformToByteArray();
    const responseBytes = Uint8Array.from(bytes);
    const safeName = encodeURIComponent(image.original_name);

    return new Response(responseBytes.buffer, {
      headers: {
        "Cache-Control": "private, max-age=3600",
        "Content-Disposition": `inline; filename*=UTF-8''${safeName}`,
        "Content-Length": String(bytes.byteLength),
        "Content-Type": image.content_type,
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response(null, { status: 404 });
  }
}
