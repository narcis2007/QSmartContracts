pragma solidity ^0.5.0;

import "openzeppelin-solidity/contracts/token/ERC20/ERC20Detailed.sol";
import "openzeppelin-solidity/contracts/token/ERC20/ERC20Mintable.sol";
import "openzeppelin-solidity/contracts/token/ERC20/ERC20Burnable.sol";
import "openzeppelin-solidity/contracts/ownership/Ownable.sol";
import "./FeeCollector.sol";


contract QToken is ERC20Detailed, ERC20Mintable, ERC20Burnable, Ownable {

    uint public feeCap = 100 * (10 ** 8);
    FeeCollector feeCollector = FeeCollector(0x0);

    constructor(uint initialAmount) ERC20Detailed("Q", "Q", 8) public {
        _mint(msg.sender, initialAmount);
    }

    function _transfer(address from, address to, uint256 value) internal {
        uint fee = 0;
        if (address(feeCollector) != address(0x0)) {
            fee = value / 1000;
            if (fee > feeCap) {
                fee = feeCap;
            }
            feeCollector.notice(fee);
            super._transfer(from, address(feeCollector), fee);
        }
        super._transfer(from, to, value - fee);
    }

    function setFeeCollectorAddress(address feeCollectorAddress) onlyOwner public {
        feeCollector = FeeCollector(feeCollectorAddress);
    }


}
