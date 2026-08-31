import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/api-guard";
import {
  DISPUTE_TEMPLATES as templates,
  findDisputeTemplate,
} from "@/lib/disputes/letter-templates";


export const GET = withAuth(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category");

  let filteredTemplates = templates;

  if (category) {
    filteredTemplates = templates.filter((t) => t.category === category);
  }

  // Get unique categories
  const categorySet = new Set(templates.map((t) => t.category));
  const categories = Array.from(categorySet);

  return NextResponse.json({
    templates: filteredTemplates,
    categories,
    total: filteredTemplates.length,
  });
});

export const POST = withAuth(async (request: NextRequest) => {
  try {
    const body = await request.json();
    const { templateId, variables } = body;

    const template = findDisputeTemplate(templateId);
    if (!template) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 },
      );
    }

    // Replace variables in template
    let generatedLetter = template.template;
    for (const [key, value] of Object.entries(variables || {})) {
      generatedLetter = generatedLetter.replace(
        new RegExp(`{{${key}}}`, "g"),
        String(value),
      );
    }

    return NextResponse.json({
      success: true,
      letter: generatedLetter,
      template: template.name,
      missingVariables: template.variables.filter((v) => !variables?.[v]),
    });
  } catch (error) {
    console.error("Template generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate letter" },
      { status: 500 },
    );
  }
});
