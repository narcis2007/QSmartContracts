pragma solidity ^0.5.0;


import "openzeppelin-solidity/contracts/ownership/Ownable.sol";
import "./FeeCollector.sol";
import "./ERC20/ERC20Detailed.sol";
import "./ERC20/ERC20Mintable.sol";
import "./ERC20/ERC20Burnable.sol";


contract QToken is ERC20Detailed, ERC20Mintable, ERC20Burnable, Ownable {

    uint public feeCap = 100 * (10 ** 8);
    FeeCollector feeCollector = FeeCollector(0x0);
    address paymentProcessorAddress;

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

    modifier onlyPaymentProcessor() {
        require(msg.sender == paymentProcessorAddress);
        _;
    }

    /**
     * @dev The function which lets the payment processor to transfer tokens from one address to another.
     * @param from address The address which you want to send tokens from
     * @param to address The address which you want to transfer to
     * @param value uint256 the amount of tokens to be transferred
     */
    function paymentProcessorTransferFrom(address from, address to, uint256 value) onlyPaymentProcessor public returns (bool) {
        _transfer(from, to, value);
        return true;
    }

    function setPaymentProcessorAddress(address _paymentProcessorAddress) onlyOwner public {
        paymentProcessorAddress = _paymentProcessorAddress;
    }


}
