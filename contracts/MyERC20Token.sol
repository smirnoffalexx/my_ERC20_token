//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";

contract ModifiedERC20Token is Ownable, ERC20 {
    using Math for uint256;

    IERC20 public myERC20Token;
    uint256 public toBurn;
    uint256 public fee;
    uint256 public tokenVaultStakersPool;
    uint256 public tokenVaultFeesPool;
    address public constant burnAddress = 0x000000000000000000000000000000000000dEaD;
    address public collector;
  
    event TokenSwaped(address account, uint256 given, uint256 recieved);
    event TokenBackSwaped(address account, uint256 amount);
    event Collected(uint256 amount);  

    constructor(address myERC20Token_, uint256 toBurn_, uint256 fee_, uint256 tokenVaultStakersPool_, uint256 tokenVaultFeesPool_, address collector_) ERC20("modERC20", "ModifiedERC20Token") Ownable() {
        require(myERC20Token_ != address(0), "Invalid address of hepa");
        require(fee_ + toBurn_ < 100, "Invalid sum of fee and toBurn");

        toBurn = toBurn_;
        fee = fee_;
        tokenVaultStakersPool = tokenVaultStakersPool_;
        tokenVaultFeesPool = tokenVaultFeesPool_;
        myERC20Token = IERC20(myERC20Token_);
        collector = collector_;
    }

    function setToBurn(uint256 toBurn_) external onlyOwner {
        require(toBurn_ + fee < 100, "Invalid toBurn");
        toBurn = toBurn_;
    }

    function setFee(uint256 fee_) external onlyOwner {
        require(fee_ + toBurn < 100, "Invalid fee");
        fee = fee_;
    }

    function collectFromPools(uint256 amount) external returns (uint256) {
        require(msg.sender == collector, "Only erm can call collectFromPools");

        uint256 collected;

        if (tokenVaultFeesPool >= amount) {
            collected = amount;
            tokenVaultFeesPool -= amount;
        } else {
            collected = Math.min(tokenVaultStakersPool, amount - tokenVaultFeesPool);
            tokenVaultStakersPool -= collected;
            collected += tokenVaultFeesPool;
            tokenVaultFeesPool = 0;
        }
     
        myERC20Token.transfer(collector, collected);

        emit Collected(collected);

        return collected;
    }  

    function swapToken(uint256 amount) external {
        uint256 toTransferFees = amount * fee / 100;
        tokenVaultFeesPool += toTransferFees;

        uint256 toBurn_ = amount * toBurn / 100;
        myERC20Token.transferFrom(msg.sender, burnAddress, toBurn_);

        uint256 toTransfer = amount - toTransferFees - toBurn_;
        myERC20Token.transferFrom(msg.sender, address(this), toTransferFees + toTransfer);
        tokenVaultStakersPool += toTransfer;

        _mint(msg.sender, toTransfer + toTransferFees);

        emit TokenSwaped(msg.sender, amount, toTransfer);
    }

    function swapBack(uint256 amount) external {
        _burn(msg.sender, amount);

        tokenVaultStakersPool -= amount;
        myERC20Token.transfer(msg.sender, amount);

        emit TokenBackSwaped(msg.sender, amount);  
    }
}