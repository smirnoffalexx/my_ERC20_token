/**
 * @type import('hardhat/config').HardhatUserConfig
 */

require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-ethers");
require("hardhat-dependency-compiler");

module.exports = {
  solidity: "0.8.0",

 dependencyCompiler: {
    paths: [
      '@openzeppelin/contracts/token/ERC20/presets/ERC20PresetMinterPauser.sol',
    ],
    keep: true
  }
};
