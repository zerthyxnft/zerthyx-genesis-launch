-- Add last_withdrawal_date to track daily withdrawal limits
ALTER TABLE user_wallets 
ADD COLUMN last_withdrawal_date DATE DEFAULT NULL;

-- Add approved_at column to withdrawals table to track when withdrawals are approved
ALTER TABLE withdrawals 
ADD COLUMN approved_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;