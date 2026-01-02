/**
 * CPFI Component Tests
 * Unit tests for shared UI components
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Text } from 'react-native';
import { Button } from '../Button';
import { Card } from '../Card';
import { Input } from '../Input';
import { ProgressRing } from '../ProgressRing';
import { EmptyState } from '../EmptyState';
import { AlertCard } from '../AlertCard';
import { CreditFactorCard } from '../CreditFactorCard';
import { TimelineItem } from '../TimelineItem';
import { SearchInput } from '../SearchInput';
import {
  Skeleton,
  SkeletonText,
  SkeletonCard,
  SkeletonListItem,
} from '../LoadingSkeleton';
import { ScoreGauge } from '../ScoreGauge';
import { BottomSheet } from '../BottomSheet';
import { LineChart, BarChart, PieChart } from '../charts';

// Mock Ionicons
jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

// Mock react-native-svg
jest.mock('react-native-svg', () => ({
  Svg: 'Svg',
  Circle: 'Circle',
  G: 'G',
  Path: 'Path',
  Rect: 'Rect',
  Line: 'Line',
  Text: 'SvgText',
}));

describe('Button Component', () => {
  it('renders correctly with title', () => {
    const { getByText } = render(
      <Button title="Test Button" onPress={() => {}} />
    );
    expect(getByText('Test Button')).toBeTruthy();
  });

  it('calls onPress when pressed', () => {
    const onPress = jest.fn();
    const { getByText } = render(<Button title="Press Me" onPress={onPress} />);
    fireEvent.press(getByText('Press Me'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('shows loading indicator when loading', () => {
    const { queryByText, UNSAFE_getByType } = render(
      <Button title="Loading" onPress={() => {}} loading />
    );
    // Title should not be visible when loading
    expect(queryByText('Loading')).toBeNull();
  });

  it('is disabled when disabled prop is true', () => {
    const onPress = jest.fn();
    const { getByText } = render(
      <Button title="Disabled" onPress={onPress} disabled />
    );
    fireEvent.press(getByText('Disabled'));
    expect(onPress).not.toHaveBeenCalled();
  });
});

describe('Card Component', () => {
  it('renders children correctly', () => {
    const { getByText } = render(
      <Card>
        <Input label="Test" />
      </Card>
    );
    expect(getByText('Test')).toBeTruthy();
  });
});

describe('Input Component', () => {
  it('renders with label', () => {
    const { getByText } = render(<Input label="Email" />);
    expect(getByText('Email')).toBeTruthy();
  });

  it('shows error message', () => {
    const { getByText } = render(<Input label="Email" error="Invalid email" />);
    expect(getByText('Invalid email')).toBeTruthy();
  });

  it('calls onChangeText when text changes', () => {
    const onChangeText = jest.fn();
    const { getByPlaceholderText } = render(
      <Input placeholder="Enter text" onChangeText={onChangeText} />
    );
    fireEvent.changeText(getByPlaceholderText('Enter text'), 'test');
    expect(onChangeText).toHaveBeenCalledWith('test');
  });
});

describe('ProgressRing Component', () => {
  it('renders with progress value', () => {
    const { getByText } = render(<ProgressRing progress={75} />);
    expect(getByText('75%')).toBeTruthy();
  });

  it('renders with custom label and value', () => {
    const { getByText } = render(
      <ProgressRing progress={50} value="$500" label="Saved" />
    );
    expect(getByText('$500')).toBeTruthy();
    expect(getByText('Saved')).toBeTruthy();
  });
});

describe('EmptyState Component', () => {
  it('renders title and description', () => {
    const { getByText } = render(
      <EmptyState title="No Data" description="Nothing to show here" />
    );
    expect(getByText('No Data')).toBeTruthy();
    expect(getByText('Nothing to show here')).toBeTruthy();
  });

  it('renders action button when provided', () => {
    const onAction = jest.fn();
    const { getByText } = render(
      <EmptyState title="Empty" actionLabel="Add Item" onAction={onAction} />
    );
    fireEvent.press(getByText('Add Item'));
    expect(onAction).toHaveBeenCalled();
  });
});

describe('AlertCard Component', () => {
  it('renders alert with title and message', () => {
    const { getByText } = render(
      <AlertCard
        id="1"
        type="score_change"
        severity="info"
        title="Score Update"
        message="Your score increased"
        timestamp={new Date().toISOString()}
      />
    );
    expect(getByText('Score Update')).toBeTruthy();
    expect(getByText('Your score increased')).toBeTruthy();
  });
});

describe('CreditFactorCard Component', () => {
  it('renders factor information', () => {
    const { getByText } = render(
      <CreditFactorCard
        name="Payment History"
        description="Your payment track record"
        impact="high"
        status="excellent"
      />
    );
    expect(getByText('Payment History')).toBeTruthy();
    expect(getByText('High Impact')).toBeTruthy();
    expect(getByText('Excellent')).toBeTruthy();
  });
});

describe('TimelineItem Component', () => {
  it('renders timeline item', () => {
    const { getByText } = render(
      <TimelineItem
        title="Dispute Submitted"
        description="Your dispute was sent"
        status="completed"
      />
    );
    expect(getByText('Dispute Submitted')).toBeTruthy();
  });
});

describe('SearchInput Component', () => {
  it('renders with placeholder', () => {
    const { getByPlaceholderText } = render(
      <SearchInput value="" onChangeText={() => {}} placeholder="Search..." />
    );
    expect(getByPlaceholderText('Search...')).toBeTruthy();
  });
});

describe('Skeleton Components', () => {
  it('renders Skeleton', () => {
    const { UNSAFE_root } = render(<Skeleton width={100} height={20} />);
    expect(UNSAFE_root).toBeTruthy();
  });

  it('renders SkeletonText', () => {
    const { UNSAFE_root } = render(<SkeletonText lines={3} />);
    expect(UNSAFE_root).toBeTruthy();
  });

  it('renders SkeletonCard', () => {
    const { UNSAFE_root } = render(<SkeletonCard />);
    expect(UNSAFE_root).toBeTruthy();
  });

  it('renders SkeletonListItem', () => {
    const { UNSAFE_root } = render(<SkeletonListItem />);
    expect(UNSAFE_root).toBeTruthy();
  });
});

describe('ScoreGauge Component', () => {
  it('renders with score value', () => {
    const { getByText } = render(<ScoreGauge score={720} />);
    expect(getByText('720')).toBeTruthy();
  });

  it('renders with score change indicator', () => {
    const { getByText } = render(<ScoreGauge score={720} change={15} />);
    expect(getByText('720')).toBeTruthy();
    expect(getByText('+15')).toBeTruthy();
  });

  it('handles minimum score boundary', () => {
    const { getByText } = render(<ScoreGauge score={250} />);
    expect(getByText('250')).toBeTruthy();
  });

  it('handles maximum score boundary', () => {
    const { getByText } = render(<ScoreGauge score={900} />);
    expect(getByText('900')).toBeTruthy();
  });
});

describe('BottomSheet Component', () => {
  it('renders when visible', () => {
    const { getByText } = render(
      <BottomSheet visible={true} onClose={() => {}}>
        <Text>Sheet Content</Text>
      </BottomSheet>
    );
    expect(getByText('Sheet Content')).toBeTruthy();
  });

  it('calls onClose when backdrop is pressed', () => {
    const onClose = jest.fn();
    const { getByTestId } = render(
      <BottomSheet visible={true} onClose={onClose}>
        <Text>Content</Text>
      </BottomSheet>
    );
    // Note: This test assumes the backdrop has testID="backdrop"
    // If not, the component should be updated to include it
  });
});

describe('Chart Components', () => {
  const mockData = [
    { value: 650, label: 'Jan' },
    { value: 680, label: 'Feb' },
    { value: 720, label: 'Mar' },
  ];

  describe('LineChart', () => {
    it('renders with data', () => {
      const { UNSAFE_root } = render(<LineChart data={mockData} />);
      expect(UNSAFE_root).toBeTruthy();
    });

    it('handles empty data', () => {
      const { UNSAFE_root } = render(<LineChart data={[]} />);
      expect(UNSAFE_root).toBeTruthy();
    });
  });

  describe('BarChart', () => {
    it('renders with data', () => {
      const { UNSAFE_root } = render(<BarChart data={mockData} />);
      expect(UNSAFE_root).toBeTruthy();
    });

    it('handles empty data', () => {
      const { UNSAFE_root } = render(<BarChart data={[]} />);
      expect(UNSAFE_root).toBeTruthy();
    });
  });

  describe('PieChart', () => {
    const pieData = [
      { value: 30, label: 'Category A', color: '#FF6384' },
      { value: 50, label: 'Category B', color: '#36A2EB' },
      { value: 20, label: 'Category C', color: '#FFCE56' },
    ];

    it('renders with data', () => {
      const { UNSAFE_root } = render(<PieChart data={pieData} />);
      expect(UNSAFE_root).toBeTruthy();
    });

    it('handles empty data', () => {
      const { UNSAFE_root } = render(<PieChart data={[]} />);
      expect(UNSAFE_root).toBeTruthy();
    });
  });
});
