/**
 * marketplace/index — the screen from the reported screenshot.
 *
 * It showed "Marketplace" twice and offered no way back. Two separate causes
 * met on one screen:
 *
 *   1. app/marketplace/_layout.tsx set `headerShown: true` on `index`. React
 *      Navigation draws NO back button on the root of a stack, because within
 *      that stack there is nowhere to go — but the user had arrived from a
 *      parent navigator that did have history. So the native bar rendered a
 *      title and nothing to press.
 *   2. The screen drew its own <Text style={styles.title}>Marketplace</Text>
 *      underneath it.
 *
 * The gate that now guards this is a text scan, which by its own documented
 * admission cannot tell a rendered control from a mention in a comment. This
 * test is the behavioural half: it renders the real screen and presses the
 * real control.
 */

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";

const mockBack = jest.fn();
const mockPush = jest.fn();
jest.mock("expo-router", () => ({
  router: {
    back: (...a: unknown[]) => mockBack(...a),
    push: (...a: unknown[]) => mockPush(...a),
  },
}));

const mockFetchCategories = jest.fn();
const mockStoreState = {
  categories: [] as Array<{ category: string; count: number }>,
  isLoading: false,
  error: null as string | null,
  fetchCategories: mockFetchCategories,
};
jest.mock("../../store/marketplaceStore", () => ({
  useMarketplaceStore: () => mockStoreState,
}));

import MarketplaceScreen from "../../../app/marketplace/index";

beforeEach(() => {
  jest.clearAllMocks();
  mockStoreState.categories = [];
  mockStoreState.isLoading = false;
  mockStoreState.error = null;
});

describe("marketplace/index", () => {
  it("offers a way back", () => {
    render(<MarketplaceScreen />);
    expect(screen.getByTestId("screen-header-back")).toBeTruthy();
  });

  it("pops the navigator when back is pressed", () => {
    // router.back() rather than a hardcoded destination: this screen is
    // reachable from more than one place, and back means "where I came from".
    render(<MarketplaceScreen />);
    fireEvent.press(screen.getByTestId("screen-header-back"));
    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  it("renders its own title exactly once", () => {
    // LIMIT, stated plainly: the screenshot showed the title twice, but only
    // one of those came from this file. The other came from the native header
    // that _layout.tsx switched on, and a unit render of the screen does not
    // mount the Stack, so this assertion cannot see it. Verified by mutation:
    // restoring `headerShown: true` in the layout leaves this test green.
    //
    // The layout half is held by the comment in _layout.tsx and by the
    // audit:back-nav self-test case that encodes the stack-root rule. Catching
    // it automatically needs a navigator-level render, which is not set up
    // here.
    render(<MarketplaceScreen />);
    expect(screen.getAllByText("Marketplace")).toHaveLength(1);
  });

  it("still routes into a category", () => {
    // Guards the edit itself: the header change sits directly above this list.
    render(<MarketplaceScreen />);
    fireEvent.press(screen.getByText("Secured Cards"));
    expect(mockPush).toHaveBeenCalledWith("/marketplace/secured-cards");
  });
});
