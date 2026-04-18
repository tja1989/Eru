import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { LeaderboardScopeTabs } from '@/components/LeaderboardScopeTabs';

describe('<LeaderboardScopeTabs />', () => {
  it('renders all 4 tab labels', () => {
    const { getByText } = render(
      <LeaderboardScopeTabs scope="pincode" onChange={() => {}} />,
    );
    expect(getByText('My Pincode')).toBeTruthy();
    expect(getByText('Kerala State')).toBeTruthy();
    expect(getByText('All India')).toBeTruthy();
    expect(getByText('Friends')).toBeTruthy();
  });

  it('calls onChange with the right scope when tapping a tab', () => {
    const onChange = jest.fn();
    const { getByText } = render(
      <LeaderboardScopeTabs scope="pincode" onChange={onChange} />,
    );
    fireEvent.press(getByText('Friends'));
    expect(onChange).toHaveBeenCalledWith('friends');

    fireEvent.press(getByText('All India'));
    expect(onChange).toHaveBeenCalledWith('national');

    fireEvent.press(getByText('Kerala State'));
    expect(onChange).toHaveBeenCalledWith('state');

    fireEvent.press(getByText('My Pincode'));
    expect(onChange).toHaveBeenCalledWith('pincode');
  });

  it('active tab text color differs from inactive tab text color', () => {
    const { getByText } = render(
      <LeaderboardScopeTabs scope="friends" onChange={() => {}} />,
    );

    const flatten = (s: any): any[] => (Array.isArray(s) ? s.flatMap(flatten) : [s]);
    const styleFor = (label: string) => {
      const node = getByText(label);
      const styles = flatten(node.props.style).filter(Boolean);
      // Merge to a single color value; later entries win.
      let color: string | undefined;
      for (const st of styles) {
        if (st && typeof st === 'object' && typeof st.color === 'string') color = st.color;
      }
      return color;
    };

    const activeColor = styleFor('Friends');
    const inactiveColor = styleFor('My Pincode');
    expect(activeColor).toBeDefined();
    expect(inactiveColor).toBeDefined();
    expect(activeColor).not.toEqual(inactiveColor);
  });
});
