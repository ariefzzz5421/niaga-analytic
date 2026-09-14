import assert from "node:assert/strict";
import test from "node:test";
import { calculateProfit, findTargetPrice } from "../src/lib/profitability";

test("calculates percentage and fixed fees deterministically", () => {
  const result = calculateProfit({ hpp: 100000, sellingPrice: 150000, quantity: 1, packaging: 3000 }, [{ label: "Commission", rate: 0.1 }, { label: "Processing", fixed: 1250 }]);
  assert.equal(result.marketplaceFees, 16250);
  assert.equal(result.netSettlement, 133750);
  assert.equal(result.netProfit, 30750);
});

test("supports negative profit", () => {
  const result = calculateProfit({ hpp: 100000, sellingPrice: 90000, quantity: 1 }, []);
  assert.equal(result.netProfit, -10000);
});

test("target price reaches requested margin", () => {
  const fees = [{ label: "Commission", rate: 0.1 }];
  const price = findTargetPrice({ hpp: 100000, quantity: 1 }, fees, 0.2);
  const result = calculateProfit({ hpp: 100000, sellingPrice: price, quantity: 1 }, fees);
  assert.ok(result.netMargin >= 19.99);
});
