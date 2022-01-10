export async function preloadTemplates(): Promise<Handlebars.TemplateDelegate[]> {
  const templatePaths: string[] = [
    // Add paths to "systems/legacy-fvtt-system/templates"
  ];

  return loadTemplates(templatePaths);
}
