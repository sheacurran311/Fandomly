/**
 * use-blockchain — Shared React hooks for Fandomly Chain L1 contract interactions.
 *
 * Read hooks use a static viem publicClient (no wallet needed).
 * Write hooks use Particle ConnectKit's walletClient for user-signed transactions.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createPublicClient, http, formatUnits, parseUnits, type Address } from 'viem';
import { useAccount, useWallets } from '@particle-network/connectkit';
import {
  FANDOMLY_CHAIN,
  CONTRACTS,
  REPUTATION_REGISTRY_ABI,
  CREATOR_TOKEN_FACTORY_ABI,
  FAN_STAKING_ABI,
  CREATOR_TOKEN_ABI,
} from '@shared/blockchain-config';

// ============================================================================
// PUBLIC CLIENT (static, no wallet needed for reads)
// ============================================================================

const publicClient = createPublicClient({
  chain: {
    id: FANDOMLY_CHAIN.id,
    name: FANDOMLY_CHAIN.name,
    nativeCurrency: FANDOMLY_CHAIN.nativeCurrency,
    rpcUrls: { default: { http: [FANDOMLY_CHAIN.rpcUrl] } },
    testnet: FANDOMLY_CHAIN.testnet,
  },
  transport: http(FANDOMLY_CHAIN.rpcUrl),
});

// ============================================================================
// HELPER: Get wallet client from Particle
// ============================================================================

function useWalletClient() {
  const wallets = useWallets();
  const wallet = wallets?.[0];
  return wallet ? wallet.getWalletClient() : null;
}

// ============================================================================
// READ HOOKS — ReputationRegistry
// ============================================================================

export function useReputationScore(userAddress: string | undefined) {
  return useQuery({
    queryKey: ['blockchain', 'reputationScore', userAddress],
    queryFn: async () => {
      const score = await publicClient.readContract({
        address: CONTRACTS.ReputationRegistry as Address,
        abi: REPUTATION_REGISTRY_ABI,
        functionName: 'getScore',
        args: [userAddress as Address],
      });
      return Number(score);
    },
    enabled: !!userAddress,
    staleTime: 60_000,
  });
}

// ============================================================================
// READ HOOKS — CreatorTokenFactory
// ============================================================================

export function useCreatorToken(creatorAddress: string | undefined) {
  return useQuery({
    queryKey: ['blockchain', 'creatorToken', creatorAddress],
    queryFn: async () => {
      const tokenAddress = await publicClient.readContract({
        address: CONTRACTS.CreatorTokenFactory as Address,
        abi: CREATOR_TOKEN_FACTORY_ABI,
        functionName: 'creatorToToken',
        args: [creatorAddress as Address],
      });
      const isZero = tokenAddress === '0x0000000000000000000000000000000000000000';
      return isZero ? null : (tokenAddress as string);
    },
    enabled: !!creatorAddress,
    staleTime: 30_000,
  });
}

// ============================================================================
// READ HOOKS — ERC-20 CreatorToken
// ============================================================================

export function useTokenBalance(tokenAddress: string | undefined, userAddress: string | undefined) {
  return useQuery({
    queryKey: ['blockchain', 'tokenBalance', tokenAddress, userAddress],
    queryFn: async () => {
      const balance = await publicClient.readContract({
        address: tokenAddress as Address,
        abi: CREATOR_TOKEN_ABI,
        functionName: 'balanceOf',
        args: [userAddress as Address],
      });
      return formatUnits(balance as bigint, 18);
    },
    enabled: !!tokenAddress && !!userAddress,
    staleTime: 15_000,
  });
}

export function useTokenMetadata(tokenAddress: string | undefined) {
  return useQuery({
    queryKey: ['blockchain', 'tokenMetadata', tokenAddress],
    queryFn: async () => {
      const addr = tokenAddress as Address;
      const [name, symbol, totalSupply, decimals] = await Promise.all([
        publicClient.readContract({ address: addr, abi: CREATOR_TOKEN_ABI, functionName: 'name' }),
        publicClient.readContract({
          address: addr,
          abi: CREATOR_TOKEN_ABI,
          functionName: 'symbol',
        }),
        publicClient.readContract({
          address: addr,
          abi: CREATOR_TOKEN_ABI,
          functionName: 'totalSupply',
        }),
        publicClient.readContract({
          address: addr,
          abi: CREATOR_TOKEN_ABI,
          functionName: 'decimals',
        }),
      ]);
      return {
        name: name as string,
        symbol: symbol as string,
        totalSupply: formatUnits(totalSupply as bigint, Number(decimals)),
        decimals: Number(decimals),
      };
    },
    enabled: !!tokenAddress,
    staleTime: 60_000,
  });
}

// ============================================================================
// READ HOOKS — FanStaking
// ============================================================================

export function useStakeInfo(userAddress: string | undefined, tokenAddress: string | undefined) {
  return useQuery({
    queryKey: ['blockchain', 'stakeInfo', userAddress, tokenAddress],
    queryFn: async () => {
      const info = (await publicClient.readContract({
        address: CONTRACTS.FanStaking as Address,
        abi: FAN_STAKING_ABI,
        functionName: 'getStakeInfo',
        args: [userAddress as Address, tokenAddress as Address],
      })) as [bigint, bigint, bigint];
      return {
        amount: formatUnits(info[0], 18),
        amountRaw: info[0],
        stakedAt: Number(info[1]),
        lastClaimAt: Number(info[2]),
      };
    },
    enabled: !!userAddress && !!tokenAddress,
    staleTime: 15_000,
  });
}

export function usePendingRewards(
  userAddress: string | undefined,
  tokenAddress: string | undefined
) {
  return useQuery({
    queryKey: ['blockchain', 'pendingRewards', userAddress, tokenAddress],
    queryFn: async () => {
      const rewards = await publicClient.readContract({
        address: CONTRACTS.FanStaking as Address,
        abi: FAN_STAKING_ABI,
        functionName: 'calculateRewards',
        args: [userAddress as Address, tokenAddress as Address],
      });
      return formatUnits(rewards as bigint, 18);
    },
    enabled: !!userAddress && !!tokenAddress,
    staleTime: 15_000,
  });
}

export function useUserMultiplier(userAddress: string | undefined) {
  return useQuery({
    queryKey: ['blockchain', 'userMultiplier', userAddress],
    queryFn: async () => {
      const multiplier = await publicClient.readContract({
        address: CONTRACTS.FanStaking as Address,
        abi: FAN_STAKING_ABI,
        functionName: 'userMultipliers',
        args: [userAddress as Address],
      });
      const val = Number(multiplier);
      return val === 0 ? 100 : val; // Default 1.0x (100 basis points)
    },
    enabled: !!userAddress,
    staleTime: 60_000,
  });
}

export function useTotalStaked(tokenAddress: string | undefined) {
  return useQuery({
    queryKey: ['blockchain', 'totalStaked', tokenAddress],
    queryFn: async () => {
      const staked = await publicClient.readContract({
        address: CONTRACTS.FanStaking as Address,
        abi: FAN_STAKING_ABI,
        functionName: 'totalStaked',
        args: [tokenAddress as Address],
      });
      return formatUnits(staked as bigint, 18);
    },
    enabled: !!tokenAddress,
    staleTime: 30_000,
  });
}

export function useFanBalance(userAddress: string | undefined) {
  return useQuery({
    queryKey: ['blockchain', 'fanBalance', userAddress],
    queryFn: async () => {
      const balance = await publicClient.getBalance({
        address: userAddress as Address,
      });
      return formatUnits(balance, 18);
    },
    enabled: !!userAddress,
    staleTime: 15_000,
  });
}

// ============================================================================
// WRITE HOOKS — FanStaking (user-signed transactions)
// ============================================================================

export function useStakeToken() {
  const walletClient = useWalletClient();
  const { address } = useAccount();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ tokenAddress, amount }: { tokenAddress: string; amount: string }) => {
      if (!walletClient || !address) throw new Error('Wallet not connected');

      const amountWei = parseUnits(amount, 18);
      const stakingAddress = CONTRACTS.FanStaking as Address;
      const tokenAddr = tokenAddress as Address;

      // Step 1: Check allowance
      const currentAllowance = (await publicClient.readContract({
        address: tokenAddr,
        abi: CREATOR_TOKEN_ABI,
        functionName: 'allowance',
        args: [address as Address, stakingAddress],
      })) as bigint;

      // Step 2: Approve if needed
      if (currentAllowance < amountWei) {
        const approveTx = await walletClient.writeContract({
          address: tokenAddr,
          abi: CREATOR_TOKEN_ABI,
          functionName: 'approve',
          args: [stakingAddress, amountWei],
          chain: publicClient.chain,
          account: address as Address,
        });
        await publicClient.waitForTransactionReceipt({ hash: approveTx });
      }

      // Step 3: Stake
      const stakeTx = await walletClient.writeContract({
        address: stakingAddress,
        abi: FAN_STAKING_ABI,
        functionName: 'stake',
        args: [tokenAddr, amountWei],
        chain: publicClient.chain,
        account: address as Address,
      });
      const receipt = await publicClient.waitForTransactionReceipt({ hash: stakeTx });
      return receipt;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blockchain'] });
    },
  });
}

export function useUnstakeToken() {
  const walletClient = useWalletClient();
  const { address } = useAccount();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ tokenAddress, amount }: { tokenAddress: string; amount: string }) => {
      if (!walletClient || !address) throw new Error('Wallet not connected');

      const amountWei = parseUnits(amount, 18);
      const tx = await walletClient.writeContract({
        address: CONTRACTS.FanStaking as Address,
        abi: FAN_STAKING_ABI,
        functionName: 'unstake',
        args: [tokenAddress as Address, amountWei],
        chain: publicClient.chain,
        account: address as Address,
      });
      const receipt = await publicClient.waitForTransactionReceipt({ hash: tx });
      return receipt;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blockchain'] });
    },
  });
}

export function useClaimRewards() {
  const walletClient = useWalletClient();
  const { address } = useAccount();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ tokenAddress }: { tokenAddress: string }) => {
      if (!walletClient || !address) throw new Error('Wallet not connected');

      const tx = await walletClient.writeContract({
        address: CONTRACTS.FanStaking as Address,
        abi: FAN_STAKING_ABI,
        functionName: 'claimRewards',
        args: [tokenAddress as Address],
        chain: publicClient.chain,
        account: address as Address,
      });
      const receipt = await publicClient.waitForTransactionReceipt({ hash: tx });
      return receipt;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blockchain'] });
    },
  });
}
