import contrastMore from "../../../../tokens/contrast-more.json";
import light from "../../../../tokens/light.json";
import base from "../../../../tokens/tokens.json";
import resolver from "../../../../tokens/typeshi.resolver.json";

// The design tokens, public, exactly as committed (DTCG 2025.10). Start at /tokens/typeshi.resolver.json.
const FILES: Record<string, unknown> = {
  "typeshi.resolver.json": resolver,
  "tokens.json": base,
  "light.json": light,
  "contrast-more.json": contrastMore,
};

export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
  return Object.keys(FILES).map((file) => ({ file }));
}

export async function GET(_: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  return new Response(`${JSON.stringify(FILES[file], null, 2)}\n`, {
    headers: { "Content-Type": "application/json; charset=utf-8", "Access-Control-Allow-Origin": "*" },
  });
}
