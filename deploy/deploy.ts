import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;
  const { ethers } = hre;

  const defaultOracle = "0xa02Cda4Ca3a71D7C46997716F4283aa851C28812";
  const configuredOracle = process.env.DECRYPTION_ORACLE ?? defaultOracle;

  if (!ethers.isAddress(configuredOracle) || configuredOracle === ethers.ZeroAddress) {
    throw new Error("Invalid decryption oracle address. Set DECRYPTION_ORACLE in .env");
  }

  const deployedGame = await deploy("FHEROckPaperScissors", {
    from: deployer,
    args: [configuredOracle],
    log: true,
  });

  console.log(`FHEROckPaperScissors deployed at ${deployedGame.address} with oracle ${configuredOracle}`);
};
export default func;
func.id = "deploy_fhe_rock_paper_scissors"; // id required to prevent reexecution
func.tags = ["FHEROckPaperScissors"];
