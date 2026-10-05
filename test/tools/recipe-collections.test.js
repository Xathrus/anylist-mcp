import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { register } from '../../src/tools/recipe-collections.js';
import { MockAnyListClient, createMockServer } from './helpers.js';

describe('recipe_collections tool', () => {
  let client;
  let handlers;

  beforeEach(() => {
    client = new MockAnyListClient();
    const { server, handlers: h } = createMockServer();
    register(server, () => Promise.resolve(client));
    handlers = h;
  });

  describe('list', () => {
    it('returns empty message when no collections', async () => {
      const result = await handlers.recipe_collections({ action: 'list' });
      assert.ok(result.content[0].text.includes('No recipe collections'));
    });

    it('lists collections with recipe names', async () => {
      client._collections.push({ name: 'Weeknight', recipeCount: 2, recipeNames: ['Pasta', 'Salad'] });
      const result = await handlers.recipe_collections({ action: 'list' });
      assert.ok(result.content[0].text.includes('Weeknight'));
      assert.ok(result.content[0].text.includes('Pasta'));
    });
  });

  describe('create', () => {
    it('creates a collection', async () => {
      const result = await handlers.recipe_collections({ action: 'create', name: 'Quick Meals' });
      assert.ok(result.content[0].text.includes('Created recipe collection "Quick Meals"'));
    });

    it('creates collection with recipes', async () => {
      await handlers.recipe_collections({ action: 'create', name: 'Favs', recipe_names: ['Pasta'] });
      assert.equal(client._collections[client._collections.length - 1].recipeNames[0], 'Pasta');
    });
  });

  describe('add_recipes / remove_recipes', () => {
    beforeEach(() => {
      client._recipes.push({ identifier: 'r-1', name: 'Pasta' }, { identifier: 'r-2', name: 'Salad' });
      client._collections.push({ identifier: 'c-1', name: 'Weeknight', recipeCount: 1, recipeNames: ['Pasta'] });
    });

    it('adds recipes to an existing collection', async () => {
      const result = await handlers.recipe_collections({ action: 'add_recipes', name: 'weeknight', recipe_names: ['Salad'] });
      assert.ok(result.content[0].text.includes('Added to "Weeknight": Salad'));
      assert.deepEqual(client._collections[0].recipeNames, ['Pasta', 'Salad']);
    });

    it('reports recipes already present and names not found', async () => {
      const text = (await handlers.recipe_collections({ action: 'add_recipes', name: 'Weeknight', recipe_names: ['Pasta', 'Tacos'] })).content[0].text;
      assert.ok(text.includes('Already in collection: Pasta'), text);
      assert.ok(text.includes('No recipe found with these names: Tacos'), text);
    });

    it('removes recipes and leaves the rest', async () => {
      client._collections[0].recipeNames.push('Salad');
      const result = await handlers.recipe_collections({ action: 'remove_recipes', name: 'Weeknight', recipe_names: ['Pasta'] });
      assert.ok(result.content[0].text.includes('Removed from "Weeknight": Pasta'));
      assert.deepEqual(client._collections[0].recipeNames, ['Salad']);
      assert.equal(client._recipes.length, 2, 'recipes themselves are not deleted');
    });

    it('reports recipes that are not in the collection', async () => {
      const text = (await handlers.recipe_collections({ action: 'remove_recipes', name: 'Weeknight', recipe_names: ['Salad'] })).content[0].text;
      assert.ok(text.includes('Not in collection: Salad'), text);
    });

    it('requires recipe_names', async () => {
      const result = await handlers.recipe_collections({ action: 'add_recipes', name: 'Weeknight' });
      assert.equal(result.isError, true);
    });

    it('errors for an unknown collection', async () => {
      const result = await handlers.recipe_collections({ action: 'add_recipes', name: 'Nope', recipe_names: ['Pasta'] });
      assert.equal(result.isError, true);
      assert.ok(result.content[0].text.includes('not found'));
    });
  });

  describe('delete', () => {
    it('deletes an existing collection', async () => {
      client._collections.push({ name: 'Old Collection', recipeCount: 0, recipeNames: [] });
      const result = await handlers.recipe_collections({ action: 'delete', name: 'Old Collection' });
      assert.ok(result.content[0].text.includes('Deleted recipe collection'));
      assert.equal(client._collections.length, 0);
    });

    it('returns error for non-existent collection', async () => {
      const result = await handlers.recipe_collections({ action: 'delete', name: 'Nope' });
      assert.equal(result.isError, true);
      assert.ok(result.content[0].text.includes('not found'));
    });
  });
});
