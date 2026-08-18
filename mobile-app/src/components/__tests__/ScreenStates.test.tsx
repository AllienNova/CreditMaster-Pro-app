/**
 * ScreenLoading and ScreenError — the two states a screen shows when it has no
 * data to render.
 *
 * WHY THEY ARE TESTED TOGETHER. They exist for the same reason and fail the
 * same way. Both branches were originally written per screen as a bare
 * SafeAreaView around an icon or spinner and a line of text — three
 * accessibility nodes, no header. That leaves the user on a screen with no
 * title (which screen is this?) and no back control (how do I leave?), and it
 * leaves the device sweep with nothing to assert against, because the sweep
 * confirms a route by finding the screen's own title.
 *
 * The device sweep found 13 routes sitting in a titleless LOADING state 20
 * seconds after launch, and an earlier pass found 17 in a titleless ERROR
 * state. The contract both components exist to enforce is the one these tests
 * check: a title, and a way back.
 */

import React from "react";
import { render, fireEvent } from "@testing-library/react-native";

import { ScreenLoading } from "../ScreenLoading";
import { ScreenError } from "../ScreenError";

describe("ScreenLoading", () => {
  it("renders the screen's own title, so the user knows where they are", () => {
    const { getByText } = render(
      <ScreenLoading title="Audit Trail" message="Loading audit trail..." />,
    );
    expect(getByText("Audit Trail")).toBeTruthy();
    expect(getByText("Loading audit trail...")).toBeTruthy();
  });

  it("offers a way back, so a hung request is not a trap", () => {
    const { getByTestId } = render(<ScreenLoading title="Audit Trail" />);
    expect(getByTestId("screen-header-back")).toBeTruthy();
  });

  it("omits the back control for a screen that is its own stack root", () => {
    const { queryByTestId } = render(
      <ScreenLoading title="Tax Optimization" hideBack />,
    );
    expect(queryByTestId("screen-header-back")).toBeNull();
  });

  it("renders without a message", () => {
    const { getByText } = render(<ScreenLoading title="System Logs" />);
    expect(getByText("System Logs")).toBeTruthy();
  });

  it("exposes the testID its screen passes", () => {
    const { getByTestId } = render(
      <ScreenLoading title="System Health" testID="admin-health-loading" />,
    );
    expect(getByTestId("admin-health-loading")).toBeTruthy();
  });
});

describe("ScreenError", () => {
  it("renders the screen's own title alongside the failure", () => {
    const { getByText } = render(
      <ScreenError title="Credit Age" message="We could not load your accounts." />,
    );
    expect(getByText("Credit Age")).toBeTruthy();
    expect(getByText("We could not load your accounts.")).toBeTruthy();
  });

  it("offers a way back", () => {
    const { getByTestId } = render(
      <ScreenError title="Credit Age" message="Something went wrong." />,
    );
    expect(getByTestId("screen-header-back")).toBeTruthy();
  });

  it("calls onRetry when Try Again is pressed", () => {
    const onRetry = jest.fn();
    const { getByTestId } = render(
      <ScreenError title="Credit Age" message="Nope." onRetry={onRetry} />,
    );
    fireEvent.press(getByTestId("screen-error-retry"));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("shows no retry control when there is nothing useful to retry", () => {
    const { queryByTestId } = render(
      <ScreenError title="Credit Age" message="Nope." />,
    );
    expect(queryByTestId("screen-error-retry")).toBeNull();
  });

  it("uses the established copy, 'Try Again'", () => {
    // Not "Try again". Changing the case in a batch transform broke 18 suites
    // that already asserted this string; the tests were right.
    const { getByText } = render(
      <ScreenError title="Credit Age" message="Nope." onRetry={jest.fn()} />,
    );
    expect(getByText("Try Again")).toBeTruthy();
  });
});
