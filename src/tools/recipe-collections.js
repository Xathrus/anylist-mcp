import { z } from "zod";
import { textResponse, errorResponse } from "./helpers.js";
import { createElicitationHelpers } from "./elicitation.js";

export function register(server, getClient) {
  const { elicitRequiredField } = createElicitationHelpers(server);

  server.registerTool("recipe_collections", {
    title: "Recipe Collections",
    description: `Manage AnyList recipe collections. Actions:
- list: Show all collections with recipe counts and names
- create: Create a new collection, optionally with recipes
- add_recipes: Add existing recipes to an existing collection
- remove_recipes: Remove recipes from a collection (the recipes themselves are not deleted)
- delete: Delete a collection (its recipes are not deleted)`,
    inputSchema: {
      action: z.enum(["list", "create", "add_recipes", "remove_recipes", "delete"]).describe("The collection action to perform"),
      name: z.string().optional().describe("Collection name (required for create, add_recipes, remove_recipes, delete)"),
      recipe_names: z.array(z.string()).optional().describe("Exact recipe names (create, add_recipes, remove_recipes)"),
    }
  }, async (params) => {
    const { action, name, recipe_names } = params;
    try {
      const client = await getClient();
      await client.connect(null);
      switch (action) {
        case "list": {
          const collections = await client.getRecipeCollections();
          if (collections.length === 0) return textResponse("No recipe collections found.");
          const list = collections.map(c => `- **${c.name}** (${c.recipeCount} recipes)${c.recipeCount > 0 ? ': ' + c.recipeNames.join(', ') : ''}`).join('\n');
          return textResponse(`Recipe Collections (${collections.length}):\n${list}`);
        }
        case "create": {
          let collectionName = name;
          if (!collectionName) collectionName = await elicitRequiredField("name", "What should the collection be called?");
          const result = await client.createRecipeCollection(collectionName, recipe_names || []);
          return textResponse(`Created recipe collection "${result.name}"`);
        }
        case "add_recipes":
        case "remove_recipes": {
          let collectionName = name;
          if (!collectionName) collectionName = await elicitRequiredField("name", "Which collection?");
          if (!recipe_names || recipe_names.length === 0) {
            return errorResponse(`Action "${action}" requires "recipe_names" (one or more exact recipe names).`);
          }
          const adding = action === "add_recipes";
          const result = adding
            ? await client.addRecipesToCollection(collectionName, recipe_names)
            : await client.removeRecipesFromCollection(collectionName, recipe_names);
          const changed = adding ? result.added : result.removed;
          const lines = [changed.length > 0
            ? `${adding ? "Added to" : "Removed from"} "${result.name}": ${changed.join(", ")}`
            : `No changes to "${result.name}".`];
          if (adding && result.alreadyPresent.length) lines.push(`Already in collection: ${result.alreadyPresent.join(", ")}`);
          if (!adding && result.notInCollection.length) lines.push(`Not in collection: ${result.notInCollection.join(", ")}`);
          if (result.notFound.length) lines.push(`No recipe found with these names: ${result.notFound.join(", ")}`);
          return textResponse(lines.join("\n"));
        }
        case "delete": {
          let deleteCollectionName = name;
          if (!deleteCollectionName) deleteCollectionName = await elicitRequiredField("name", "Which collection would you like to delete?");
          await client.deleteRecipeCollection(deleteCollectionName);
          return textResponse(`Deleted recipe collection "${deleteCollectionName}"`);
        }
      }
    } catch (error) {
      return errorResponse(`Recipe collections ${action} failed: ${error.message}`);
    }
  });
}
