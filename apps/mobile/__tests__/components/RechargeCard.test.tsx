import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { RechargeCard, type RechargePlan } from '@/components/RechargeCard';

const plans: RechargePlan[] = [
  { id: 'jio_149', amountRupees: 149, pointsCost: 1490 },
  { id: 'jio_239', amountRupees: 239, pointsCost: 2390 },
  { id: 'jio_479', amountRupees: 479, pointsCost: 4790 },
];

describe('<RechargeCard />', () => {
  it('renders the phone line with operator + last recharge', () => {
    const { getByText } = render(
      <RechargeCard
        phone="+91 98765 43210"
        operator="Jio"
        lastRechargeRupees={239}
        plans={plans}
        selectedPlanId="jio_239"
        onSelectPlan={jest.fn()}
        onSubmit={jest.fn()}
      />,
    );
    expect(getByText(/\+91 98765 43210/)).toBeTruthy();
    expect(getByText(/Jio • Last recharge: ₹239/)).toBeTruthy();
  });

  it('renders 3 amount buttons with correct labels + points subtext', () => {
    const { getByText } = render(
      <RechargeCard
        phone="+91 98765 43210"
        operator="Jio"
        lastRechargeRupees={239}
        plans={plans}
        selectedPlanId={null}
        onSelectPlan={jest.fn()}
        onSubmit={jest.fn()}
      />,
    );
    expect(getByText('₹149')).toBeTruthy();
    expect(getByText('₹239')).toBeTruthy();
    expect(getByText('₹479')).toBeTruthy();
    expect(getByText(/1,490 pts/)).toBeTruthy();
    expect(getByText(/2,390 pts/)).toBeTruthy();
    expect(getByText(/4,790 pts/)).toBeTruthy();
  });

  it('tapping a plan calls onSelectPlan(id)', () => {
    const onSelectPlan = jest.fn();
    const { getByText } = render(
      <RechargeCard
        phone="+91 98765 43210"
        operator="Jio"
        lastRechargeRupees={239}
        plans={plans}
        selectedPlanId={null}
        onSelectPlan={onSelectPlan}
        onSubmit={jest.fn()}
      />,
    );
    fireEvent.press(getByText('₹479'));
    expect(onSelectPlan).toHaveBeenCalledWith('jio_479');
  });

  it('CTA shows "Recharge with N pts →" when a plan is selected', () => {
    const { getByText } = render(
      <RechargeCard
        phone="+91 98765 43210"
        operator="Jio"
        lastRechargeRupees={239}
        plans={plans}
        selectedPlanId="jio_239"
        onSelectPlan={jest.fn()}
        onSubmit={jest.fn()}
      />,
    );
    expect(getByText(/Recharge with 2,390 pts/i)).toBeTruthy();
  });

  it('CTA is disabled when no plan selected', () => {
    const onSubmit = jest.fn();
    const { getByLabelText } = render(
      <RechargeCard
        phone="+91 98765 43210"
        operator="Jio"
        lastRechargeRupees={239}
        plans={plans}
        selectedPlanId={null}
        onSelectPlan={jest.fn()}
        onSubmit={onSubmit}
      />,
    );
    const btn = getByLabelText('Recharge');
    expect(btn.props.accessibilityState?.disabled).toBe(true);
    fireEvent.press(btn);
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
