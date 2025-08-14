

import type { LucideIcon } from 'lucide-react';

export type NavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
  label?: string;
};

export type PlayerReferral = {
  id: string;
  name: string;
  joinDate: string;
  tDeposit: number;
  tWithdraw: number;
  pAndL: number;
  bonusGiven?: boolean;
  firstDeposit?: number;
}

export type GamingAccount = {
  gameName: string;
  gamerId: string;
}

export type Player = {
  id:string;
  name: string;
  facebookUrl: string;
  avatarUrl?: string;
  referredBy?: string;
  joinDate: string;
  lastActivity: string;
  status: 'Active' | 'Inactive' | 'Blocked';
  stats: {
    tFreePlay: number;
    tDeposit: number;
    tWithdraw: number;
    tBonusPlay: number;
    tReferralBonus: number;
    tDepositBonus: number;
    pAndL: number;
  };
  referrals?: PlayerReferral[];
  gamingAccounts?: GamingAccount[];
};

export type Recharge = {
  date: string;
  amount: number;
  type: 'Recharge';
};

export type Game = {
  id: string;
  name: string;
  imageUrl: string;
  balance: number;
  status: 'Active' | 'Inactive' | 'Disabled';
  lastRechargeDate: string;
  downloadUrl: string;
  panelUrl: string;
  username?: string;
  password?: string;
  rechargeHistory?: Recharge[];
};


export type PaymentMethod = 'Chime' | 'CashApp';

export type Transaction = {
  id: string;
  date: string;
  playerName: string;
  gameName: string;
  type: 'Deposit' | 'Withdraw' | 'Freeplay' | 'Bonusplay' | 'Referral';
  amount: number;
  tip?: number;
  depositBonus?: number;
  paymentMethod?: PaymentMethod;
  paymentTag?: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  staffName: string;
  referenceId?: string;
  notes?: string;
  balanceBefore?: number;
};

export type Staff = {
  id: string;
  name: string;
  role: 'Super Admin' | 'Admin' | 'Agent' | 'Cashier';
  status: 'Active' | 'Blocked';
  lastLogin: string;
  createdDate: string;
  email: string;
  password?: string;
};

export type PaymentTag = {
  id: string;
  date: string;
  method: PaymentMethod;
  tag: string;
  status: 'Active' | 'Inactive' | 'Deactivated';
};

export type Report = {
  id: string;
  date: string;
  playerName: string;
  gameName: string;
  transactionType: Transaction['type'];
  amount: number;
  staffName: string;
  balanceAfter: number;
  notes?: string;
};
