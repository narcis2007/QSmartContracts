pragma solidity ^0.5.0;

import "openzeppelin-solidity/contracts/ownership/Ownable.sol";
import "./QToken.sol";

contract DiscountManager is Ownable {

    //merchant address => buyer address => discount percentage
    mapping(address => mapping(address => uint)) loyaltyDiscountPercentage;

    QToken token;

    constructor(address tokenAddress) public {
        token = QToken(tokenAddress);
    }

    function setNextLoyaltyDiscountPercentage(address buyerAddress, address merchantAddress, uint nextLoyaltyDiscountPercentage) onlyPaymentProcessor public {
        loyaltyDiscountPercentage[merchantAddress][buyerAddress] = nextLoyaltyDiscountPercentage;
    }


    function getLoyaltyDiscountInTokens(address buyerAddress, address merchantAddress, uint price) public returns (uint) {
        return (price * loyaltyDiscountPercentage[merchantAddress][buyerAddress]) / 100;
    }

    modifier onlyPaymentProcessor() {
        require(token.isApprovedPaymentProcessor(msg.sender));
        _;
    }
}
