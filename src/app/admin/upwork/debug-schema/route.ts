import { NextResponse } from "next/server";
import { writeFile } from "node:fs/promises";
import { getValidUpworkAccessToken, UPWORK_GRAPHQL_URL } from "@/lib/upwork-auth";

// Temporary, dev-only: dumps the parts of Upwork's GraphQL schema relevant
// to job search so lib/upwork.ts can be built against a verified schema
// instead of a guess. Deleted once that's done.
const OUTPUT_PATH =
  "/private/tmp/claude-501/-Users-olgagoryszewska-endore/80973b6c-4c4e-45d0-8d85-f4e3f493e837/scratchpad/upwork-schema.json";

type IntrospectionType = {
  kind: string;
  name: string | null;
  ofType: IntrospectionType | null;
};

type IntrospectionField = {
  name: string;
  description: string | null;
  args: { name: string; description: string | null; type: IntrospectionType }[];
  type: IntrospectionType;
};

async function graphql(token: string, query: string) {
  const res = await fetch(UPWORK_GRAPHQL_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ query }),
  });
  const text = await res.text();
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    json = { rawText: text };
  }
  return { status: res.status, json };
}

const QUERY_TYPE_INTROSPECTION = `
  query {
    __type(name: "Query") {
      fields {
        name
        description
        args {
          name
          description
          type { kind name ofType { kind name ofType { kind name } } }
        }
        type { kind name ofType { kind name ofType { kind name } } }
      }
    }
  }
`;

function typeName(t: IntrospectionType | null): string {
  if (!t) return "";
  return t.name ?? typeName(t.ofType);
}

export async function GET() {
  const token = await getValidUpworkAccessToken();
  if (!token) {
    return NextResponse.json({ error: "Not connected to Upwork yet." }, { status: 400 });
  }

  const queryFieldsResult = await graphql(token, QUERY_TYPE_INTROSPECTION);
  const data = queryFieldsResult.json as {
    data?: { __type?: { fields?: IntrospectionField[] } };
    errors?: unknown;
  };
  const allFields = data.data?.__type?.fields ?? [];
  const jobFields = allFields.filter((field) => /job/i.test(field.name));

  const returnTypeDetails: Record<string, unknown> = {};
  for (const field of jobFields.slice(0, 8)) {
    const returnTypeName = typeName(field.type);
    if (!returnTypeName || returnTypeDetails[returnTypeName]) continue;
    const detail = await graphql(
      token,
      `query { __type(name: "${returnTypeName}") { name kind fields { name type { kind name ofType { kind name ofType { kind name } } } } } }`
    );
    returnTypeDetails[returnTypeName] = detail.json;
  }

  const output = {
    generatedAt: new Date().toISOString(),
    errors: data.errors ?? null,
    allQueryFieldCount: allFields.length,
    jobRelatedQueryFields: jobFields,
    returnTypeDetails,
  };

  await writeFile(OUTPUT_PATH, JSON.stringify(output, null, 2), "utf-8");

  return NextResponse.json({
    ok: true,
    message: `Schema dumped to ${OUTPUT_PATH}`,
    jobFieldNames: jobFields.map((f) => f.name),
  });
}
