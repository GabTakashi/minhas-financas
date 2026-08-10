'use client';
import { useQuery } from '@tanstack/react-query';
import {
  getCard, getMonthRow, listAllTransactions, listBudgetGroups, listBudgets,
  listDiasRegistrados, listInvoicePayments, listMonths, listPurchases, listTransactions,
} from '@/lib/actions';

export const useMonthRow = (month: string) =>
  useQuery({ queryKey: ['month', month], queryFn: () => getMonthRow(month) });

export const useAllMonths = () =>
  useQuery({ queryKey: ['months'], queryFn: () => listMonths() });

export const useTransactions = (month: string) =>
  useQuery({ queryKey: ['tx', month], queryFn: () => listTransactions(month) });

export const useAllTransactions = () =>
  useQuery({ queryKey: ['tx-all'], queryFn: () => listAllTransactions() });

export const useCard = () =>
  useQuery({ queryKey: ['card'], queryFn: () => getCard() });

export const usePurchases = () =>
  useQuery({ queryKey: ['purchases'], queryFn: () => listPurchases() });

export const usePaidInvoices = () =>
  useQuery({ queryKey: ['invoice-payments'], queryFn: () => listInvoicePayments() });

export const useBudgets = (month: string) =>
  useQuery({ queryKey: ['budgets', month], queryFn: () => listBudgets(month) });

export const useBudgetGroups = () =>
  useQuery({ queryKey: ['budget-groups'], queryFn: () => listBudgetGroups() });

export const useDiasRegistrados = () =>
  useQuery({ queryKey: ['dias-registrados'], queryFn: () => listDiasRegistrados() });
