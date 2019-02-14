pragma solidity ^0.5.0;


import "./roles/Ownable.sol";
import "./FeeCollector.sol";
import "./ERC20/ERC20Detailed.sol";
import "./ERC20/ERC20Mintable.sol";
import "./ERC20/ERC20Burnable.sol";


contract QToken is Initializable, ERC20Detailed, ERC20Burnable, ERC20Mintable, Ownable {

    uint public feeCap;
    FeeCollector feeCollector;

    function initialize(string memory name, uint initialAmount, address owner) public initializer {
        ERC20Detailed.initialize(name, name, 8);
        ERC20Mintable.initialize(owner);
        Ownable.initialize(owner);
        _mint(owner, initialAmount);
        feeCap = 100 * (10 ** 8);
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

    modifier onlyFeeCollector(){
        require(msg.sender == address(feeCollector));
        _;
    }

    function transferFromWithoutFees(address from, address to, uint256 value) onlyFeeCollector public returns (bool) {
        _allowed[from][msg.sender] = _allowed[from][msg.sender].sub(value);
        super._transfer(from, to, value);
        emit Approval(from, msg.sender, _allowed[from][msg.sender]);
        return true;
    }

    function transferWithoutFees(address to, uint256 value) onlyFeeCollector public returns (bool) {
        super._transfer(msg.sender, to, value);
        return true;
    }

    function getFeeCollectorAddress() public view returns (address){
        return address(feeCollector);
    }
}
