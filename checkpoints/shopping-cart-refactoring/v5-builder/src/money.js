// Formatting money in one place, so every screen shows it the same way

import { CURRENCY } from './config.js';

export const formatAmount = (amount) => amount.toFixed(2);

export const formatMoney = (amount) => `${formatAmount(amount)} ${CURRENCY}`;
