/**
 * ScreenHeader — the component 70 screens are about to depend on.
 *
 * Worth testing properly precisely because it is shared: a defect here is a
 * defect on every screen at once, and the thing it replaces failed silently.
 * Sixty screens hand-rolled this block and left the back control out, and
 * nothing caught it until someone photographed a screen they were stuck on.
 */

import React from "react";
import { Text, StyleSheet } from "react-native";
import type { StyleProp, ViewStyle } from "react-native";
import { render, screen, fireEvent } from "@testing-library/react-native";
import { ScreenHeader } from "../../components/ScreenHeader";

const mockBack = jest.fn();
jest.mock("expo-router", () => ({
  router: {
    back: (...a: unknown[]) => mockBack(...a),
  },
}));

beforeEach(() => jest.clearAllMocks());

describe("ScreenHeader", () => {
  it("renders a back control by default", () => {
    // The default matters more than the option: a screen author who thinks
    // about nothing must still get a way back.
    render(<ScreenHeader title="Marketplace" />);
    expect(screen.getByTestId("screen-header-back")).toBeTruthy();
  });

  it("pops the navigator when the back control is pressed", () => {
    render(<ScreenHeader title="Marketplace" />);
    fireEvent.press(screen.getByTestId("screen-header-back"));
    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  it("calls a supplied onBack instead of popping", () => {
    // Used by screens that must confirm before leaving, e.g. an unsaved form.
    const onBack = jest.fn();
    render(<ScreenHeader title="Edit" onBack={onBack} />);
    fireEvent.press(screen.getByTestId("screen-header-back"));
    expect(onBack).toHaveBeenCalledTimes(1);
    expect(mockBack).not.toHaveBeenCalled();
  });

  it("omits the back control only when hideBack is set", () => {
    render(<ScreenHeader title="Home" hideBack />);
    expect(screen.queryByTestId("screen-header-back")).toBeNull();
  });

  it("labels the control for a screen reader", () => {
    // An icon-only button is unlabelled to VoiceOver without this.
    render(<ScreenHeader title="Marketplace" />);
    expect(screen.getByLabelText("Go back")).toBeTruthy();
  });

  it("renders the title, and the subtitle only when given one", () => {
    const { rerender } = render(<ScreenHeader title="Marketplace" />);
    expect(screen.getByText("Marketplace")).toBeTruthy();
    expect(screen.queryByText("Browse offers")).toBeNull();

    rerender(<ScreenHeader title="Marketplace" subtitle="Browse offers" />);
    expect(screen.getByText("Browse offers")).toBeTruthy();
  });

  it("renders a trailing control when given one", () => {
    render(<ScreenHeader title="Bills" right={<Text>Add</Text>} />);
    expect(screen.getByText("Add")).toBeTruthy();
  });

  describe("layout", () => {
    it("reserves the same width whether or not there is a back control", () => {
      // Without a placeholder on the hideBack path the title slides left and
      // the same screen looks like two different ones. Measure it rather than
      // asserting something vague about the tree.
      const widthOfHeaderChildren = () => {
        const header = screen.getByTestId("h");
        return (header.props.children as React.ReactElement[])
          .filter(Boolean)
          .map(
            (child) =>
              StyleSheet.flatten(
                child.props?.style as StyleProp<ViewStyle>,
              )?.width,
          );
      };

      const view = render(<ScreenHeader title="A" testID="h" />);
      const [leadingWithBack, , trailingWithBack] = widthOfHeaderChildren();
      expect(leadingWithBack).toBe(trailingWithBack);

      view.rerender(<ScreenHeader title="A" hideBack testID="h" />);
      const [leadingNoBack, , trailingNoBack] = widthOfHeaderChildren();
      expect(leadingNoBack).toBe(trailingNoBack);
      // ...and the same as when the control was there, so the title does not
      // move between the two states.
      expect(leadingNoBack).toBe(leadingWithBack);
    });

    it("truncates rather than wrapping a long title", () => {
      // A two-line header shifts everything below it on that screen only.
      render(<ScreenHeader title={"A very long screen title ".repeat(5)} />);
      const title = screen.getByText(/A very long screen title/);
      expect(title.props.numberOfLines).toBe(1);
    });
  });
});
