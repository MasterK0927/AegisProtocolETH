import type { InterfaceAbi } from "ethers";

import AgentNFT from "@/lib/abis/AgentNFT.json";
import RentalContract from "@/lib/abis/RentalContract.json";
import X402CreditContract from "@/lib/abis/X402CreditContract.json";
import deployment31337 from "@/lib/deployments/hardhat-31337.json";

export type ContractName = "AgentNFT" | "RentalContract" | "X402CreditContract";

const ABIS: Record<ContractName, InterfaceAbi> = {
  AgentNFT: AgentNFT.abi,
  RentalContract: RentalContract.abi,
  X402CreditContract: X402CreditContract.abi,
};

type DeploymentRecord = {
  network: string;
  chainId: number;
  contracts: Record<ContractName, string>;
};

const deploymentData = deployment31337 as DeploymentRecord;

const DEPLOYMENTS: Record<number, Record<ContractName, string>> = {
  [deploymentData.chainId]: deploymentData.contracts,
};

export const SUPPORTED_CHAIN_IDS = Object.keys(DEPLOYMENTS).map((id) =>
  Number(id)
);

export function getContractConfig(chainId: number, name: ContractName) {
  const contracts = DEPLOYMENTS[chainId];
  if (!contracts) {
    throw new Error(`Unsupported chain id ${chainId}`);
  }

  const address = contracts[name];
  if (!address) {
    throw new Error(`Contract ${name} not available on chain ${chainId}`);
  }

  return {
    address,
    abi: ABIS[name],
  };
}
